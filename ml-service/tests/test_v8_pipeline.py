"""
Comprehensive Test Suite for V8 Model Build & Pipeline.
"""

import json
from pathlib import Path
import joblib
import numpy as np
import pandas as pd
import pytest

BASE_DIR = Path(__file__).resolve().parents[1]
DATASET_V8_PATH = BASE_DIR / "data" / "processed" / "training_dataset_v8.parquet"
MODEL_V8_PATH = BASE_DIR / "models" / "model_v8.joblib"
REPORTS_DIR = BASE_DIR / "reports"

REQUIRED_V8_ARTIFACTS = [
    DATASET_V8_PATH,
    MODEL_V8_PATH,
    REPORTS_DIR / "v8_metrics.json",
    REPORTS_DIR / "v8_ablation.json",
    REPORTS_DIR / "v8_temporal_cv.json",
    REPORTS_DIR / "v8_spatial_cv.json",
    REPORTS_DIR / "v8_calibration.json",
    REPORTS_DIR / "v8_counterfactual.json",
    REPORTS_DIR / "v8_permutation.json",
    REPORTS_DIR / "v8_lead_time.json",
    REPORTS_DIR / "v8_report.md"
]

OFFICIAL_8_NER_STATES = {
    'Assam', 'Arunachal Pradesh', 'Meghalaya', 'Mizoram',
    'Nagaland', 'Manipur', 'Sikkim', 'Tripura'
}


def test_v8_dataset_schema_and_states():
    """Verify Dataset V8 contains all validated features and official 8 NER states."""
    assert DATASET_V8_PATH.exists(), f"Missing V8 dataset at {DATASET_V8_PATH}"

    df = pd.read_parquet(DATASET_V8_PATH)
    assert len(df) >= 3000
    assert "target" in df.columns
    assert "episode_id" in df.columns
    assert "spatial_block_id" in df.columns

    # Verify real-world feature columns
    req_cols = [
        "elev", "slope", "r1h", "r24h", "r7d", "r30d",
        "worldcover_class", "forest_fraction", "agriculture_fraction",
        "distance_to_stream_m", "basin_area_km2", "distance_to_major_road_m"
    ]
    for col in req_cols:
        assert col in df.columns, f"Missing feature column '{col}' in V8 dataset"

    # Verify state exclusion rules
    states = set(df["state"].unique())
    assert "West Bengal" not in states, "West Bengal must be excluded from official NER V8 dataset!"
    assert states.issubset(OFFICIAL_8_NER_STATES), f"Dataset contains unofficial states: {states - OFFICIAL_8_NER_STATES}"


def test_v8_all_11_artifacts_exist():
    """Verify all 11 required V8 artifacts exist in the repository."""
    for path in REQUIRED_V8_ARTIFACTS:
        assert path.exists(), f"Missing required V8 artifact: {path}"


def test_v8_model_package_and_inference():
    """Verify V8 joblib model loads cleanly and performs calibrated probability predictions."""
    model_pkg = joblib.load(MODEL_V8_PATH)
    assert "model" in model_pkg
    assert "isotonic_calibrator" in model_pkg
    assert "thresholds" in model_pkg
    assert "features" in model_pkg

    clf = model_pkg["model"]
    iso = model_pkg["isotonic_calibrator"]
    feats = model_pkg["features"]

    df = pd.read_parquet(DATASET_V8_PATH)
    sample_df = df.iloc[:5][feats]

    raw_probs = clf.predict_proba(sample_df)[:, 1]
    calib_probs = iso.transform(raw_probs)

    assert len(calib_probs) == 5
    assert np.all((calib_probs >= 0.0) & (calib_probs <= 1.0))


def test_v8_counterfactual_monotonicity():
    """Verify V8 counterfactual rainfall test exhibits monotonic risk escalation."""
    with open(REPORTS_DIR / "v8_counterfactual.json", "r") as f:
        data = json.load(f)
    assert "is_strictly_monotonic" in data
    assert data["is_strictly_monotonic"] is True


def test_v8_ablation_results():
    """Verify V8 6-stage ablation results are recorded and complete."""
    with open(REPORTS_DIR / "v8_ablation.json", "r") as f:
        data = json.load(f)

    assert "Stage_1_Terrain" in data
    assert "Stage_2_Rainfall" in data
    assert "Stage_6_All_Validated_Features" in data
