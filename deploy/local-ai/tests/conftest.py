"""Unit tests use a public fixture key and never read real router credentials."""
from pathlib import Path
import pytest

@pytest.fixture(autouse=True)
def isolated_router_key(monkeypatch):
    import gateway.runtime as runtime
    key_path = runtime.ROOT / "config/internal-api-key"
    original = Path.read_text
    def read_text(path, *args, **kwargs):
        if path == key_path:
            return "test-only-internal-router-key"
        return original(path, *args, **kwargs)
    monkeypatch.setattr(Path, "read_text", read_text)

def pytest_configure(config):
    (Path(__file__).resolve().parents[1] / "work").mkdir(exist_ok=True)
