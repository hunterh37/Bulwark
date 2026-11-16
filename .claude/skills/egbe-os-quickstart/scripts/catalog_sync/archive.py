"""Reuse the standalone bootstrap's archive validation, not a second extractor."""
import importlib.util
from pathlib import Path

_path = Path(__file__).resolve().parents[1] / "install-catalog.py"
_spec = importlib.util.spec_from_file_location("egbe_catalog_bootstrap", _path)
_module = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_module)
extract = _module._extract
MAX_ARCHIVE_BYTES = _module.MAX_ARCHIVE_BYTES
