"""Verify separate playbook delivery and create missing project copies only."""
from __future__ import annotations
import hashlib
import io
import json
import os
from pathlib import Path
import re
import shutil
import stat
import tempfile
from urllib.parse import urljoin, urlsplit
import zipfile

from . import network
from .archive import MAX_ARCHIVE_BYTES
from .state import HASH, STATE_DIRECTORY, read_json, safe_directory

MAX_FILES = 500
MAX_EXPANDED_BYTES = 10 * 1024 * 1024


def project_root(destination: Path, manifest: dict, requested: Path | None) -> Path:
    recorded = manifest.get("project_root")
    if recorded is not None and (not isinstance(recorded, str) or not Path(recorded).is_absolute()):
        raise ValueError("Invalid recorded project root; repair local catalog state")
    if recorded is None and requested is None and os.path.lexists(destination / STATE_DIRECTORY / "manifest.json"):
        raise ValueError("This existing catalog has no recorded project root; retry with --project-root for its project")
    root = safe_directory(requested if requested is not None else Path(recorded) if recorded else Path.cwd())
    if recorded is not None and root != safe_directory(Path(recorded)):
        raise ValueError("This skill catalog belongs to another project root; its state was preserved")
    if not root.is_dir():
        raise ValueError("Project root must be an existing directory")
    try:
        destination.relative_to(root)
    except ValueError:
        raise ValueError("Skill discovery directory must be inside the project root") from None
    return root


def binding(archive: Path, digest: str) -> dict | None:
    if archive.stat().st_size > MAX_ARCHIVE_BYTES:
        raise ValueError("Catalog archive exceeds the size limit")
    data = archive.read_bytes()
    if hashlib.sha256(data).hexdigest() != digest.lower():
        raise ValueError("Catalog SHA-256 mismatch")
    with zipfile.ZipFile(io.BytesIO(data)) as bundle:
        metadata = json.loads(bundle.comment) if bundle.comment else {}
    descriptor = metadata.get("egbe_playbooks") if isinstance(metadata, dict) else None
    if descriptor is not None and (not isinstance(descriptor, dict)
            or not isinstance(descriptor.get("archive_url"), str)
            or not isinstance(descriptor.get("archive_sha256"), str)
            or not re.fullmatch(r"[0-9a-f]{64}", descriptor["archive_sha256"])):
        raise ValueError("Invalid playbook catalog binding")
    return descriptor


def prepare(archive: Path, digest: str, origin: str, local_archive: Path | None = None,
            expected_digest: str | None = None) -> tuple[dict | None, dict[str, bytes]]:
    descriptor = binding(archive, digest)
    if descriptor is None:
        if local_archive is None and expected_digest is None:
            return None, {}
        if not network.valid_digest(expected_digest):
            raise ValueError("Independent offline playbooks require --playbooks-sha256")
        descriptor = {"archive_url": "/playbooks/catalog.zip", "archive_sha256": expected_digest}
    expected = descriptor["archive_sha256"]
    if expected_digest is not None and expected_digest.lower() != expected:
        raise ValueError("Playbook SHA-256 does not match the verified catalog binding")
    return descriptor, fetch_files(descriptor, origin, local_archive)


def fetch(origin: str, expected: str) -> tuple[dict, dict[str, bytes]]:
    descriptor = network.manifest(origin).get("playbooks")
    if (not isinstance(descriptor, dict) or descriptor.get("archive_sha256") != expected
            or not isinstance(descriptor.get("archive_url"), str)):
        raise ValueError("Playbook version/manifest mismatch during release; retry the freshness check")
    return descriptor, fetch_files(descriptor, origin)


