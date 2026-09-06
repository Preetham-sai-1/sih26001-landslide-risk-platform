"""
Comprehensive Test Suite for V7 Event-Episode Early Warning Model.
"""

import pytest
import joblib
import json
import numpy as np
import pandas as pd
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[1]
DATASET_V7_PATH = BASE_DIR / "data" / "processed" / "training_dataset_v7.parquet"
MODEL_V7_PATH = BASE_DIR / "models" / "model_v7.joblib"
REPORTS_DIR = BASE_DIR / "reports"

EPISODE_METRICS_PATH = REPORTS_DIR / "v7_episode_metrics.json"
TEMPORAL_CV_PATH = REPORTS_DIR / "v7_temporal_validation.json"
SPATIAL_CV_PATH = REPORTS_DIR / "v7_spatial_validation.json"
CALIBRATION_PATH = REPORTS_DIR / "v7_calibration.json"
LEAD_TIME_PATH = REPORTS_DIR / "v7_lead_time.json"
COUNTERFACTUAL_PATH = REPORTS_DIR / "v7_counterfactual.json"
REPORT_V7_PATH = REPORTS_DIR / "v7_report.md"

OFFICIAL_8_NER_STATES = {
    'Assam', 'Arunachal Pradesh', 'Meghalaya', 'Mizoram',
    'Nagaland', 'Manipur', 'Sikkim', 'Tripura'
}


def test_v7_dataset_episode_grouping_and_states():
    """Verify Dataset V7 is restricted to official 8 NER states and contains episode_id."""
    assert DATASET_V7_PATH.exists(), f"Missing V7 dataset at {DATASET_V7_PATH}"

    df = pd.read_parquet(DATASET_V7_PATH)
    assert len(df) >= 3000
    assert "target" in df.columns
    assert "episode_id" in df.columns
    assert "spatial_block_id" in df.columns

    states = set(df["state"].unique())
    assert "West Bengal" not in states, "West Bengal must be excluded from official NER V7 dataset!"
    assert states.issubset(OFFICIAL_8_NER_STATES), f"Dataset contains unofficial states: {states - OFFICIAL_8_NER_STATES}"

    pos_events = df[df["target"] == 1]
    assert len(pos_events) == 66, f"Expected 66 positive events, found {len(pos_events)}"
    assert pos_events["episode_id"].nunique() == 31, f"Expected 31 unique episodes, found {pos_events['episode_id'].nunique()}"


def test_v7_required_artifacts_exist():
    """Verify all 9 required V7 artifacts exist in the repository."""
    artifacts = [
        DATASET_V7_PATH,
        MODEL_V7_PATH,
        EPISODE_METRICS_PATH,
        TEMPORAL_CV_PATH,
        SPATIAL_CV_PATH,
        CALIBRATION_PATH,
        LEAD_TIME_PATH,
        COUNTERFACTUAL_PATH,
        REPORT_V7_PATH
    ]
    for path in artifacts:
        assert path.exists(), f"Missing required V7 artifact: {path}"


def test_v7_model_package():
    """Verify V7 model joblib file can be loaded and contains expected components."""
    model_pkg = joblib.load(MODEL_V7_PATH)
    assert "model_c" in model_pkg
    assert "isotonic_calibrator" in model_pkg
    assert "thresholds" in model_pkg
    assert "WATCH" in model_pkg["thresholds"]
    assert "HIGH" in model_pkg["thresholds"]
    assert "CRITICAL" in model_pkg["thresholds"]


def test_v7_counterfactual_monotonicity():
    """Verify V7 counterfactual rainfall sweep exhibits monotonic risk escalation."""
    with open(COUNTERFACTUAL_PATH, "r") as f:
        data = json.load(f)
    assert "is_strictly_monotonic" in data
    assert data["is_strictly_monotonic"] is True


def test_v7_lead_time_recall():
    """Verify warning lead time recalls are computed properly."""
    with open(LEAD_TIME_PATH, "r") as f:
        data = json.load(f)
    assert "watch_alert_recall" in data
    assert data["watch_alert_recall"] >= 0.50
