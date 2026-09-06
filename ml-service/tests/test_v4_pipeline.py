"""
Comprehensive test suite for V4 ML Pipeline & Model Audit.
"""

import pytest
import joblib
import numpy as np
import pandas as pd
from pathlib import Path

from src.features.realtime_ml_engine import RealtimeMLEngine

BASE_DIR = Path(__file__).resolve().parents[1]
DATASET_V4_PATH = BASE_DIR / "data" / "processed" / "training_dataset_v4.parquet"
MODEL_V4_PATH = BASE_DIR / "models" / "model_v4.joblib"
PROD_MODEL_PATH = BASE_DIR / "models" / "landslide_probability_model.joblib"


def test_v4_dataset_exists_and_no_target_dependent_fallbacks():
    """Verify Dataset V4 exists and contains no target-dependent slope fallbacks."""
    assert DATASET_V4_PATH.exists(), f"Missing V4 dataset at {DATASET_V4_PATH}"

    df = pd.read_parquet(DATASET_V4_PATH)
    assert len(df) > 1000
    assert "target" in df.columns
    assert "slope" in df.columns
    assert "r24h" in df.columns

    pos_slope = df[df["target"] == 1]["slope"]
    neg_slope = df[df["target"] == 0]["slope"]

    # Verify no hardcoded default values (e.g. 32.0 for pos, 28.0 for neg)
    assert not (pos_slope == 32.0).all(), "Positive slopes appear hardcoded to 32.0!"
    assert not (neg_slope == 28.0).all(), "Negative slopes appear hardcoded to 28.0!"

    # Verify slopes are continuous real physical values
    assert pos_slope.std() > 3.0, "Positive slope standard deviation is non-physical!"
    assert neg_slope.std() > 3.0, "Negative slope standard deviation is non-physical!"


def test_v4_model_artifact_and_monotonicity():
    """Verify V4 model artifact loads and exhibits monotonic rainfall response."""
    assert MODEL_V4_PATH.exists(), f"Missing V4 model artifact at {MODEL_V4_PATH}"
    assert PROD_MODEL_PATH.exists(), f"Missing production model artifact at {PROD_MODEL_PATH}"

    artifact = joblib.load(MODEL_V4_PATH)
    assert "model" in artifact
    assert "calibrator" in artifact
    assert "feature_names" in artifact

    model = artifact["model"]
    calibrator = artifact["calibrator"]
    feature_names = artifact["feature_names"]

    # Test counterfactual monotonicity on a sample feature vector
    base_row = {col: 0.0 for col in feature_names}
    base_row["elev"] = 1200.0
    base_row["slope"] = 35.0
    base_row["topographic_wetness_proxy"] = 0.5

    probs = []
    rainfall_steps = [0.0, 10.0, 30.0, 60.0, 120.0, 250.0]

    for r in rainfall_steps:
        row = base_row.copy()
        row["r1h"] = r * 0.18
        row["r3h"] = min(r, row["r1h"] * 2.1)
        row["r6h"] = min(r, row["r3h"] * 1.5)
        row["r12h"] = min(r, row["r6h"] * 1.3)
        row["r24h"] = r
        row["r48h"] = r * 1.4
        row["r72h"] = r * 1.8
        row["r7d"] = r * 2.5
        row["r14d"] = r * 3.5
        row["r30d"] = r * 5.0
        row["rainfall_intensity"] = r / 24.0

        df_single = pd.DataFrame([row])[feature_names]
        raw_p = model.predict_proba(df_single)[0, 1]
        cal_p = float(np.clip(calibrator.predict([raw_p])[0], 0.0, 1.0))
        probs.append(cal_p)

    # Dry condition probability should be near baseline
    assert probs[0] < 0.10, f"Dry risk P(0mm) = {probs[0]} is too high!"

    # Monotonicity check
    is_monotonic = all(probs[i] <= probs[i + 1] for i in range(len(probs) - 1))
    assert is_monotonic, f"Counterfactual predictions are not monotonic: {probs}"


def test_realtime_ml_engine_integration():
    """Verify RealtimeMLEngine loads V4 model and predicts probability without errors."""
    engine = RealtimeMLEngine()
    assert engine.is_loaded
    assert ("4.0" in engine.model_version or "5.0" in engine.model_version)

    sample_zone = {
        "grid_id": "test_grid_001",
        "elev": 1100.0,
        "slope": 30.0,
        "aspect": 150.0,
        "curv": 0.02,
        "r24": 15.0,
        "r7d": 45.0,
        "r30d": 120.0
    }

    res = engine.predict_landslide_probability(sample_zone, live_r1h=2.0)
    assert "predicted_landslide_probability_pct" in res
    assert "risk_level" in res
    assert "model_version" in res
    assert 0.0 <= res["predicted_landslide_probability_raw"] <= 1.0
