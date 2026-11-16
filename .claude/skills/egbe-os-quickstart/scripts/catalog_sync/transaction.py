"""Recover one interrupted complete-bundle replacement before another update."""
from __future__ import annotations
import os
from pathlib import Path
import shutil

from .state import NAME, atomic_json, read_json, safe_directory, snapshot, validate_record


def _commit_record(state: Path, manifest: dict, name: str, record: dict | None) -> None:
    if record is None:
        manifest["skills"].pop(name, None)
    else:
        manifest["skills"][name] = record
    # A crash between skills must never leave a fully-current marker from before.
    manifest["reconciled"] = None
    atomic_json(state / "manifest.json", manifest)


def recover(destination: Path, state: Path, manifest: dict) -> None:
    transaction = state / "transaction"
    if not transaction.exists():
        return
    safe_directory(transaction)
    journal_path = transaction / "journal.json"
    if not journal_path.exists():
        # mkdir may have completed before journal creation. Do not infer
        # ownership of nonempty unjournaled data after an uncertain interruption.
        if any(transaction.iterdir()):
            raise ValueError("Unjournaled recovery data exists; preserve it for inspection")
        transaction.rmdir()
        return
    journal = read_json(journal_path)
    name = journal.get("name", "")
    if not NAME.fullmatch(name) or journal.get("schema") != 1:
        raise ValueError("Invalid update journal; manual recovery required")
    old, new = journal.get("old"), journal.get("new")
    for record in (old, new):
        if record is not None:
            validate_record(record)
    target, backup = destination / name, transaction / "before"
    actual = snapshot(target) if os.path.lexists(target) else None
    old_files = old["files"] if old else None
    new_files = new["files"] if new else None
    if actual == new_files:
        if backup.exists() and snapshot(backup) != old_files:
            raise ValueError("Backup changed during update; preserve it for manual recovery")
        _commit_record(state, manifest, name, new)
    elif actual == old_files:
        _commit_record(state, manifest, name, old)
    elif actual is None and old and backup.exists() and snapshot(backup) == old_files:
        backup.rename(target)
        _commit_record(state, manifest, name, old)
    else:
        raise ValueError("Installed skill changed during interrupted update; manual recovery required")
    shutil.rmtree(transaction)


def apply(destination: Path, state: Path, manifest: dict, name: str,
          source: Path | None, record: dict | None) -> None:
    transaction = state / "transaction"
    transaction.mkdir()
    old = manifest["skills"].get(name)
    atomic_json(transaction / "journal.json", {"schema": 1, "name": name, "old": old, "new": record})
    if source is not None:
        shutil.copytree(source, transaction / "after")
        if snapshot(transaction / "after") != record["files"]:
            raise ValueError("Staged skill changed before application")
    target = destination / name
    actual = snapshot(target) if os.path.lexists(target) else None
    if actual != (old["files"] if old else None):
        # No rename has happened. Keep the customer's latest data intact.
        shutil.rmtree(transaction)
        raise ValueError("Local skill changed while preparing the update")
    if old is not None:
        target.rename(transaction / "before")
    if source is not None:
        (transaction / "after").rename(target)
    # Also handles a removal and provides one commit/cleanup implementation.
    recover(destination, state, manifest)
