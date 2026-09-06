"""
Comprehensive Test Suite for V5 ML Pipeline & Real-World Detection Improvement.
"""

import pytest
import joblib
import numpy as np
import pandas as pd
from pathlib import Path

from src.features.realtime_ml_engine import RealtimeMLEngine
from src.features.temporal_warning_engine import TemporalWarningEngine

BASE_DIR = Path(__file__).resolve().parents[1]
DATASET_V5_PATH = BASE_DIR / "data" / "processed" / "training_dataset_v5.parquet"
MODEL_V5_PATH = BASE_DIR / "models" / "model_v5.joblib"
PROD_MODEL_PATH = BASE_DIR / "models" / "landslide_probability_model.joblib"


def test_v5_dataset_exists_and_verified_events():
    """Verify V5 dataset exists and contains 95 verified positive events."""
    assert DATASET_V5_PATH.exists(), f"Missing V5 dataset at {DATASET_V5_PATH}"

    df = pd.read_parquet(DATASET_V5_PATH)
    assert len(df) >= 4000
    assert "target" in df.columns
    assert "slope" in df.columns
    assert "slope_position" in df.columns

    pos_events = df[df["target"] == 1]
    assert len(pos_events) == 95, f"Expected 95 positive events in V5 dataset, found {len(pos_events)}"

    # Verify state distribution
    states = pos_events["state"].value_counts()
    assert "Assam" in states
    assert "West Bengal" in states


def test_v5_model_artifact_and_calibration():
    """Verify V5 model artifact loads, has thresholds, and is calibrated."""
    assert MODEL_V5_PATH.exists(), f"Missing V5 model artifact at {MODEL_V5_PATH}"
    assert PROD_MODEL_PATH.exists(), f"Missing production model artifact at {PROD_MODEL_PATH}"

    artifact = joblib.load(MODEL_V5_PATH)
    assert "model" in artifact
    assert "calibrator" in artifact
    assert "feature_names" in artifact
    assert "operating_thresholds" in artifact

    thresholds = artifact["operating_thresholds"]
    assert "WATCH" in thresholds
    assert "HIGH" in thresholds
    assert "CRITICAL" in thresholds
    assert thresholds["WATCH"] < thresholds["HIGH"] < thresholds["CRITICAL"]


def test_temporal_warning_engine():
    """Verify TemporalWarningEngine handles persistence, hysteresis, and cooldown."""
    engine = TemporalWarningEngine(
        thresholds={"WATCH": 0.10, "HIGH": 0.30, "CRITICAL": 0.60},
        persistence_steps=2,
        cooldown_steps=2
    )

    # Step 1: Low probability
    w1 = engine.process_timestep("cell_01", 0.05, timestep=1)
    assert w1["alert_level"] == "SAFE"

    # Step 2: Probability above WATCH (1 step persistence)
    w2 = engine.process_timestep("cell_01", 0.15, timestep=2)
    assert w2["alert_level"] == "WATCH"

    # Step 3: Probability above HIGH (1 step, persistence requires 2)
    w3 = engine.process_timestep("cell_01", 0.35, timestep=3)
    assert w3["alert_level"] == "WATCH"

    # Step 4: Probability above HIGH (2nd step) -> Escalates to HIGH
    w4 = engine.process_timestep("cell_01", 0.40, timestep=4)
    assert w4["alert_level"] == "HIGH"

    # Step 5: Probability above CRITICAL -> Escalates to CRITICAL
    w5 = engine.process_timestep("cell_01", 0.70, timestep=5)
    assert w5["alert_level"] == "CRITICAL"


def test_v5_realtime_ml_engine_integration():
    """Verify RealtimeMLEngine loads V5 model and performs inference."""
    engine = RealtimeMLEngine()
    assert engine.is_loaded
    assert "5.0" in engine.model_version

    sample_zone = {
        "grid_id": "test_v5_grid",
        "elev": 1200.0,
        "slope": 32.0,
        "aspect": 180.0,
        "curv": 0.01,
        "slope_position": 5.0,
        "r24": 150.0,
        "r7d": 300.0,
        "r30d": 500.0
    }

    res = engine.predict_landslide_probability(sample_zone, live_r1h=20.0)
    assert "predicted_landslide_probability_pct" in res
    assert "risk_level" in res
    assert res["risk_level"] in ["SAFE", "WATCH", "HIGH", "CRITICAL"]
