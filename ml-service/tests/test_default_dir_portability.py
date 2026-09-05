"""
ml-service/tests/test_default_dir_portability.py

Regression test for a real reproducibility bug found and fixed: the
DEFAULT_*_DIR constants in dem.py/rainfall.py/soil.py used to be
relative strings ("ml-service/data/raw/...") that only resolved
correctly if the process cwd happened to be the repo root. When
invoked with cwd=ml-service/ (the documented, correct way to run
tests per AGENTS.md), the old default would silently look in
ml-service/ml-service/data/raw/... (nonexistent), masked by the same
NaN-fallback used for genuinely missing data -- an undetected
correctness bug, not a crash.

Fixed by resolving each default relative to the module's own file
location (pathlib, absolute), independent of invocation cwd.
"""

import os
from pathlib import Path

from src.features.dem import DEFAULT_DEM_DIR
from src.features.rainfall import DEFAULT_RAINFALL_DIR
from src.features.soil import DEFAULT_SOIL_DIR

ML_SERVICE_ROOT = Path(__file__).resolve().parents[1]  # ml-service/


def test_default_dem_dir_is_absolute_and_under_ml_service_data_raw():
    assert os.path.isabs(DEFAULT_DEM_DIR)
    assert Path(DEFAULT_DEM_DIR) == ML_SERVICE_ROOT / "data" / "raw" / "srtm_ner"


def test_default_rainfall_dir_is_absolute_and_under_ml_service_data_raw():
    assert os.path.isabs(DEFAULT_RAINFALL_DIR)
    assert Path(DEFAULT_RAINFALL_DIR) == ML_SERVICE_ROOT / "data" / "raw" / "rainfall_ner"


def test_default_soil_dir_is_absolute_and_under_ml_service_data_raw():
    assert os.path.isabs(DEFAULT_SOIL_DIR)
    assert Path(DEFAULT_SOIL_DIR) == ML_SERVICE_ROOT / "data" / "raw" / "soilgrids_ner"
