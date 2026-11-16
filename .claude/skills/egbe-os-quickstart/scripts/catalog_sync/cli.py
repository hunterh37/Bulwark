"""Network check and local reconciliation entry points shared with bootstrap."""
from __future__ import annotations
import argparse
from datetime import datetime, timezone
import errno
import json
import os
from pathlib import Path
import runpy
import tempfile
import zipfile
from urllib.parse import urlsplit

from .archive import extract
from .engine import helper_directory, reconcile
from . import network, playbooks, transaction
from .state import STATE_DIRECTORY, atomic_json, load_manifest, locked, read_json, safe_directory


def apply_archive(archive: Path, digest: str, destination: Path, origin: str,
                  version_url: str | None = None, *, project_root: Path | None = None,
                  playbooks_archive: Path | None = None, playbooks_sha256: str | None = None) -> dict:
    origin = network.public_url(origin.rstrip("/"))
    if version_url is not None:
        version_url = network.public_url(version_url)
    destination = safe_directory(destination)
    with tempfile.TemporaryDirectory(prefix=".egbe-catalog-", dir=Path.cwd()) as temporary:
        staging = Path(temporary)
        extract(archive, digest, staging)
        prepared = playbooks.prepare(archive, digest, origin, playbooks_archive, playbooks_sha256)
        if prepared[0] is None and version_url and urlsplit(version_url).path.endswith("/versions.txt"):
            versions, _ = network.versions(version_url, {})
            if versions["skills"] != digest:
                raise ValueError("Bootstrap catalog/version mismatch during release; download the current catalog")
            if versions.get("playbooks"):
                prepared = playbooks.fetch(origin, versions["playbooks"])
        # Validate the project before creating the updater's local state.
        root = playbooks.project_root(destination, load_manifest(destination / STATE_DIRECTORY, origin), project_root)
        preflight_playbooks(staging, root, prepared)
        with locked(destination) as state:
            manifest = load_manifest(state, origin)
            root = playbooks.project_root(destination, manifest, project_root)
            transaction.recover(destination, state, manifest)
            if version_url is not None:
                manifest["version_url"] = version_url
            return reconcile_release(staging, digest, destination, state, manifest, root, prepared)


def reconcile_release(staging, digest, destination, state, manifest, root, prepared):
    preflight_playbooks(staging, root, prepared)
    # No local methodology is tracked as skill ownership or overwritten on update.
    manifest["project_root"] = str(root)
    result = reconcile(staging, digest, destination, state, manifest)
    if result["status"] == "error":
        return result
    repair_guidance_link(root, destination, manifest)
    return deliver_playbooks(staging, digest, state, manifest, root, prepared, result)


def legacy_guidance_link(root, destination, manifest):
    """Recognize only the known project link after its owned helper moved."""
    if "egbe-os-quickstart" not in manifest["skills"] or "quickstart" in manifest["skills"]:
        return
    link = root / "EGBE.md"
    if not link.is_symlink():
        return
    previous = os.readlink(link)
    if os.path.isabs(previous) or os.path.normpath(root / previous) != str(destination / "quickstart/resources/EGBE.md"):
        return
    target = destination / "egbe-os-quickstart/resources/EGBE.md"
    if not target.is_file():
        return
    safe_directory(target.parent)
    return link, previous, target


def repair_guidance_link(root, destination, manifest):
    migration = legacy_guidance_link(root, destination, manifest)
    if migration is None:
        return
    link, previous, target = migration
    with tempfile.TemporaryDirectory(prefix=".egbe-guidance-", dir=root) as temporary:
        replacement = Path(temporary) / "EGBE.md"
        replacement.symlink_to(os.path.relpath(target, root))
        if link.is_symlink() and os.readlink(link) == previous:
            os.replace(replacement, link)


def preflight_playbooks(helper_root, root, prepared):
    if prepared[1]:
        safe_directory(root / "egbe-docs/playbooks")
        if not (helper_directory(helper_root) / "scripts/prepare-artifacts.py").is_file():
            raise ValueError("The catalog is missing its artifact boundary helper")


