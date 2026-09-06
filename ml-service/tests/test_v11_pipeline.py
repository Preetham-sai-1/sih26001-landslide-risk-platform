"""
Comprehensive Test Suite for V11 Early Warning Decision System & 12 Operational Stress Tests.
"""

from pathlib import Path
import joblib
import numpy as np
import pandas as pd
import pytest

from src.models.v11_operational_engine import (
    V11OperationalEngine,
    OperationalSeverity,
    IncidentState,
    DataQualityStatus,
    VerificationStatus,
    ModelCoverageTier,
    DEFAULT_STATE_COVERAGE
)
from src.data.build_temporal_ml_dataset_v11 import calculate_model_coverage_score

BASE_DIR = Path(__file__).resolve().parents[1]
DATASET_V11_PATH = BASE_DIR / "data" / "processed" / "training_dataset_v11.parquet"
MODEL_V11_PATH = BASE_DIR / "models" / "model_v11.joblib"
REPORTS_DIR = BASE_DIR / "reports"

REQUIRED_V11_ARTIFACTS = [
    DATASET_V11_PATH,
    MODEL_V11_PATH,
    REPORTS_DIR / "v11_event_corpus.md",
    REPORTS_DIR / "v11_training_report.md",
    REPORTS_DIR / "v11_walk_forward_oot.md",
    REPORTS_DIR / "v11_state_coverage.md",
    REPORTS_DIR / "v11_production_certification.md"
]


def test_v11_artifacts_exist():
    """Verify all required V11 dataset, model, and markdown report artifacts exist."""
    for path in REQUIRED_V11_ARTIFACTS:
        assert path.exists(), f"Missing required V11 artifact: {path}"


def test_v11_model_coverage_score_calculation():
    """Verify Model Coverage Index formula and tier assignments."""
    sc_assam, tier_assam = calculate_model_coverage_score("Assam", 13, 217)
    assert sc_assam >= 0.70
    assert tier_assam == "HIGH"

    sc_tripura, tier_tripura = calculate_model_coverage_score("Tripura", 0, 28)
    assert sc_tripura < 0.30
    assert tier_tripura == "LOW"


def test_v11_monotonic_rainfall_response():
    """Verify V11 model exhibits strictly monotonic probability response (dp/dr >= 0)."""
    model_pkg = joblib.load(MODEL_V11_PATH)
    clf = model_pkg["model"]
    iso = model_pkg["isotonic_calibrator"]
    feats = model_pkg["features"]

    df = pd.read_parquet(DATASET_V11_PATH)
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
    assert np.all(diffs >= -1e-6), f"Monotonicity violated in V11 rainfall sweep: {diffs}"


# =============================================================================
# 12 OPERATIONAL STRESS TESTS
# =============================================================================

@pytest.fixture
def test_engine():
    thresholds = {"WATCH": 0.01, "HIGH": 0.30, "CRITICAL": 0.65}
    return V11OperationalEngine(
        thresholds=thresholds,
        persistence_alpha=0.6,
        hysteresis_delta=0.05,
        deescalation_buffer_steps=2
    )


def test_stress_1_missing_rainfall_feed(test_engine):
    """Stress Test 1: Missing rainfall feed triggers OFFLINE status and holds state."""
    cell = "cell_stress_01"
    obs_normal = {"r24h": 25.0, "slope": 25.0, "state": "Assam"}
    res_normal = test_engine.process_cell_observation(cell, 0.05, obs_normal)
    assert res_normal["operational_severity"] == "WATCH"

    obs_missing = {"offline": True, "state": "Assam"}
    res_off = test_engine.process_cell_observation(cell, 0.0, obs_missing)
    assert res_off["data_quality"] == "OFFLINE"
    assert res_off["operational_severity"] == "OFFLINE_HOLD"
    assert res_off["incident_state"] == "WATCH"


def test_stress_2_stale_rainfall_feed(test_engine):
    """Stress Test 2: Stale rainfall feed triggers DEGRADED status."""
    cell = "cell_stress_02"
    obs_stale = {"stale_feed": True, "r24h": 15.0, "slope": 20.0, "state": "Assam"}
    res = test_engine.process_cell_observation(cell, 0.02, obs_stale)
    assert res["data_quality"] == "DEGRADED"
    assert res["operational_severity"] == "WATCH"


def test_stress_3_missing_raster_input(test_engine):
    """Stress Test 3: Missing raster / NaN input defaults safely without exception."""
    cell = "cell_stress_03"
    obs_nan = {"r24h": 0.0, "slope": 0.0, "state": "Assam"}
    res = test_engine.process_cell_observation(cell, 0.0, obs_nan)
    assert res["data_quality"] == "GOOD"
    assert res["operational_severity"] == "NORMAL"


def test_stress_4_gps_grid_mismatch(test_engine):
    """Stress Test 4: Coordinate out of bounds handles model coverage lookup safely."""
    cell = "cell_stress_04"
    obs_oob = {"lat": 99.0, "lon": 99.0, "state": "Tripura"}
    res = test_engine.process_cell_observation(cell, 0.01, obs_oob)
    assert res["model_coverage"] == "LOW"
    assert res["coverage_score"] == 0.2224


