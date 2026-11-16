"""Reconcile a verified catalog per complete skill, preserving local changes."""
import errno
import os
from pathlib import Path
import re

from . import transaction
from .state import atomic_json, snapshot


def discovery_name(root: Path) -> str:
    if root.is_symlink() or (root / "SKILL.md").is_symlink():
        return root.name.casefold()
    try:
        text = (root / "SKILL.md").read_text()
    except (OSError, UnicodeError):
        return root.name.casefold()
    match = re.search(r"^name:\s*['\"]?([^\n'\"]+)", text.split("---", 2)[1] if text.startswith("---\n") else "", re.M)
    return (match.group(1).strip() if match else root.name).casefold()


def helper_available(root: Path) -> bool:
    try:
        snapshot(root)  # Never follow a locally substituted helper symlink.
        return ((root / "scripts/catalog_sync/PROTOCOL").read_text().strip() == "1"
                and (root / "scripts/sync-catalog.py").is_file()
                and (root / "references/skill-updates.md").is_file())
    except (OSError, ValueError):
        return False


def helper_directory(root: Path) -> Path:
    canonical = root / "egbe-os-quickstart"
    return canonical if canonical.is_dir() else root / "quickstart"


def reconcile(staging: Path, digest: str, destination: Path, state: Path, manifest: dict) -> dict:
    result = {"status": "current", "target": digest, "added": [], "updated": [],
              "removed": [], "unchanged": [], "skipped": []}
    transaction.recover(destination, state, manifest)
    incoming = {path.name: snapshot(path) for path in staging.iterdir() if path.is_dir()}
    discovery = {name: discovery_name(staging / name) for name in incoming}
    if len(set(discovery.values())) != len(discovery):
        raise ValueError("Catalog contains duplicate agent discovery names")
    # A retained frontmatter name is explicit identity for a directory rename.
    # Do not infer replacements from similar prose or guessed folder names.
    replacements = {old: new for old, record in manifest["skills"].items() if old not in incoming
                    for new in incoming if new not in manifest["skills"] and record.get("name") == discovery[new]}
    # Skills may move to this release before the run finishes; name it as the
    # target now, so an interrupted run reports `<digest>+partial` (egbe-curl.py).
    manifest["reconciled"] = None
    manifest["target"] = digest
    manifest["pending"] = {}
    atomic_json(state / "manifest.json", manifest)

    def skip(name, reason, paths=None):
        item = {"skill": name, "reason": reason, "paths": paths or [name],
                "action": "Preserve this skill; resolve the reported conflict, then run refresh again."}
        result["skipped"].append(item)
        manifest["pending"][name] = item

    candidates = {}
    for name in sorted(set(incoming) | set(manifest["skills"])):
        target = destination / name
        old = manifest["skills"].get(name)
        new_files = incoming.get(name)
        if old and old["files"] == new_files:
            # An unchanged upstream bundle is not permission to reset customization.
            result["unchanged"].append(name)
            continue
        if old:
            try:
                actual = snapshot(target)
            except (OSError, ValueError) as error:
                skip(name, str(error))
                continue
            if actual != old["files"]:
                changed = sorted(key for key in actual.keys() | old["files"].keys() if actual.get(key) != old["files"].get(key))
                skip(name, "Local edits, additions, deletions or permissions differ from the installed baseline", [f"{name}/{p}" for p in changed])
                continue
        elif os.path.lexists(target):
            skip(name, "Existing path has no Egbe ownership baseline")
            continue
        if new_files is not None:
            collisions = [p.name for p in destination.iterdir() if p.name != name and not p.name.startswith(".")
                          and replacements.get(p.name) != name
                          and (p.name.casefold() == name.casefold() or discovery_name(p) == discovery[name])]
            if collisions:
                skip(name, "Local directory or agent discovery name collision", collisions)
                continue
        candidates[name] = {"release": digest, "files": new_files, "name": discovery[name]} if new_files is not None else None

    for old, new in replacements.items():
        if old not in candidates and new in candidates:
            candidates.pop(new)
            skip(new, "Renamed original has local changes; retain it before resolving replacement", [old, new])
        if new not in candidates and old in candidates:
            candidates.pop(old)
            skip(old, "Replacement could not be installed; retaining the original skill", [old, new])

    # The running modules are loaded before writes; replace their containing
    # bundle last. All publications in protocol 1 keep this helper contract.
    helper = helper_directory(staging).name
    helper_ready = helper_available(destination / helper)
    # Bootstrap must establish the helper first; normal self-update happens last.
    bootstrap = not helper_ready
    for name in sorted(candidates, key=lambda item: (item != helper if bootstrap else item == helper,
                                                   candidates[item] is None, item)):
        record = candidates[name]
        replacement = replacements.get(name)
        if replacement and replacement not in result["added"]:
            skip(name, "Replacement installation did not complete; retaining the original skill", [name, replacement])
            continue
        if record is not None and name != helper and not helper_ready:
            skip(name, "Compatible quickstart update helper is missing; complete bootstrap first")
            continue
        source = staging / name if record is not None else None
        operation = "removed" if record is None else "updated" if name in manifest["skills"] else "added"
        try:
            transaction.apply(destination, state, manifest, name, source, record)
        except (OSError, ValueError) as error:
            try:
                transaction.recover(destination, state, manifest)
            except (OSError, ValueError) as recovery_error:
                result.update(status="error", error=f"Recovery required: {recovery_error}")
                return result
            # An interruption after the final rename can already have committed.
            if manifest["skills"].get(name) == record and (
                record is None and not os.path.lexists(destination / name)
                or record is not None and snapshot(destination / name) == record["files"]
            ):
                result[operation].append(name)
                helper_ready = helper_available(destination / helper)
                continue
            skip(name, str(error))
            if isinstance(error, OSError) and error.errno in {errno.ENOSPC, errno.EIO, errno.EROFS}:
                result.update(status="error", error="Shared filesystem failure; remaining updates deferred")
                atomic_json(state / "manifest.json", manifest)
                return result
            if name == helper and not helper_available(destination / helper):
                result.update(status="error", error="Quickstart installation failed; finish bootstrap before using new skills")
                atomic_json(state / "manifest.json", manifest)
                return result
            continue
        result[operation].append(name)
        if name == helper:
            helper_ready = helper_available(destination / helper)
    manifest["reconciled"] = None if result["skipped"] else digest
    manifest["target"] = digest
    atomic_json(state / "manifest.json", manifest)
    result["status"] = "partial" if result["skipped"] else "updated" if any(result[key] for key in ("added", "updated", "removed")) else "current"
    return result