def deliver_playbooks(helper_root, digest, state, manifest, root, prepared, result):
    descriptor, files = prepared
    if descriptor is None:
        # Compatibility bootstrap can be skills-only. Do not erase previous
        # independent delivery state; the next combined check completes delivery.
        manifest.setdefault("playbooks", {"catalog_digest": digest, "archive_sha256": None, "pending": []})
        manifest["playbooks"]["catalog_digest"] = digest
        result["playbooks"] = {"added": [], "preserved": [], "skipped": []}
    else:
        safe_directory(root / "egbe-docs/playbooks")
        prepare = helper_directory(helper_root) / "scripts/prepare-artifacts.py"
        if not prepare.is_file():
            raise ValueError("The catalog is missing its artifact boundary helper")
        runpy.run_path(str(prepare))["prepare"](root)
        playbooks.cache_source(state, descriptor["archive_sha256"], files)
        result["playbooks"] = playbooks.install(root, files)
        manifest["playbooks"] = {"catalog_digest": digest, "archive_sha256": descriptor["archive_sha256"],
                                 "pending": [item["playbook"] for item in result["playbooks"]["skipped"]]}
    manifest["project_root"] = str(root)
    atomic_json(state / "manifest.json", manifest)
    if descriptor:
        result["playbooks"].update(playbooks.review_state(root, state, descriptor["archive_sha256"]))
        playbooks.discard_previous_sources(state, descriptor["archive_sha256"])
    if result["playbooks"]["skipped"]:
        result["status"] = "partial"
    elif result["playbooks"]["added"] and result["status"] == "current":
        result["status"] = "updated"
    return result


def current_result(manifest: dict, digest: str) -> dict:
    return {"status": "current", "target": digest, "added": [], "updated": [],
            "removed": [], "unchanged": sorted(manifest["skills"]), "skipped": []}


def synchronize(destination: Path, origin: str | None = None, version_url: str | None = None,
                *, check_only: bool = False, project_root: Path | None = None) -> dict:
    destination = safe_directory(destination)
    state = safe_directory(destination / STATE_DIRECTORY)
    initial = read_json(state / "manifest.json") if (state / "manifest.json").exists() else {}
    origin = network.public_url(origin or initial.get("origin") or os.environ.get("OS_URL") or "https://os.hz.egbe.dev").rstrip("/")
    manifest = load_manifest(state, origin)
    if not check_only or project_root is not None:
        root = playbooks.project_root(destination, manifest, project_root)
        if not check_only and legacy_guidance_link(root, destination, manifest):
            # Also repairs an interruption after migration but before retargeting.
            with locked(destination):
                manifest = load_manifest(state, origin)
                repair_guidance_link(root, destination, manifest)
    # Explicit refresh can repair interrupted writes even if the network is down.
    # A version check never locks, recovers, or writes any local state.
    if not check_only and os.path.lexists(state / "transaction"):
        try:
            with locked(destination):
                manifest = load_manifest(state, origin)
                transaction.recover(destination, state, manifest)
        except BlockingIOError:
            pass
    # Only the known official legacy address migrates automatically. Explicit
    # overrides and local/custom update services keep their configured address.
    version_url = version_url or (network.VERSIONS_URL if manifest.get("version_url") in {network.LEGACY_VERSION_URL, network.LEGACY_VERSIONS_URL}
                                  else manifest.get("version_url"))
    try:
        cache = read_json(state / "version-cache.json")
    except (OSError, ValueError):
        cache = {}
    if not version_url:
        remote = network.manifest(origin)
        version_url = remote.get("versions_url") or remote.get("version_url")
    if not isinstance(version_url, str) or not version_url:
        raise ValueError("OS has not published its version URL yet; installed skills were kept")
    version_url = network.public_url(version_url)
    before = manifest.get("reconciled")
    versions, etag = network.versions(version_url, cache)
    digest = versions["skills"]
    # Re-read metadata after the request: another process may have updated it.
    manifest = load_manifest(state, origin)
    recovery_needed = os.path.lexists(state / "transaction")
    def skills_current():
        return manifest.get("reconciled") == digest and not manifest["pending"] and not recovery_needed

    def playbooks_current():
        return (playbooks.delivered(manifest, versions["playbooks"], state) if "playbooks" in versions
                else playbooks.is_current(manifest, digest))

    def review_result(result):
        if "playbooks" in versions:
            root = (safe_directory(Path(manifest["project_root"])) if manifest.get("project_root") else project_root)
            result.setdefault("playbooks", {}).update(playbooks.review_state(root, state, versions["playbooks"]))
        return result

    if (not check_only and skills_current() and playbooks_current()
            and manifest.get("version_url") == version_url and manifest.get("project_root")):
        return review_result(current_result(manifest, digest))
    if check_only:
        if skills_current() and playbooks_current():
            return review_result({"status": "current", "target": digest})
        return review_result({"status": "recovery_required" if recovery_needed else "update_available",
                "target": digest, "installed": manifest.get("reconciled"),
                "action": ("Run this helper without --check and with --project-root for this project to reconcile the catalog."
                           if not manifest.get("project_root") else
                           "Run this helper without --check to recover/reconcile the catalog.")})
    # The probe is outside the write lock: no cross-invocation check throttling.
    with locked(destination) as state:
        manifest = load_manifest(state, origin)
        root = playbooks.project_root(destination, manifest, project_root)
        transaction.recover(destination, state, manifest)
        recovery_needed = False
        if skills_current() and playbooks_current():
            if manifest.get("version_url") != version_url or manifest.get("project_root") != str(root):
                manifest["version_url"] = version_url
                manifest["project_root"] = str(root)
                atomic_json(state / "manifest.json", manifest)
            return review_result(current_result(manifest, digest))
        if manifest.get("reconciled") not in {before, None, digest}:
            raise ValueError("Another updater applied a different release; retry the freshness check")
        manifest["version_url"] = version_url
        atomic_json(state / "manifest.json", manifest)
        result = current_result(manifest, digest)
        if not skills_current() or ("playbooks" not in versions and not playbooks_current()):
            data, downloaded_digest = network.download(origin, version_url, digest)
            if downloaded_digest != digest:
                versions, etag = network.versions(version_url, {})
                if versions["skills"] != downloaded_digest:
                    raise ValueError("Release changed repeatedly; retry the freshness check")
            digest = downloaded_digest
            with tempfile.TemporaryDirectory(prefix="download-", dir=state) as temporary:
                folder = Path(temporary)
                archive = folder / "catalog.zip"
                archive.write_bytes(data)
                staging = folder / "skills"
                staging.mkdir()
                extract(archive, digest, staging)
                # Old custom services may still use a bound, flat playbook ZIP.
                prepared = ((None, {}) if "playbooks" in versions else playbooks.prepare(archive, digest, origin))
                result = reconcile_release(staging, digest, destination, state, manifest, root, prepared)
        if result["status"] != "error" and "playbooks" in versions and not playbooks_current():
            prepared = playbooks.fetch(origin, versions["playbooks"])
            result = deliver_playbooks(destination, digest, state, manifest, root, prepared, result)
        try:
            # Observation is not installed state. This file can be deleted freely.
            atomic_json(state / "version-cache.json", {"digest": digest, "versions": versions, "etag": etag,
                        "url": version_url, "checked_at": datetime.now(timezone.utc).isoformat()})
        except OSError:
            result.setdefault("warnings", []).append("Version cache could not be saved; next run will check again")
        return review_result(result)


