"""
Comprehensive Test Suite for V6 Generalization-First Rebuild.
"""

import pytest
import joblib
import json
import numpy as np
import pandas as pd
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[1]
DATASET_V6_PATH = BASE_DIR / "data" / "processed" / "training_dataset_v6.parquet"
MODEL_V6_PATH = BASE_DIR / "models" / "model_v6.joblib"
METRICS_V6_PATH = BASE_DIR / "models" / "model_v6_metrics.json"

TEMPORAL_CV_PATH = BASE_DIR / "models" / "v6_temporal_cv.json"
SPATIAL_CV_PATH = BASE_DIR / "models" / "v6_spatial_cv.json"
CALIBRATION_PATH = BASE_DIR / "models" / "v6_calibration.json"
COUNTERFACTUAL_PATH = BASE_DIR / "models" / "v6_counterfactual.json"
PERMUTATION_PATH = BASE_DIR / "models" / "v6_permutation.json"
LEAD_TIME_PATH = BASE_DIR / "models" / "v6_lead_time.json"
REPORT_V6_PATH = BASE_DIR / "reports" / "v6_validation_report.md"

OFFICIAL_8_NER_STATES = {
    'Assam', 'Arunachal Pradesh', 'Meghalaya', 'Mizoram',
    'Nagaland', 'Manipur', 'Sikkim', 'Tripura'
}


def test_v6_dataset_8_ner_states_only():
    """Verify Dataset V6 is restricted to the 8 official NER states (excluding West Bengal)."""
    assert DATASET_V6_PATH.exists(), f"Missing V6 dataset at {DATASET_V6_PATH}"

    df = pd.read_parquet(DATASET_V6_PATH)
    assert len(df) >= 3000
    assert "target" in df.columns
    assert "spatial_block_id" in df.columns

    states = set(df["state"].unique())
    assert "West Bengal" not in states, "West Bengal must be excluded from official NER V6 dataset!"
    assert states.issubset(OFFICIAL_8_NER_STATES), f"Dataset contains unofficial states: {states - OFFICIAL_8_NER_STATES}"

    pos_events = df[df["target"] == 1]
    assert len(pos_events) == 66, f"Expected 66 positive events across official 8 NER states, found {len(pos_events)}"


def test_v6_required_artifacts_exist():
    """Verify all 10 required V6 artifacts exist in the repository."""
    artifacts = [
        DATASET_V6_PATH,
        MODEL_V6_PATH,
        METRICS_V6_PATH,
        TEMPORAL_CV_PATH,
        SPATIAL_CV_PATH,
        CALIBRATION_PATH,
        COUNTERFACTUAL_PATH,
        PERMUTATION_PATH,
        LEAD_TIME_PATH,
        REPORT_V6_PATH
    ]
    for path in artifacts:
        assert path.exists(), f"Missing required V6 artifact: {path}"


def test_v6_spatial_blocking_distance():
    """Verify geographic spatial blocking minimum train-test distance is reported."""
    with open(SPATIAL_CV_PATH, "r") as f:
        data = json.load(f)
    assert "min_geographic_distance_km" in data
    assert data["min_geographic_distance_km"] > 0.0


def test_v6_counterfactual_monotonicity():
    """Verify V6 counterfactual rainfall test exhibits monotonic risk escalation."""
    with open(COUNTERFACTUAL_PATH, "r") as f:
        data = json.load(f)
    assert "is_strictly_monotonic" in data
    assert data["is_strictly_monotonic"] is True


def test_v6_verdict_format():
    """Verify final verdict is one of the 3 allowed options."""
    with open(METRICS_V6_PATH, "r") as f:
        data = json.load(f)
    assert "verdict" in data
    assert data["verdict"] in ["DEPLOYMENT-CANDIDATE", "RESEARCH-PROTOTYPE ONLY", "INVALID"]
