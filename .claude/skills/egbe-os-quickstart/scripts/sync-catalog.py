#!/usr/bin/env python3
"""Refresh this project's complete Egbe catalog and report per-skill outcomes."""
import sys

# Updates must not manufacture bytecode files inside the ownership baseline.
sys.dont_write_bytecode = True
from catalog_sync.cli import main

if __name__ == "__main__":
    raise SystemExit(main())
