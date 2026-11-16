#!/usr/bin/env python3
"""Set artifact privacy boundaries without creating work or changing Git state."""
import argparse
from pathlib import Path


def prepare(root: Path) -> None:
    root = root.resolve(strict=True)
    for name, rules in (
        (".gitignore", [
            # Outreach's durable store is an artifact, not an ignored local DB.
            "!/egbe-docs/marketing/campaigns/instantly/outreach.db",
            "/egbe-docs/**/.local/", "/egbe-docs/**/.env", "/egbe-docs/**/.env.*",
            "/egbe-docs/**/*.lock", "/egbe-docs/**/*.tmp",
            "/egbe-docs/**/*-wal", "/egbe-docs/**/*-shm", "/egbe-docs/**/*-journal",
        ]),
        (".dockerignore", ["/egbe-docs/", ".git"]),
    ):
        target = root / name
        if target.is_symlink():
            raise ValueError(f"Review {name} symlink before updating artifact exclusions")
        text = target.read_text() if target.exists() else ""
        # Last-match wins: an earlier exclusion can be negated later in the file.
        if text.splitlines()[-len(rules):] != rules:
            target.write_text(text.rstrip("\n") + ("\n" if text else "") + "\n".join(rules) + "\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--project-root", type=Path, required=True)
    prepare(parser.parse_args().project_root)
