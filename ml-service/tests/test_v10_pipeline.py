"""
Comprehensive Test Suite for V10 Production-Oriented Early Warning Decision System & Multi-Year Walk-Forward Evaluation.
"""

from pathlib import Path
import joblib
import numpy as np
import pandas as pd
import pytest

from src.models.v10_operational_engine import (
    V10OperationalEngine,
    OperationalSeverity,
    IncidentState,
    DataQualityStatus,
    VerificationStatus
)

BASE_DIR = Path(__file__).resolve().parents[1]
DATASET_V10_PATH = BASE_DIR / "data" / "processed" / "training_dataset_v10.parquet"
MODEL_V10_PATH = BASE_DIR / "models" / "model_v10.joblib"
REPORTS_DIR = BASE_DIR / "reports"

REQUIRED_V10_ARTIFACTS = [
    DATASET_V10_PATH,
    MODEL_V10_PATH,
    REPORTS_DIR / "v10_training_report.md",
    REPORTS_DIR / "v10_walk_forward_oot.md",
    REPORTS_DIR / "v10_event_level_report.md",
    REPORTS_DIR / "v10_deployment_readiness.md"
]


def test_v10_artifacts_exist():
    """Verify all required V10 dataset, model, and markdown report artifacts exist."""
    for path in REQUIRED_V10_ARTIFACTS:
        assert path.exists(), f"Missing required V10 artifact: {path}"


def test_v10_monotonic_rainfall_response():
    """Verify V10 model exhibits strictly monotonic probability response (dp/dr >= 0)."""
    model_pkg = joblib.load(MODEL_V10_PATH)
    clf = model_pkg["model"]
    iso = model_pkg["isotonic_calibrator"]
    feats = model_pkg["features"]

    df = pd.read_parquet(DATASET_V10_PATH)
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
        row_test["rainfall_intensity"] = r / 24.0
        row_test["rainfall_percentile"] = min(1.0, r / 300.0)
        row_test["antecedent_rain_m"] = r * 1.5
        p_raw = clf.predict_proba(row_test[feats])[0, 1]
        p_cal = float(iso.transform([p_raw])[0])
        probs.append(p_cal)

    diffs = np.diff(probs)
    assert np.all(diffs >= -1e-6), f"Monotonicity violated in V10 rainfall sweep: {diffs}"


def test_v10_operational_engine_corroborated_alerts():
    """Verify V10 multi-evidence corroborated alert escalation logic."""
    thresholds = {"WATCH": 0.01, "HIGH": 0.30, "CRITICAL": 0.65}
    engine = V10OperationalEngine(
        thresholds=thresholds,
        persistence_alpha=0.6,
        hysteresis_delta=0.05,
        deescalation_buffer_steps=2
    )

    cell = "cell_corrob_001"

    # Case A: High model probability (0.50) but NO rainfall/spatial corroboration -> Downgraded to WATCH hold
    obs_uncorroborated = {"r24h": 5.0, "r1h": 0.5, "r7d": 10.0, "neighbor_max_prob": 0.001, "slope": 20.0}
    res_uncorrob = engine.process_cell_observation(cell, 0.50, obs_uncorroborated, neighbor_probs=[0.001])
    assert res_uncorrob["operational_severity"] == "WATCH"
    assert res_uncorrob["corroborated"] is False

    # Case B: High model probability (0.50) WITH rainfall & spatial corroboration -> Escalates to HIGH
    cell2 = "cell_corrob_002"
    obs_corroborated = {"r24h": 45.0, "r1h": 8.0, "r7d": 60.0, "neighbor_max_prob": 0.35, "slope": 28.0}
    res_corrob = engine.process_cell_observation(cell2, 0.50, obs_corroborated, neighbor_probs=[0.35, 0.40])
    assert res_corrob["operational_severity"] == "HIGH"
    assert res_corrob["corroborated"] is True


def test_v10_operational_engine_persistence_and_hysteresis():
    """Verify V10 operational decision engine smoothing and hysteresis state machine transitions."""
    thresholds = {"WATCH": 0.01, "HIGH": 0.30, "CRITICAL": 0.65}
    engine = V10OperationalEngine(
        thresholds=thresholds,
        persistence_alpha=0.6,
        hysteresis_delta=0.05,
        deescalation_buffer_steps=2
    )

    cell = "cell_test_v10_001"
    obs1 = {"r24h": 50.0, "slope": 25.0, "neighbor_max_prob": 0.30}

    # Step 1: Low risk -> NORMAL (0.005)
    res1 = engine.process_cell_observation(cell, 0.005, obs1)
    assert res1["operational_severity"] == "NORMAL"
    assert res1["incident_state"] == "NORMAL"

    # Step 2: High risk spike (0.60) -> EMA = 0.6*0.60 + 0.4*0.005 = 0.362 >= 0.30 -> Escalates to HIGH
    res2 = engine.process_cell_observation(cell, 0.60, obs1, neighbor_probs=[0.30, 0.35])
    assert res2["operational_severity"] == "HIGH"
    assert res2["incident_state"] == "HIGH"

    # Step 3: Risk drops to 0.28 -> EMA = 0.6*0.28 + 0.4*0.362 = 0.3128 >= 0.25 (hysteresis buffer) -> Retains HIGH
    res3 = engine.process_cell_observation(cell, 0.28, obs1, neighbor_probs=[0.30])
    assert res3["operational_severity"] == "HIGH"

    # Step 4: Step 1 below hysteresis threshold (0.10) -> Buffer count 1 -> Retains HIGH
    res4 = engine.process_cell_observation(cell, 0.10, obs1)
    assert res4["operational_severity"] == "HIGH"

    # Step 5: Step 2 below hysteresis threshold (0.10) -> Buffer count 2 satisfied -> De-escalates to WATCH
    res5 = engine.process_cell_observation(cell, 0.10, obs1)
    assert res5["operational_severity"] == "WATCH"


def test_v10_operational_engine_offline_mode():
    """Verify offline mode preserves last known state and NEVER assumes 0 risk or triggers false alarm."""
    thresholds = {"WATCH": 0.01, "HIGH": 0.30, "CRITICAL": 0.65}
    engine = V10OperationalEngine(thresholds=thresholds)

    cell = "cell_offline_v10_001"
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


def test_v10_prediction_verification_separation():
    """Verify predicted risk is explicitly separated from ground-truth verification status."""
    thresholds = {"WATCH": 0.01, "HIGH": 0.30, "CRITICAL": 0.65}
    engine = V10OperationalEngine(thresholds=thresholds)

    cell = "cell_sep_v10_001"
    obs = {"r24h": 80.0, "slope": 30.0, "manual_verification": VerificationStatus.CONFIRMED}

    res = engine.process_cell_observation(cell, 0.80, obs)
    assert res["predicted_risk_is_observed_landslide"] is False
    assert res["verification_status"] == "CONFIRMED"
    assert res["incident_state"] == "CONFIRMED"
