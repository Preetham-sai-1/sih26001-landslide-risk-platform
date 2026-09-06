import pytest
from src.features.realtime_ml_engine import RealtimeMLEngine


def test_realtime_ml_engine_inference():
    engine = RealtimeMLEngine()
    sample_zone = {
        "grid_id": "ner_grid_056061",
        "name": "Haflong Hill Sector",
        "state": "Assam",
        "district": "Dima Hasao",
        "r24": 104.7,
        "r7d": 362.5,
        "r30d": 622.5,
        "slope": 34.2,
        "elev": 870.0,
        "aspect": 182.5,
        "curv": 312.4,
        "score": 88.0
    }

    res = engine.predict_landslide_probability(sample_zone, live_r1h=12.5)

    assert "predicted_landslide_probability_pct" in res
    assert 0.0 <= res["predicted_landslide_probability_raw"] <= 1.0
    assert res["risk_level"] in ["SAFE", "LOW", "MODERATE", "HIGH", "VERY HIGH"]
    assert "PREDICTED RISK" in res["data_semantics"]


def test_scenario_projections_6h_12h_24h():
    engine = RealtimeMLEngine()
    sample_zone = {
        "grid_id": "ner_grid_056495",
        "r24": 50.0,
        "r7d": 120.0,
        "r30d": 250.0,
        "slope": 28.0,
        "elev": 600.0
    }

    res = engine.predict_landslide_probability(sample_zone, live_r1h=5.0)
    projections = res["scenario_projections"]

    assert "P_next_6h_pct" in projections
    assert "P_next_12h_pct" in projections
    assert "P_next_24h_pct" in projections
    assert projections["P_next_6h_pct"] <= projections["P_next_12h_pct"] <= projections["P_next_24h_pct"]
    assert "SCENARIO PROJECTION" in projections["label"]


def test_shap_explainability_weights():
    engine = RealtimeMLEngine()
    sample_zone = {
        "grid_id": "ner_grid_056952",
        "r24": 120.0,
        "r7d": 400.0,
        "slope": 38.5,
        "elev": 1100.0
    }

    res = engine.predict_landslide_probability(sample_zone, live_r1h=18.0)
    explainability = res["model_explainability"]

    assert "SHAP" in explainability["method"] or "XGBoost" in explainability["method"]
    assert len(explainability["top_contributing_factors"]) > 0
    top_factor = explainability["top_contributing_factors"][0]
    assert "factor" in top_factor
    assert "weight_pct" in top_factor
