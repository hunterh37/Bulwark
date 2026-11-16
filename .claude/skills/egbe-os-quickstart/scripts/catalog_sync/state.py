"""Ownership, bounded local state, snapshots and a process-scoped write lock."""
from contextlib import contextmanager
import hashlib
import json
import os
from pathlib import Path
import re
import stat
import tempfile

STATE_DIRECTORY = ".egbe-catalog"
NAME = re.compile(r"[a-z][a-z0-9-]*")
HASH = re.compile(r"[a-f0-9]{64}")
MAX_STATE_BYTES = 8 * 1024 * 1024


def safe_directory(path: Path) -> Path:
    path = Path(os.path.abspath(path))
    for part in (path, *path.parents):
        if part.is_symlink():
            raise ValueError(f"Symbolic link in installation path: {part}")
    return path


def snapshot(root: Path) -> dict:
    """A baseline includes files, directories, permissions and customer additions."""
    if root.is_symlink() or not root.is_dir():
        raise ValueError("Skill directory is missing or is a symbolic link")
    result = {}
    for path in [root, *sorted(root.rglob("*"))]:
        relative = path.relative_to(root)
        if "__pycache__" in relative.parts or path.suffix in {".pyc", ".pyo"}:
            continue
        info = path.lstat()
        item = {"mode": stat.S_IMODE(info.st_mode)}
        if stat.S_ISREG(info.st_mode):
            item.update(kind="file", sha256=hashlib.sha256(path.read_bytes()).hexdigest())
        elif stat.S_ISDIR(info.st_mode):
            item.update(kind="directory")
        else:
            raise ValueError(f"Unsupported local path: {relative}")
        result[relative.as_posix()] = item
    return result


def atomic_json(path: Path, value: dict) -> None:
    safe_directory(path.parent)
    descriptor, filename = tempfile.mkstemp(prefix=".write-", dir=path.parent)
    try:
        with os.fdopen(descriptor, "w") as stream:
            json.dump(value, stream, sort_keys=True)
            stream.write("\n")
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(filename, path)
    finally:
        if os.path.exists(filename):
            os.unlink(filename)


def read_json(path: Path) -> dict:
    if path.is_symlink() or path.stat().st_size > MAX_STATE_BYTES:
        raise ValueError("Unsafe or oversized catalog state")
    value = json.loads(path.read_text())
    if not isinstance(value, dict):
        raise ValueError("Invalid catalog state")
    return value


def validate_record(record: dict) -> None:
    if not isinstance(record, dict) or not HASH.fullmatch(str(record.get("release", ""))):
        raise ValueError("Invalid installed skill record")
    files = record.get("files")
    if not isinstance(files, dict) or "SKILL.md" not in files:
        raise ValueError("Incomplete installed skill record")
    for name, entry in files.items():
        if name != "." and (name.startswith("/") or "\\" in name or any(p in {"", ".", ".."} for p in name.split("/"))):
            raise ValueError("Unsafe owned file path")
        if not isinstance(entry, dict) or entry.get("kind") not in {"file", "directory"}:
            raise ValueError("Invalid owned file entry")
        if not isinstance(entry.get("mode"), int) or not 0 <= entry["mode"] <= 0o7777:
            raise ValueError("Invalid owned file mode")
        if entry["kind"] == "file" and not HASH.fullmatch(str(entry.get("sha256", ""))):
            raise ValueError("Invalid owned file hash")


def load_manifest(state: Path, origin: str) -> dict:
    path = state / "manifest.json"
    if not os.path.lexists(path):
        return {"schema": 1, "origin": origin, "skills": {}, "pending": {}, "reconciled": None}
    manifest = read_json(path)
    if manifest.get("schema") != 1 or manifest.get("origin") != origin:
        raise ValueError("Unknown ownership schema or different OS origin; preserve the installation")
    if not isinstance(manifest.get("skills"), dict) or not isinstance(manifest.get("pending"), dict):
        raise ValueError("Invalid ownership manifest")
    for name, record in manifest["skills"].items():
        if not NAME.fullmatch(name):
            raise ValueError("Unsafe skill name in ownership manifest")
        validate_record(record)
    return manifest


@contextmanager
def locked(destination: Path):
    destination = safe_directory(destination)
    destination.mkdir(parents=True, exist_ok=True)
    state = safe_directory(destination / STATE_DIRECTORY)
    state.mkdir(mode=0o700, exist_ok=True)
    flags = os.O_RDWR | os.O_CREAT | getattr(os, "O_NOFOLLOW", 0)
    descriptor = os.open(state / "update.lock", flags, 0o600)
    try:
        if os.name == "nt":
            import msvcrt
            os.write(descriptor, b"0")
            os.lseek(descriptor, 0, os.SEEK_SET)
            msvcrt.locking(descriptor, msvcrt.LK_NBLCK, 1)
        else:
            import fcntl
            fcntl.flock(descriptor, fcntl.LOCK_EX | fcntl.LOCK_NB)
        yield state
    finally:
        os.close(descriptor)
