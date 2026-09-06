"""
Test Suite for V8 External Data Acquisition & Validation.
"""

from pathlib import Path
import pytest

BASE_DIR = Path(__file__).resolve().parents[1]
EXTERNAL_DIR = BASE_DIR / "data" / "external"
MANIFEST_V8_PATH = EXTERNAL_DIR / "manifest_v8.yaml"

REQUIRED_DATASETS = [
    "nasa_gpm_imerg",
    "nasa_smap",
    "esa_worldcover",
    "hydrography",
    "geology_lithology",
    "road_network"
]


def read_manifest_text(path: Path) -> str:
    with open(path, "r", encoding="utf-8") as f:
        return f.read()


def test_manifest_v8_exists_and_valid():
    """Verify manifest_v8.yaml exists and contains all required dataset keys."""
    assert MANIFEST_V8_PATH.exists(), f"Missing V8 manifest at {MANIFEST_V8_PATH}"
    content = read_manifest_text(MANIFEST_V8_PATH)
    assert "metadata:" in content
    assert "datasets:" in content

    for key in REQUIRED_DATASETS:
        assert f"{key}:" in content, f"Missing required dataset '{key}' in manifest_v8.yaml"


def test_v8_blockers_documented():
    """Verify auth/portal blocked datasets have status BLOCKED and detailed explanations."""
    content = read_manifest_text(MANIFEST_V8_PATH)
    blocked_keys = ["nasa_gpm_imerg", "nasa_smap", "geology_lithology"]
    for key in blocked_keys:
        assert f"{key}:" in content
        assert "BLOCKED" in content
        assert "blocker_details:" in content


def test_v8_acquired_datasets_valid():
    """Verify acquired datasets have status ACQUIRED_AND_VALIDATED and valid metadata."""
    content = read_manifest_text(MANIFEST_V8_PATH)
    acquired_keys = ["esa_worldcover", "hydrography", "road_network"]
    for key in acquired_keys:
        assert f"{key}:" in content
        assert "ACQUIRED_AND_VALIDATED" in content
        assert "CRS:" in content
        assert "units:" in content
