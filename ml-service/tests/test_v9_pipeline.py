"""
Comprehensive Test Suite for V9 Production-Oriented Early Warning Decision System.
"""

import json
from pathlib import Path
import joblib
import numpy as np
import pandas as pd
import pytest

from src.models.v9_operational_engine import (
    V9OperationalEngine,
    OperationalSeverity,
    IncidentState,
    DataQualityStatus,
    VerificationStatus
)

BASE_DIR = Path(__file__).resolve().parents[1]
DATASET_V9_PATH = BASE_DIR / "data" / "processed" / "training_dataset_v9.parquet"
MODEL_V9_PATH = BASE_DIR / "models" / "model_v9.joblib"
REPORTS_DIR = BASE_DIR / "reports"

REQUIRED_V9_ARTIFACTS = [
    DATASET_V9_PATH,
    MODEL_V9_PATH,
    REPORTS_DIR / "v9_validation_report.md",
    REPORTS_DIR / "v9_oot_report.md",
    REPORTS_DIR / "v9_deployment_readiness.md"
]


def test_v9_artifacts_exist():
    """Verify all required V9 dataset, model, and markdown report artifacts exist."""
    for path in REQUIRED_V9_ARTIFACTS:
        assert path.exists(), f"Missing required V9 artifact: {path}"


def test_v9_monotonic_rainfall_response():
    """Verify V9 model exhibits strictly monotonic probability response (dp/dr >= 0)."""
    model_pkg = joblib.load(MODEL_V9_PATH)
    clf = model_pkg["model"]
    iso = model_pkg["isotonic_calibrator"]
    feats = model_pkg["features"]

    df = pd.read_parquet(DATASET_V9_PATH)
    sample_row = df.iloc[0:1].copy()

    rain_sweep = np.linspace(0, 300, 20)
    probs = []
    for r in rain_sweep:
        row_test = sample_row.copy()
        row_test["r1h"] = r / 24.0
        row_test["r3h"] = r / 8.0
        row_test["r6h"] = r / 4.0
        row_test["r12h"] = r / 2.0
        row_test["r24h"] = r
        row_test["r48h"] = r * 1.5
        row_test["r72h"] = r * 2.0
        row_test["r7d"] = r * 2.5
        row_test["r14d"] = r * 3.0
        row_test["r30d"] = r * 4.0
        p_raw = clf.predict_proba(row_test[feats])[0, 1]
        p_cal = float(iso.transform([p_raw])[0])
        probs.append(p_cal)

    diffs = np.diff(probs)
    assert np.all(diffs >= -1e-6), f"Monotonicity violated in V9 rainfall sweep: {diffs}"


def test_v9_operational_engine_persistence_and_hysteresis():
    """Verify V9 operational decision engine smoothing and hysteresis state machine transitions."""
    thresholds = {"WATCH": 0.01, "HIGH": 0.30, "CRITICAL": 0.65}
    engine = V9OperationalEngine(
        thresholds=thresholds,
        persistence_alpha=0.6,
        hysteresis_delta=0.05,
        deescalation_buffer_steps=2
    )

    cell = "cell_test_001"
    obs1 = {"r24h": 50.0, "slope": 25.0}

    # Step 1: Low risk -> NORMAL (0.005)
    res1 = engine.process_cell_observation(cell, 0.005, obs1)
    assert res1["operational_severity"] == "NORMAL"
    assert res1["incident_state"] == "NORMAL"

    # Step 2: High risk spike (0.60) -> EMA = 0.6*0.60 + 0.4*0.005 = 0.362 >= 0.30 -> Escalates to HIGH
    res2 = engine.process_cell_observation(cell, 0.60, obs1)
    assert res2["operational_severity"] == "HIGH"
    assert res2["incident_state"] == "HIGH"

    # Step 3: Risk drops to 0.28 -> EMA = 0.6*0.28 + 0.4*0.362 = 0.3128 >= 0.25 (hysteresis buffer) -> Retains HIGH
    res3 = engine.process_cell_observation(cell, 0.28, obs1)
    assert res3["operational_severity"] == "HIGH"

    # Step 4: Step 1 below hysteresis threshold (0.10) -> Buffer count 1 -> Retains HIGH
    res4 = engine.process_cell_observation(cell, 0.10, obs1)
    assert res4["operational_severity"] == "HIGH"

    # Step 5: Step 2 below hysteresis threshold (0.10) -> Buffer count 2 satisfied -> De-escalates to WATCH
    res5 = engine.process_cell_observation(cell, 0.10, obs1)
    assert res5["operational_severity"] == "WATCH"


def test_v9_operational_engine_offline_mode():
    """Verify offline mode preserves last known state and NEVER assumes 0 risk or triggers false alarm."""
    thresholds = {"WATCH": 0.01, "HIGH": 0.30, "CRITICAL": 0.65}
    engine = V9OperationalEngine(thresholds=thresholds)

    cell = "cell_offline_001"
    obs_normal = {"r24h": 10.0, "slope": 20.0}
    res_normal = engine.process_cell_observation(cell, 0.05, obs_normal)
    assert res_normal["operational_severity"] == "WATCH"

    # Offline observation
    obs_offline = {"offline": True}
    res_off = engine.process_cell_observation(cell, 0.0, obs_offline)

    assert res_off["data_quality"] == "OFFLINE"
    assert res_off["operational_severity"] == "OFFLINE_HOLD"
    assert res_off["incident_state"] == "WATCH"  # Retains last known state
    assert res_off["predicted_risk_is_observed_landslide"] is False


def test_v9_prediction_verification_separation():
    """Verify predicted risk is explicitly separated from ground-truth verification status."""
    thresholds = {"WATCH": 0.01, "HIGH": 0.30, "CRITICAL": 0.65}
    engine = V9OperationalEngine(thresholds=thresholds)

    cell = "cell_sep_001"
    obs = {"r24h": 80.0, "slope": 30.0, "manual_verification": VerificationStatus.CONFIRMED}

    res = engine.process_cell_observation(cell, 0.80, obs)
    assert res["predicted_risk_is_observed_landslide"] is False
    assert res["verification_status"] == "CONFIRMED"
    assert res["incident_state"] == "CONFIRMED"