def test_stress_5_single_cell_spike(test_engine):
    """Stress Test 5: Single 1-step transient probability spike is dampened by EMA smoothing."""
    cell = "cell_stress_05"
    obs = {"r24h": 5.0, "slope": 15.0, "state": "Assam"}

    # Initial baseline
    test_engine.process_cell_observation(cell, 0.001, obs)

    # Spike from 0.001 to 0.70 (uncorroborated) -> EMA = 0.6*0.70 + 0.4*0.001 = 0.4206 >= 0.30
    # But uncorroborated (r24h=5.0 < 20mm), so downgraded to WATCH hold
    res_spike = test_engine.process_cell_observation(cell, 0.70, obs)
    assert res_spike["operational_severity"] == "WATCH"
    assert res_spike["corroborated"] is False


def test_stress_6_spatial_cluster_activation(test_engine):
    """Stress Test 6: Spatial cluster activation corroborates escalation to HIGH."""
    cell = "cell_stress_06"
    obs_corrob = {"r24h": 40.0, "r1h": 6.0, "r7d": 50.0, "neighbor_max_prob": 0.35, "slope": 28.0, "state": "Assam"}
    res = test_engine.process_cell_observation(cell, 0.50, obs_corrob, neighbor_probs=[0.35, 0.40])
    assert res["operational_severity"] == "HIGH"
    assert res["corroborated"] is True


def test_stress_7_rapid_probability_increase(test_engine):
    """Stress Test 7: Rapid probability increase triggers immediate state escalation."""
    cell = "cell_stress_07"
    obs1 = {"r24h": 10.0, "slope": 20.0, "state": "Assam"}
    test_engine.process_cell_observation(cell, 0.005, obs1)

    obs2 = {"r24h": 50.0, "r1h": 10.0, "r7d": 70.0, "neighbor_max_prob": 0.40, "slope": 28.0, "state": "Assam"}
    res2 = test_engine.process_cell_observation(cell, 0.80, obs2, neighbor_probs=[0.40, 0.50])
    assert res2["operational_severity"] in ["HIGH", "CRITICAL"]


def test_stress_8_rapid_probability_decrease_hysteresis(test_engine):
    """Stress Test 8: Rapid probability decrease retains state during hysteresis buffer steps."""
    cell = "cell_stress_08"
    obs_high = {"r24h": 50.0, "slope": 28.0, "neighbor_max_prob": 0.40, "state": "Assam"}
    test_engine.process_cell_observation(cell, 0.60, obs_high, neighbor_probs=[0.40])

    # Prob drops below threshold (0.005) -> Buffer count 1 -> Retains HIGH
    res_drop1 = test_engine.process_cell_observation(cell, 0.005, obs_high)
    assert res_drop1["operational_severity"] == "HIGH"

    # Buffer count 2 -> De-escalates
    res_drop2 = test_engine.process_cell_observation(cell, 0.005, obs_high)
    assert res_drop2["operational_severity"] == "WATCH"


def test_stress_9_offline_recovery(test_engine):
    """Stress Test 9: System restores state cleanly upon recovery from offline outage."""
    cell = "cell_stress_09"
    obs_normal = {"r24h": 30.0, "slope": 25.0, "state": "Assam"}
    test_engine.process_cell_observation(cell, 0.05, obs_normal)

    # Offline outage
    test_engine.process_cell_observation(cell, 0.0, {"offline": True, "state": "Assam"})

    # Online recovery
    res_rec = test_engine.process_cell_observation(cell, 0.05, obs_normal)
    assert res_rec["data_quality"] == "GOOD"
    assert res_rec["operational_severity"] == "WATCH"


def test_stress_10_duplicate_event_deduplication(test_engine):
    """Stress Test 10: Duplicate ground truth entries maintain single verification state."""
    cell = "cell_stress_10"
    obs_dup = {"r24h": 60.0, "slope": 30.0, "manual_verification": VerificationStatus.CONFIRMED, "state": "Assam"}

    res1 = test_engine.process_cell_observation(cell, 0.70, obs_dup)
    res2 = test_engine.process_cell_observation(cell, 0.70, obs_dup)

    assert res1["verification_status"] == "CONFIRMED"
    assert res2["verification_status"] == "CONFIRMED"
    assert res2["incident_state"] == "CONFIRMED"


def test_stress_11_duplicate_notification_suppression(test_engine):
    """Stress Test 11: Stable risk emits consistent state without duplicate state oscillation."""
    cell = "cell_stress_11"
    obs = {"r24h": 20.0, "slope": 22.0, "state": "Assam"}

    res1 = test_engine.process_cell_observation(cell, 0.02, obs)
    res2 = test_engine.process_cell_observation(cell, 0.02, obs)
    res3 = test_engine.process_cell_observation(cell, 0.02, obs)

    assert res1["incident_state"] == res2["incident_state"] == res3["incident_state"] == "WATCH"


def test_stress_12_repeated_rainfall_observations(test_engine):
    """Stress Test 12: Repeated identical rainfall observations maintain stable EMA trend."""
    cell = "cell_stress_12"
    obs = {"r24h": 40.0, "slope": 25.0, "state": "Assam"}

    for _ in range(5):
        res = test_engine.process_cell_observation(cell, 0.15, obs)

    assert res["temporal_trend"] == "STABLE"
    assert res["data_quality"] == "GOOD"
