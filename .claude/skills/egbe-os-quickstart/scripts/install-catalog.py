#!/usr/bin/env python3
"""Install/refresh a verified OS catalog while preserving local skill conflicts.

Online: python3 install-catalog.py --destination SKILLS_DIRECTORY --os-url OS_URL
Local archive: python3 install-catalog.py CATALOG.zip ARCHIVE_SHA256 SKILLS_DIRECTORY
No credentials are needed. Online installation discovers and verifies skills and
playbooks automatically. For offline installation, also pass --playbooks-archive
and --playbooks-sha256. Run from the project folder; skills and editable
egbe-docs/playbooks copies stay inside that folder.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from io import BytesIO
import os
from pathlib import Path, PurePosixPath
import re
import shutil
import stat
import subprocess
import sys
import tempfile
import zipfile
from http.client import HTTPException, IncompleteRead
from urllib.parse import urljoin, urlsplit
from urllib.request import HTTPRedirectHandler, Request, build_opener

MAX_ARCHIVE_BYTES = 25 * 1024 * 1024
MAX_EXPANDED_BYTES = 100 * 1024 * 1024
MAX_FILES = 10_000
MAX_MANIFEST_BYTES = 2 * 1024 * 1024


def _public_url(url: str) -> str:
    parts = urlsplit(url)
    if parts.username or parts.password or parts.fragment or not parts.hostname:
        raise ValueError("Expected a public catalog URL without credentials or fragment")
    if parts.scheme != "https" and not (parts.scheme == "http" and parts.hostname in {"localhost", "127.0.0.1", "::1"}):
        raise ValueError("Catalog URLs require HTTPS (HTTP is allowed only for local tests)")
    return url


def _same_origin(url: str, origin: str) -> str:
    url = _public_url(url)
    if (urlsplit(url).scheme, urlsplit(url).netloc) != (urlsplit(origin).scheme, urlsplit(origin).netloc):
        raise ValueError("Catalog download must remain on the configured OS origin")
    return url


class _SameOriginRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        _same_origin(newurl, req.full_url)
        return super().redirect_request(req, fp, code, msg, headers, newurl)


def _download(url: str, limit: int) -> bytes:
    request = Request(_public_url(url), headers={"User-Agent": "Egbe-Catalog-Installer/1", "Cache-Control": "no-cache"})
    with build_opener(_SameOriginRedirect()).open(request, timeout=20) as response:
        _same_origin(response.url, url)
        data = response.read(limit + 1)
        if len(data) > limit:
            raise ValueError("Catalog download exceeds the size limit")
        if response.length:
            raise IncompleteRead(data, response.length)
        return data


def _destination(destination: Path) -> Path:
    if destination.is_symlink():
        raise ValueError("Skill discovery directory must not be a symbolic link")
    destination = destination.resolve()
    try:
        destination.relative_to(Path.cwd().resolve())
    except ValueError:
        raise ValueError("Skill discovery directory must stay inside the current working folder") from None
    return destination


def install_online(destination: Path, origin: str | None = None, *, project_root: Path | None = None) -> dict:
    """Discover download parameters without loading the catalog into model context."""
    destination = _destination(destination)
    origin = _public_url(origin or os.environ.get("OS_URL") or "https://os.hz.egbe.dev").rstrip("/")
    envelope = json.loads(_download(origin + "/skills", MAX_MANIFEST_BYTES))
    manifest = envelope.get("data") if isinstance(envelope, dict) else None
    if not isinstance(manifest, dict) or manifest.get("update_protocol") != 1:
        raise ValueError("Unsupported or missing catalog update protocol")
    if "installation" in manifest:
        descriptor = manifest["installation"]
        if not isinstance(descriptor, dict) or descriptor.get("install_layout") != "egbe-skill-names-v1":
            raise ValueError("Unsupported catalog installation layout")
        manifest = {**manifest, **descriptor}
    digest = manifest.get("archive_sha256")
    if (not isinstance(digest, str) or not re.fullmatch(r"[0-9a-f]{64}", digest)
            or manifest.get("catalog_digest") != digest):
        raise ValueError("Invalid catalog digest")
    archive_url = manifest.get("archive_url")
    version_url = manifest.get("versions_url")
    if not isinstance(archive_url, str) or not archive_url:
        raise ValueError("Missing catalog archive URL")
    if not isinstance(version_url, str) or not version_url or not urlsplit(version_url).path.endswith("/versions.txt"):
        raise ValueError("Missing combined versions URL; full skills/playbook installation cannot be verified")
    archive_url = _same_origin(urljoin(origin + "/", archive_url), origin)
    version_url = _public_url(version_url)
    # The standalone bootstrap only downloads; reconciliation is owned by the
    # updater inside the verified archive, including independent playbooks.
    with tempfile.TemporaryDirectory(prefix=".egbe-download-", dir=Path.cwd()) as temporary:
        archive = Path(temporary) / "catalog.zip"
        archive.write_bytes(_download(archive_url, MAX_ARCHIVE_BYTES))
        report = install_catalog(archive, digest, destination, origin, version_url, project_root=project_root)
        methods = report.get("playbooks", {})
        report["delivery"] = {
            "skills": "partial" if report.get("skipped") else "complete",
            "playbooks": ("partial" if methods.get("skipped") else "complete") if methods.get("target") else "not_checked",
        }
        return report


def _extract(archive: Path, digest: str, staging: Path) -> list[str]:
    if not re.fullmatch(r"[0-9a-fA-F]{64}", digest):
        raise ValueError("Expected a SHA-256 digest from GET /skills")
    if archive.stat().st_size > MAX_ARCHIVE_BYTES:
        raise ValueError("Catalog archive exceeds the size limit")
    data = archive.read_bytes()
    if len(data) > MAX_ARCHIVE_BYTES:
        raise ValueError("Catalog archive exceeds the size limit")
    if hashlib.sha256(data).hexdigest() != digest.lower():
        raise ValueError("Catalog SHA-256 mismatch; nothing was installed")

    # Keep the verified bytes as the extraction source, even if the downloaded
    # archive path is replaced while installation is in progress.
    with zipfile.ZipFile(BytesIO(data)) as bundle:
        members = bundle.infolist()
        if len(members) > MAX_FILES or sum(m.file_size for m in members) > MAX_EXPANDED_BYTES:
            raise ValueError("Catalog archive exceeds extraction limits")
        seen: set[str] = set()
        names: set[str] = set()
        for member in members:
            raw = member.filename.rstrip("/")
            path = PurePosixPath(raw)
            if (
                not raw or "\\" in raw or path.is_absolute()
                or ":" in raw or any(ord(c) < 32 for c in raw)
                or any(part in {"", ".", ".."} for part in raw.split("/"))
                or not re.fullmatch(r"[a-z][a-z0-9-]*", path.parts[0])
            ):
                raise ValueError("Catalog archive contains an unsafe path")
            if raw.casefold() in seen:
                raise ValueError("Catalog archive contains a duplicate path")
            seen.add(raw.casefold())
            mode = member.external_attr >> 16
            file_type = stat.S_IFMT(mode)
            if file_type not in {0, stat.S_IFREG, stat.S_IFDIR}:
                raise ValueError("Catalog archive contains an unsupported file type")
            target = staging.joinpath(*path.parts)
            names.add(path.parts[0])
            if member.is_dir():
                target.mkdir(parents=True, exist_ok=True)
                target.chmod(0o755)
                continue
            if len(path.parts) < 2:
                raise ValueError("Catalog archive contains a top-level file")
            target.parent.mkdir(parents=True, exist_ok=True)
            for parent in target.parents:
                if parent == staging:
                    break
                parent.chmod(0o755)
            with bundle.open(member) as source, target.open("xb") as output:
                shutil.copyfileobj(source, output)
            # ZipFile.extractall does not restore executable bits.
            target.chmod(0o755 if mode & 0o111 else 0o644)

    if not names or any(not (staging / name / "SKILL.md").is_file() for name in names):
        raise ValueError("Catalog archive contains an incomplete skill")
    return sorted(names)


def install_catalog(archive: Path, digest: str, destination: Path, origin: str | None = None,
                    version_url: str | None = None, *, project_root: Path | None = None,
                    playbooks_archive: Path | None = None, playbooks_sha256: str | None = None) -> dict:
    """Execute the updater only after verifying its complete downloaded bundle."""
    destination = _destination(destination)
    workspace = Path.cwd().resolve()
    # Stage locally regardless of TMPDIR; clean up on both success and failure.
    with tempfile.TemporaryDirectory(prefix=".egbe-catalog-", dir=workspace) as tmp:
        staging = Path(tmp)
        _extract(archive, digest, staging)
        helper = staging / "egbe-os-quickstart/scripts/sync-catalog.py"
        if not helper.is_file():
            helper = staging / "quickstart/scripts/sync-catalog.py"
        if not helper.is_file():
            raise ValueError("The complete catalog must include the quickstart update helper")
        # A separate interpreter imports all helpers from the verified catalog,
        # including when the installed quickstart is old, edited or interrupted.
        command = [sys.executable, "-B", str(helper), "--install-from", str(archive.resolve()),
                   "--sha256", digest.lower(), "--destination", str(destination),
                   "--os-url", origin or os.environ.get("OS_URL") or "https://os.hz.egbe.dev"]
        if version_url is not None:
            command.extend(["--version-url", version_url])
        if project_root is not None:
            command.extend(["--project-root", str(project_root.absolute())])
        if playbooks_archive is not None:
            command.extend(["--playbooks-archive", str(playbooks_archive.absolute())])
        if playbooks_sha256 is not None:
            command.extend(["--playbooks-sha256", playbooks_sha256])
        result = subprocess.run(command, capture_output=True, text=True, timeout=180)
        try:
            report = json.loads(result.stdout)
        except ValueError:
            raise ValueError("Verified catalog helper failed; installed data was preserved") from None
        if result.returncode or report.get("status") == "error":
            raise ValueError(report.get("error", "Catalog bootstrap failed"))
        if "target" not in report.get("playbooks", {}):
            # Legacy archive-only bootstrap intentionally makes no network calls.
            # An existing project may already have methods: unknown is not absent.
            report.setdefault("playbooks", {}).update(
                delivery_status="not_checked",
                action=f"Run the installed {helper.relative_to(staging).as_posix()} with --project-root to verify and complete playbook delivery.",
            )
        return report


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("archive", type=Path, nargs="?")
    parser.add_argument("sha256", nargs="?")
    parser.add_argument("destination", type=Path, nargs="?")
    parser.add_argument("--destination", dest="online_destination", type=Path, help="Discover and install the complete current catalog into this directory")
    parser.add_argument("--os-url", help="Project's OS URL; defaults to OS_URL")
    parser.add_argument("--version-url", help="Public version URL from the catalog manifest")
    parser.add_argument("--project-root", type=Path, help="Project directory for editable playbooks; defaults to the current folder")
    parser.add_argument("--playbooks-archive", type=Path, help="Verified separate playbook archive for offline installation")
    parser.add_argument("--playbooks-sha256", help="Expected independent playbook hash from the catalog manifest")
    args = parser.parse_args()
    if args.online_destination is not None:
        if any(value is not None for value in (args.archive, args.sha256, args.destination, args.version_url,
                                               args.playbooks_archive, args.playbooks_sha256)):
            parser.error("Online --destination cannot be combined with local archive or version arguments")
    elif any(value is None for value in (args.archive, args.sha256, args.destination)):
        parser.error("Use --destination for online installation, or provide CATALOG.zip ARCHIVE_SHA256 SKILLS_DIRECTORY")
    try:
        if args.online_destination is not None:
            report = install_online(args.online_destination, args.os_url, project_root=args.project_root)
        else:
            report = install_catalog(args.archive, args.sha256, args.destination, args.os_url, args.version_url,
                                     project_root=args.project_root, playbooks_archive=args.playbooks_archive,
                                     playbooks_sha256=args.playbooks_sha256)
    except (OSError, ValueError, HTTPException, subprocess.TimeoutExpired, zipfile.BadZipFile) as exc:
        parser.exit(1, f"Catalog installation failed: {exc}\n")
    print(json.dumps(report, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