def fetch_files(descriptor: dict, origin: str, local_archive: Path | None = None) -> dict[str, bytes]:
    expected = descriptor["archive_sha256"]
    if local_archive is not None:
        if local_archive.stat().st_size > MAX_ARCHIVE_BYTES:
            raise ValueError("Playbook archive exceeds the size limit")
        data = local_archive.read_bytes()
    else:
        url = urljoin(origin.rstrip("/") + "/", descriptor["archive_url"])
        if (urlsplit(url).scheme, urlsplit(url).netloc) != (urlsplit(origin).scheme, urlsplit(origin).netloc):
            raise ValueError("Playbook archive must remain on the configured OS origin")
        code, data, _ = network.request(network.public_url(url), MAX_ARCHIVE_BYTES)
        if code != 200:
            raise ValueError("Playbook archive is unavailable")
    if len(data) > MAX_ARCHIVE_BYTES or hashlib.sha256(data).hexdigest() != expected:
        raise ValueError("Playbook SHA-256 mismatch; project copies were preserved")
    files = {}
    with zipfile.ZipFile(io.BytesIO(data)) as bundle:
        members = bundle.infolist()
        if not members or len(members) > MAX_FILES or sum(m.file_size for m in members) > MAX_EXPANDED_BYTES:
            raise ValueError("Playbook archive exceeds extraction limits or is empty")
        for member in members:
            if (not re.fullmatch(r"(?:[a-z][a-z0-9-]*/)*[a-z][a-z0-9-]*\.md", member.filename)
                    or member.filename in files or member.is_dir()
                    or stat.S_IFMT(member.external_attr >> 16) not in {0, stat.S_IFREG}):
                raise ValueError("Playbook archive contains an unsafe or duplicate path")
            files[member.filename] = bundle.read(member)
    return files


def install(root: Path, files: dict[str, bytes]) -> dict:
    result = {"added": [], "preserved": [], "skipped": []}
    if not files:
        return result
    directory = safe_directory(root / "egbe-docs/playbooks")
    directory.mkdir(parents=True, exist_ok=True)
    for name, data in sorted(files.items()):
        target = directory / name
        try:
            safe_directory(target.parent).mkdir(parents=True, exist_ok=True)
        except (OSError, ValueError) as error:
            result["skipped"].append({"playbook": name, "reason": str(error)})
            continue
        if os.path.lexists(target):
            if target.is_file() and not target.is_symlink():
                result["preserved"].append(name)
            else:
                result["skipped"].append({"playbook": name, "reason": "Existing path is not a regular file"})
            continue
        descriptor, temporary = tempfile.mkstemp(prefix=".egbe-playbook-", dir=target.parent)
        try:
            with os.fdopen(descriptor, "wb") as stream:
                stream.write(data)
                stream.flush()
                os.fsync(stream.fileno())
                os.fchmod(stream.fileno(), 0o644)
            try:
                # Atomic publication without replacing a file created by another run.
                os.link(temporary, target)
            except FileExistsError:
                result["skipped"].append({"playbook": name, "reason": "Path appeared during installation; preserved"})
            else:
                result["added"].append(name)
        finally:
            os.unlink(temporary)
    return result


def is_current(manifest: dict, digest: str) -> bool:
    """Legacy delivery state, used only for a legacy version source."""
    return (isinstance(manifest.get("project_root"), str)
            and isinstance(manifest.get("playbooks"), dict)
            and manifest["playbooks"].get("catalog_digest") == digest
            and not manifest["playbooks"].get("pending"))


def source_directory(state: Path, digest: str) -> Path:
    if not network.valid_digest(digest):
        raise ValueError("Invalid playbook source version")
    return safe_directory(state / "playbooks" / digest)


def delivered(manifest: dict, digest: str | None, state: Path) -> bool:
    if digest is None:
        return True
    record = manifest.get("playbooks") or {}
    return (record.get("archive_sha256") == digest and not record.get("pending")
            and isinstance(manifest.get("project_root"), str)
            and source_directory(state, digest).is_dir())


def cache_source(state: Path, digest: str, files: dict[str, bytes]) -> Path:
    """Keep the current verified supply, not historical baselines or overlays."""
    target = source_directory(state, digest)
    if target.exists():
        return target
    target.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="source-", dir=target.parent) as temporary:
        staging = Path(temporary) / "files"
        staging.mkdir()
        for name, data in files.items():
            path = staging / name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(data)
        os.replace(staging, target)
    return target


def discard_previous_sources(state: Path, digest: str) -> None:
    directory = source_directory(state, digest).parent
    for old in directory.iterdir():
        if old.name != digest and HASH.fullmatch(old.name):
            safe_directory(old)
            if old.is_dir():
                shutil.rmtree(old)


def review_state(root: Path | None, state: Path, digest: str | None) -> dict:
    if digest is None:
        return {"target": None, "review_required": False}
    record = {}
    if root is not None:
        path = safe_directory(root / "egbe-docs") / "playbooks-sync.json"
        if os.path.lexists(path):
            record = read_json(path)
    source = source_directory(state, digest)
    return {"target": digest, "review_required": record.get("reviewed_version") != digest,
            "source_directory": str(source) if source.is_dir() else None}
