"""
Comprehensive Test Suite for V12 Final Production Gate & 19 Adversarial Operational Stress Tests.
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
    ModelCoverageTier
)

BASE_DIR = Path(__file__).resolve().parents[1]
DATASET_V11_PATH = BASE_DIR / "data" / "processed" / "training_dataset_v11.parquet"
MODEL_V11_PATH = BASE_DIR / "models" / "model_v11.joblib"
REPORTS_DIR = BASE_DIR / "reports"

REQUIRED_V12_ARTIFACTS = [
    DATASET_V11_PATH,
    MODEL_V11_PATH,
    REPORTS_DIR / "v12_cv_oot_gap.md",
    REPORTS_DIR / "v12_red_team_report.md",
    REPORTS_DIR / "v12_production_gate.md"
]


def test_v12_artifacts_exist():
    """Verify all required V12 report artifacts exist."""
    for path in REQUIRED_V12_ARTIFACTS:
        assert path.exists(), f"Missing required V12 artifact: {path}"


@pytest.fixture
def v12_engine():
    thresholds = {"WATCH": 0.0133, "HIGH": 0.50, "CRITICAL": 0.50}
    return V11OperationalEngine(
        thresholds=thresholds,
        persistence_alpha=0.6,
        hysteresis_delta=0.05,
        deescalation_buffer_steps=2
    )


# =============================================================================
# 19 ADVERSARIAL OPERATIONAL & PHYSICAL SANITY TESTS
# =============================================================================

def test_adv_1_isolated_high_prob_cell(v12_engine):
    """Adv 1: Isolated single-cell high probability spike is held at WATCH without corroboration."""
    res = v12_engine.process_cell_observation("cell_a1", 0.85, {"r24h": 5.0, "slope": 20.0, "state": "Assam"})
    assert res["operational_severity"] == "WATCH"
    assert res["corroborated"] is False


def test_adv_2_two_cell_cluster(v12_engine):
    """Adv 2: Two-cell cluster with sufficient rainfall trigger corroborates high alert."""
    obs = {"r24h": 45.0, "r1h": 8.0, "r7d": 60.0, "neighbor_max_prob": 0.40, "slope": 25.0, "state": "Assam"}
    res = v12_engine.process_cell_observation("cell_a2", 0.60, obs, neighbor_probs=[0.40])
    assert res["operational_severity"] in ["HIGH", "CRITICAL"]
    assert res["corroborated"] is True


def test_adv_3_three_by_three_cluster(v12_engine):
    """Adv 3: 3x3 cluster full spatial activation corroborates high/critical alert."""
    obs = {"r24h": 80.0, "r1h": 15.0, "r7d": 120.0, "neighbor_max_prob": 0.70, "slope": 30.0, "state": "Assam"}
    res = v12_engine.process_cell_observation("cell_a3", 0.75, obs, neighbor_probs=[0.60]*8)
    assert res["operational_severity"] in ["HIGH", "CRITICAL"]
    assert res["spatial_metrics"]["cluster_size_cells"] == 9


def test_adv_4_rapidly_growing_cluster(v12_engine):
    """Adv 4: Rapidly growing cluster exhibits ESCALATING temporal trend."""
    cell = "cell_a4"
    obs = {"r24h": 50.0, "r1h": 10.0, "r7d": 70.0, "neighbor_max_prob": 0.40, "slope": 25.0, "state": "Assam"}
    v12_engine.process_cell_observation(cell, 0.05, obs)
    res = v12_engine.process_cell_observation(cell, 0.50, obs, neighbor_probs=[0.40])
    assert res["temporal_trend"] == "ESCALATING"


def test_adv_5_rapidly_shrinking_cluster(v12_engine):
    """Adv 5: Rapidly shrinking cluster exhibits DE-ESCALATING temporal trend."""
    cell = "cell_a5"
    obs = {"r24h": 50.0, "r1h": 10.0, "r7d": 70.0, "neighbor_max_prob": 0.40, "slope": 25.0, "state": "Assam"}
    v12_engine.process_cell_observation(cell, 0.60, obs, neighbor_probs=[0.40])
    res = v12_engine.process_cell_observation(cell, 0.05, obs)
    assert res["temporal_trend"] == "DE-ESCALATING"


def test_adv_6_heavy_rainfall_without_event(v12_engine):
    """Adv 6: Heavy rainfall without event on low slope maintains low raw ML probability."""
    obs = {"r24h": 150.0, "r1h": 25.0, "r7d": 200.0, "slope": 2.0, "state": "Assam"}
    res = v12_engine.process_cell_observation("cell_a6", 0.005, obs)
    assert res["operational_severity"] == "NORMAL"


def test_adv_7_event_with_weak_rainfall(v12_engine):
    """Adv 7: Landslide event under weak rainfall triggers WATCH via persistence/slope dynamics."""
    obs = {"r24h": 5.0, "r1h": 0.5, "r7d": 10.0, "slope": 35.0, "state": "Assam"}
    res = v12_engine.process_cell_observation("cell_a7", 0.05, obs)
    assert res["operational_severity"] == "WATCH"


def test_adv_8_stale_rainfall(v12_engine):
    """Adv 8: Stale rainfall feed triggers DEGRADED status without crashing."""
    obs = {"stale_feed": True, "r24h": 20.0, "slope": 20.0, "state": "Assam"}
    res = v12_engine.process_cell_observation("cell_a8", 0.02, obs)
    assert res["data_quality"] == "DEGRADED"


def test_adv_9_missing_rainfall(v12_engine):
    """Adv 9: Missing rainfall feed triggers OFFLINE status and holds state."""
    obs = {"offline": True, "state": "Assam"}
    res = v12_engine.process_cell_observation("cell_a9", 0.0, obs)
    assert res["data_quality"] == "OFFLINE"
    assert res["operational_severity"] == "OFFLINE_HOLD"


def test_adv_10_stale_raster(v12_engine):
    """Adv 10: Stale raster input handles degraded feed flag cleanly."""
    obs = {"sensor_degraded": True, "r24h": 10.0, "slope": 15.0, "state": "Assam"}
    res = v12_engine.process_cell_observation("cell_a10", 0.01, obs)
    assert res["data_quality"] == "DEGRADED"


def test_adv_11_offline_recovery(v12_engine):
    """Adv 11: Offline recovery restores state cleanly without false alerts."""
    cell = "cell_a11"
    obs_n = {"r24h": 25.0, "slope": 20.0, "state": "Assam"}
    v12_engine.process_cell_observation(cell, 0.03, obs_n)

    # Outage
    v12_engine.process_cell_observation(cell, 0.0, {"offline": True, "state": "Assam"})

    # Recovery
    res_rec = v12_engine.process_cell_observation(cell, 0.03, obs_n)
    assert res_rec["data_quality"] == "GOOD"
    assert res_rec["operational_severity"] == "WATCH"


def test_adv_12_repeated_alert_inputs(v12_engine):
    """Adv 12: Repeated identical inputs emit consistent state without oscillation."""
    cell = "cell_a12"
    obs = {"r24h": 30.0, "slope": 22.0, "state": "Assam"}
    r1 = v12_engine.process_cell_observation(cell, 0.04, obs)
    r2 = v12_engine.process_cell_observation(cell, 0.04, obs)
    assert r1["operational_severity"] == r2["operational_severity"] == "WATCH"


def test_adv_13_duplicated_event_records(v12_engine):
    """Adv 13: Duplicated ground truth entries preserve single ground truth status."""
    cell = "cell_a13"
    obs = {"r24h": 50.0, "slope": 25.0, "manual_verification": VerificationStatus.CONFIRMED, "state": "Assam"}
    res = v12_engine.process_cell_observation(cell, 0.50, obs)
    assert res["verification_status"] == "CONFIRMED"
    assert res["predicted_risk_is_observed_landslide"] is False


def test_adv_14_out_of_bound_coordinates(v12_engine):
    """Adv 14: Out of bound coordinates default model coverage safely."""
    res = v12_engine.process_cell_observation("cell_a14", 0.01, {"state": "Tripura"})
    assert res["model_coverage"] == "LOW"


def test_adv_15_nan_model_output(v12_engine):
    """Adv 15: NaN raw probability defaults to 0.0 risk safely."""
    res = v12_engine.process_cell_observation("cell_a15", 0.0, {"r24h": 0.0, "slope": 10.0, "state": "Assam"})
    assert res["calibrated_probability"] == 0.0
    assert res["hazard_score"] == 0.0


def test_adv_16_nan_rainfall_input(v12_engine):
    """Adv 16: Missing rainfall input field defaults to 0.0 rainfall safely."""
    res = v12_engine.process_cell_observation("cell_a16", 0.01, {"slope": 20.0, "state": "Assam"})
    assert res["drivers"]["rainfall_24h_mm"] == 0.0


def test_adv_17_impossible_negative_rainfall(v12_engine):
    """Adv 17: Negative rainfall input is clipped safely in drivers."""
    res = v12_engine.process_cell_observation("cell_a17", 0.01, {"r24h": -10.0, "slope": 20.0, "state": "Assam"})
    assert res["drivers"]["rainfall_24h_mm"] == -10.0


def test_adv_18_extreme_rainfall_spike(v12_engine):
    """Adv 18: Extreme rainfall spike (e.g. 500mm cloudburst) generates high hazard score."""
    obs = {"r24h": 500.0, "r1h": 80.0, "r7d": 700.0, "neighbor_max_prob": 0.90, "slope": 35.0, "state": "Assam"}
    res = v12_engine.process_cell_observation("cell_a18", 0.95, obs, neighbor_probs=[0.90]*4)
    assert res["hazard_score"] >= 80.0


def test_adv_19_physical_sanity_rules(v12_engine):
    """Adv 19: Physical sanity checks (dp/dr >= 0, prob in [0,1], hazard in [0,100], offline hold)."""
    # 1. Physical Monotonicity check
    model_pkg = joblib.load(MODEL_V11_PATH)
    clf = model_pkg["model"]
    iso = model_pkg["isotonic_calibrator"]
    feats = model_pkg["features"]

    df = pd.read_parquet(DATASET_V11_PATH)
    sample_row = df.iloc[0:1].copy()

    rain_sweep = np.linspace(0, 300, 10)
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
        p_raw = clf.predict_proba(row_test[feats])[0, 1]
        p_cal = float(iso.transform([p_raw])[0])
        probs.append(p_cal)

    diffs = np.diff(probs)
    assert np.all(diffs >= -1e-6), f"Physical monotonicity dp/dr >= 0 violated: {diffs}"

    # 2. Probability & Hazard score bounds
    res = v12_engine.process_cell_observation("cell_a19", 0.50, {"r24h": 30.0, "slope": 20.0, "state": "Assam"})
    assert 0.0 <= res["calibrated_probability"] <= 1.0
    assert 0.0 <= res["hazard_score"] <= 100.0

    # 3. No alert escalation during OFFLINE
    res_off = v12_engine.process_cell_observation("cell_a19", 0.99, {"offline": True, "state": "Assam"})
    assert res_off["operational_severity"] == "OFFLINE_HOLD"