def main() -> int:
    parser = argparse.ArgumentParser(description="Refresh all installed Egbe skills; preserve local conflicts.")
    parser.add_argument("--destination", type=Path, default=Path(__file__).resolve().parents[3])
    parser.add_argument("--os-url")
    parser.add_argument("--version-url", help="Override the public probe URL for an explicit installation or local test")
    parser.add_argument("--project-root", type=Path, help="Project directory for editable playbooks; retained for subsequent updates")
    parser.add_argument("--playbooks-archive", type=Path, help="Offline playbook archive accompanying --install-from")
    parser.add_argument("--playbooks-sha256", help="Independent playbook SHA-256, required with an unbound offline archive")
    parser.add_argument("--check", action="store_true", help="Read-only version check; never write or download the catalog")
    parser.add_argument("--install-from", type=Path, help="Bootstrap from a verified local complete catalog")
    parser.add_argument("--sha256")
    args = parser.parse_args()
    if args.check and args.install_from:
        parser.error("--check cannot be combined with --install-from")
    if (args.playbooks_archive or args.playbooks_sha256) and not args.install_from:
        parser.error("Playbook archive options require --install-from")
    try:
        if args.install_from:
            if not args.sha256:
                raise ValueError("--install-from requires --sha256")
            result = apply_archive(args.install_from, args.sha256, args.destination,
                                   args.os_url or os.environ.get("OS_URL") or "https://os.hz.egbe.dev",
                                   args.version_url, project_root=args.project_root,
                                   playbooks_archive=args.playbooks_archive, playbooks_sha256=args.playbooks_sha256)
        else:
            result = synchronize(args.destination, args.os_url, args.version_url,
                                 check_only=args.check, project_root=args.project_root)
    except (OSError, ValueError, zipfile.BadZipFile) as error:
        result = {"status": "error", "error": str(error), "action": "Keep available skills and retry; recover reported local state before using an interrupted skill."}
        if isinstance(error, OSError) and error.errno in {errno.EACCES, errno.EPERM, errno.EROFS}:
            result.update(code="filesystem_permission_required", path=error.filename,
                          action="Request runtime approval for this exact command and installation path, then retry. If unavailable or denied, defer the update and keep usable skills; do not use an interrupted bundle.")
    if not args.check and result["status"] != "current" and result.get("code") != "filesystem_permission_required":
        try:
            with locked(args.destination) as state:
                atomic_json(state / "last-attempt.json", {"at": datetime.now(timezone.utc).isoformat(),
                            "status": result["status"], "error": result.get("error")})
        except (OSError, ValueError):
            pass  # Diagnostic persistence must not change the actual update outcome.
    print(json.dumps(result, indent=2))
    return 1 if result["status"] == "error" else 0
