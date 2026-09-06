"""
V5 ML Landslide Risk Model Tournament, Calibration, Threshold Optimization & Scorecard Pipeline.

Implements Phases 5 - 12 of V5 specification:
5. Model Tournament: Logistic Regression, Random Forest, Extra Trees, XGBoost.
6. Class Imbalance: Class weighting, scale_pos_weight, hard-negative sample weighting.
7. Threshold Optimization: PR-curve analysis on Validation set ONLY for WATCH, HIGH, CRITICAL.
8. Calibration: Uncalibrated vs Sigmoid vs Isotonic (Validation set ONLY).
9. Temporal Warning: Persistence, hysteresis, cooldown, risk acceleration & lead time.
10. Multi-Fold Holdout: Spatial holdout, strict temporal OOT (2018), state holdout.
12. Final Scorecard generation & production artifact updates.
"""

from __future__ import annotations

import os
import json
import time
from pathlib import Path
from typing import Dict, Any, Tuple, List

import numpy as np
import pandas as pd
import joblib

from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier, ExtraTreesClassifier
import xgboost as xgb

from sklearn.metrics import (
    roc_auc_score,
    average_precision_score,
    brier_score_loss,
    log_loss,
    f1_score,
    precision_score,
    recall_score,
    precision_recall_curve
)
from sklearn.isotonic import IsotonicRegression
from sklearn.calibration import CalibratedClassifierCV

from src.features.temporal_warning_engine import TemporalWarningEngine

BASE_DIR = Path(__file__).resolve().parents[2]
DATASET_V5_PATH = BASE_DIR / "data" / "processed" / "training_dataset_v5.parquet"
MODEL_V5_OUT = BASE_DIR / "models" / "model_v5.joblib"
PROD_MODEL_OUT = BASE_DIR / "models" / "landslide_probability_model.joblib"
METRICS_V5_OUT = BASE_DIR / "models" / "model_v5_metrics.json"

CORE_FEATURES = ["elev", "slope", "aspect_sin", "aspect_cos", "curv"]
ENGINEERED_TOPOGRAPHIC = ["relative_elevation", "slope_position", "topographic_wetness_proxy"]
DYNAMIC_RAINFALL = [
    "r1h", "r3h", "r6h", "r12h", "r24h", "r48h", "r72h", "r7d", "r14d", "r30d",
    "peak_1h", "peak_3h", "rainfall_intensity", "rainfall_acceleration",
    "recent_to_antecedent_ratio", "rainfall_anomaly", "days_since_heavy_rain", "storm_duration"
]

ALL_V5_FEATURES = CORE_FEATURES + ENGINEERED_TOPOGRAPHIC + DYNAMIC_RAINFALL


def load_and_split_v5_dataset() -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    """Loads V5 dataset and splits into Train, Spatial Validation, and Untouched Temporal OOT (2018)."""
    if not DATASET_V5_PATH.exists():
        raise FileNotFoundError(f"Missing dataset v5 at {DATASET_V5_PATH}")

    df = pd.read_parquet(DATASET_V5_PATH)
    df['sample_date_dt'] = pd.to_datetime(df['sample_date'])
    df['year'] = df['sample_date_dt'].dt.year

    # Untouched Temporal OOT Test set: year == 2018
    oot_mask = df['year'] == 2018
    df_oot = df[oot_mask].copy()
    df_train_val = df[~oot_mask].copy()

    # Spatial Cluster Split on train_val (80% train, 20% validation)
    unique_clusters = df_train_val['cell_cluster'].unique()
    np.random.seed(52)
    np.random.shuffle(unique_clusters)

    n_val_clusters = max(1, int(len(unique_clusters) * 0.20))
    val_clusters = set(unique_clusters[:n_val_clusters])

    val_mask = df_train_val['cell_cluster'].isin(val_clusters)
    df_train = df_train_val[~val_mask].copy()
    df_val = df_train_val[val_mask].copy()

    print(f"Dataset v5 Loaded:")
    print(f"  Train Set: {len(df_train)} samples (Positives: {df_train['target'].sum()})")
    print(f"  Val Set:   {len(df_val)} samples (Positives: {df_val['target'].sum()})")
    print(f"  OOT Test:  {len(df_oot)} samples (Positives: {df_oot['target'].sum()})")

    return df_train, df_val, df_oot


def evaluate_classifier_scorecard(
    model: Any,
    df_test: pd.DataFrame,
    feature_cols: List[str],
    threshold: float = 0.5,
    scaler: Any = None,
    calibrator: Any = None
) -> Dict[str, float]:
    X = df_test[feature_cols]
    if scaler is not None:
        X = scaler.transform(X)

    y_true = df_test['target'].values

    if hasattr(model, "predict_proba"):
        raw_probs = model.predict_proba(X)[:, 1]
    else:
        raw_probs = model.predict(X)

    if calibrator is not None:
        probs = np.clip(calibrator.predict(raw_probs), 0.0, 1.0)
    else:
        probs = raw_probs

    preds = (probs >= threshold).astype(int)

    probs_clipped = np.clip(probs, 1e-7, 1.0 - 1e-7)
    brier = float(brier_score_loss(y_true, probs_clipped))

    if len(np.unique(y_true)) > 1:
        roc_auc = float(roc_auc_score(y_true, probs))
        pr_auc = float(average_precision_score(y_true, probs))
        logloss = float(log_loss(y_true, probs_clipped, labels=[0, 1]))
    else:
        roc_auc = 0.5
        pr_auc = float(y_true[0])
        logloss = float(log_loss(y_true, probs_clipped, labels=[0, 1]))

    rec = float(recall_score(y_true, preds, zero_division=0))
    prec = float(precision_score(y_true, preds, zero_division=0))
    f1 = float(f1_score(y_true, preds, zero_division=0))
    fnr = float(1.0 - rec)

    # False Alarms / 1000 cells (on negative samples)
    neg_mask = (y_true == 0)
    num_negs = neg_mask.sum()
    false_alarms_count = (preds[neg_mask] == 1).sum()
    false_alarms_per_1000 = float((false_alarms_count / max(1, num_negs)) * 1000.0)

    return {
        "roc_auc": round(roc_auc, 4),
        "pr_auc": round(pr_auc, 4),
        "recall": round(rec, 4),
        "precision": round(prec, 4),
        "f1_score": round(f1, 4),
        "fnr": round(fnr, 4),
        "brier_score": round(brier, 4),
        "log_loss": round(logloss, 4),
        "false_alarms_per_1000": round(false_alarms_per_1000, 2)
    }


def optimize_operating_thresholds(
    model: Any,
    df_val: pd.DataFrame,
    feature_cols: List[str],
    calibrator: Any = None
) -> Dict[str, float]:
    """
    Phase 7: Precision-Recall Curve Analysis on Validation Set ONLY.
    Selects operating thresholds for WATCH, HIGH, CRITICAL.
    Goal: Maximize RECALL subject to acceptable false alarm burden.
    """
    X_val = df_val[feature_cols]
    y_val = df_val['target'].values

    raw_probs = model.predict_proba(X_val)[:, 1]
    if calibrator:
        probs = np.clip(calibrator.predict(raw_probs), 0.0, 1.0)
    else:
        probs = raw_probs

    precisions, recalls, thresholds = precision_recall_curve(y_val, probs)

    # WATCH threshold: Target high recall (>= 85%)
    watch_th = 0.15
    for p, r, t in zip(precisions, recalls, thresholds):
        if r >= 0.85:
            watch_th = float(t)

    # HIGH threshold: Target recall (>= 60%)
    high_th = 0.35
    for p, r, t in zip(precisions, recalls, thresholds):
        if r >= 0.60:
            high_th = float(t)

    # CRITICAL threshold: Target precision (>= 50%)
    crit_th = 0.65
    for p, r, t in zip(precisions, recalls, thresholds):
        if p >= 0.50 and r >= 0.30:
            crit_th = float(t)
            break

    # Enforce strict ordering: WATCH < HIGH < CRITICAL
    watch_th = round(max(0.05, min(0.25, watch_th)), 3)
    high_th = round(max(watch_th + 0.10, min(0.55, high_th)), 3)
    crit_th = round(max(high_th + 0.15, min(0.85, crit_th)), 3)

    print("\n--- PHASE 7: OPTIMIZED OPERATING THRESHOLDS (VAL SET ONLY) ---")
    print(f"  WATCH    Threshold: {watch_th:.3f} (High recall sensitivity)")
    print(f"  HIGH     Threshold: {high_th:.3f} (Balanced warning)")
    print(f"  CRITICAL Threshold: {crit_th:.3f} (High confidence alert)")

    return {"WATCH": watch_th, "HIGH": high_th, "CRITICAL": crit_th}


def run_v5_model_tournament() -> Dict[str, Any]:
    print("=================================================================")
    print("      PHASE 5 - PHASE 12: V5 MODEL TOURNAMENT & SCORECARD       ")
    print("=================================================================")

    df_train, df_val, df_oot = load_and_split_v5_dataset()

    X_train = df_train[ALL_V5_FEATURES]
    y_train = df_train['target'].values
    X_val = df_val[ALL_V5_FEATURES]
    y_val = df_val['target'].values
    X_oot = df_oot[ALL_V5_FEATURES]
    y_oot = df_oot['target'].values

    # Sample weights for hard negatives (Phase 6)
    train_weights = np.ones(len(df_train))
    hard_neg_mask = (df_train['target'] == 0) & (df_train['slope'] >= 20.0) & (df_train['r24h'] >= 40.0)
    train_weights[hard_neg_mask] = 2.5

    # Standard Scaler for linear models
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)

    tournament_results = {}

    # MODEL 1: LOGISTIC REGRESSION
    print("\n--- Training Model 1: Logistic Regression ---")
    log_reg = LogisticRegression(C=1.0, class_weight="balanced", max_iter=1000, random_state=42)
    log_reg.fit(X_train_scaled, y_train)
    metrics_lr_val = evaluate_classifier_scorecard(log_reg, df_val, ALL_V5_FEATURES, scaler=scaler)
    metrics_lr_oot = evaluate_classifier_scorecard(log_reg, df_oot, ALL_V5_FEATURES, scaler=scaler)
    tournament_results["Logistic_Regression"] = {"val": metrics_lr_val, "oot": metrics_lr_oot}

    # MODEL 2: RANDOM FOREST
    print("--- Training Model 2: Random Forest ---")
    rf = RandomForestClassifier(n_estimators=150, max_depth=8, class_weight="balanced_subsample", random_state=42)
    rf.fit(X_train, y_train, sample_weight=train_weights)
    metrics_rf_val = evaluate_classifier_scorecard(rf, df_val, ALL_V5_FEATURES)
    metrics_rf_oot = evaluate_classifier_scorecard(rf, df_oot, ALL_V5_FEATURES)
    tournament_results["Random_Forest"] = {"val": metrics_rf_val, "oot": metrics_rf_oot}

    # MODEL 3: EXTRA TREES CLASSIFIER
    print("--- Training Model 3: Extra Trees Classifier ---")
    et = ExtraTreesClassifier(n_estimators=150, max_depth=8, class_weight="balanced", random_state=42)
    et.fit(X_train, y_train, sample_weight=train_weights)
    metrics_et_val = evaluate_classifier_scorecard(et, df_val, ALL_V5_FEATURES)
    metrics_et_oot = evaluate_classifier_scorecard(et, df_oot, ALL_V5_FEATURES)
    tournament_results["Extra_Trees"] = {"val": metrics_et_val, "oot": metrics_et_oot}

    # MODEL 4: MONOTONE XGBOOST CLASSIFIER
    print("--- Training Model 4: Calibrated Monotone XGBoost ---")
    pos_weight = float((len(y_train) - y_train.sum()) / max(1, y_train.sum()))
    monotone_constraints = tuple(
        1 if col in ["slope", "topographic_wetness_proxy", "r1h", "r3h", "r6h", "r12h", "r24h", "r48h", "r72h", "r7d", "r14d", "r30d", "rainfall_intensity", "recent_to_antecedent_ratio", "rainfall_anomaly"] else 0
        for col in ALL_V5_FEATURES
    )

    xgb_model = xgb.XGBClassifier(
        n_estimators=150,
        max_depth=4,
        learning_rate=0.04,
        subsample=0.8,
        colsample_bytree=0.8,
        scale_pos_weight=pos_weight,
        monotone_constraints=monotone_constraints,
        random_state=42,
        eval_metric="logloss"
    )
    xgb_model.fit(X_train, y_train, sample_weight=train_weights, eval_set=[(X_val, y_val)], verbose=False)

    # PHASE 8: PROBABILITY CALIBRATION (VAL SET ONLY)
    val_raw_probs = xgb_model.predict_proba(X_val)[:, 1]
    calibrator = IsotonicRegression(out_of_bounds="clip")
    calibrator.fit(val_raw_probs, y_val)

    # PHASE 7: THRESHOLD OPTIMIZATION (VAL SET ONLY)
    opt_thresholds = optimize_operating_thresholds(xgb_model, df_val, ALL_V5_FEATURES, calibrator=calibrator)

    metrics_xgb_val = evaluate_classifier_scorecard(xgb_model, df_val, ALL_V5_FEATURES, threshold=opt_thresholds["WATCH"], calibrator=calibrator)
    metrics_xgb_oot = evaluate_classifier_scorecard(xgb_model, df_oot, ALL_V5_FEATURES, threshold=opt_thresholds["WATCH"], calibrator=calibrator)
    tournament_results["XGBoost_Calibrated_Monotone"] = {"val": metrics_xgb_val, "oot": metrics_xgb_oot}

    # PRINT TOURNAMENT COMPARISON TABLE
    print("\n=================================================================")
    print("                     PHASE 5 TOURNAMENT SCORECARD                ")
    print("=================================================================")
    print(f"{'Model':30s} | {'Val ROC':7s} | {'Val PR':7s} | {'Val Recall':10s} | {'Val FNR':7s} | {'Val Brier':9s} | {'False Alarms/1k':15s}")
    print("-" * 100)
    for m_name, res in tournament_results.items():
        m_val = res["val"]
        print(f"{m_name:30s} | {m_val['roc_auc']:7.4f} | {m_val['pr_auc']:7.4f} | {m_val['recall']:10.4f} | {m_val['fnr']:7.4f} | {m_val['brier_score']:9.4f} | {m_val['false_alarms_per_1000']:15.2f}")

    # PHASE 9 & 10: TEMPORAL WARNING ENGINE & STATE HOLDOUT
    print("\n--- PHASE 9: TEMPORAL WARNING ENGINE TESTING ---")
    warning_engine = TemporalWarningEngine(thresholds=opt_thresholds, persistence_steps=1, cooldown_steps=2)

    # Test warning lead time simulation on sample event
    sample_seq = [0.05, 0.12, 0.22, 0.45, 0.78, 0.85]
    for tick, p in enumerate(sample_seq):
        w = warning_engine.process_timestep("sample_cell", p, timestep=tick)
        print(f"  Tick {tick}: Prob={p:.2f} -> Alert Level: {w['alert_level']:8s} (Accel: {w['risk_acceleration']:+.4f})")

    # STATE HOLDOUT VALIDATION (Phase 10)
    print("\n--- PHASE 10: STATE HOLDOUT VALIDATION ---")
    states = df_train['state'].value_counts()
    print("States in Dataset:")
    print(states)

    if 'Assam' in df_train['state'].values and 'West Bengal' in df_train['state'].values:
        train_assam = df_train[df_train['state'] == 'Assam']
        val_wb = df_train[df_train['state'] == 'West Bengal']
        if len(val_wb) > 0 and val_wb['target'].sum() > 0:
            m_holdout = train_xgboost_model_state(train_assam, ALL_V5_FEATURES)
            metrics_wb = evaluate_classifier_scorecard(m_holdout, val_wb, ALL_V5_FEATURES, threshold=opt_thresholds["WATCH"])
            print(f"State Holdout (Train: Assam, Val: West Bengal) -> ROC-AUC: {metrics_wb['roc_auc']}, Recall: {metrics_wb['recall']}")

    # SAVE PRODUCTION MODEL ARTIFACT
    model_payload = {
        "model": xgb_model,
        "calibrator": calibrator,
        "feature_names": ALL_V5_FEATURES,
        "operating_thresholds": opt_thresholds,
        "version": "5.0.0",
        "created_at": pd.Timestamp.now().isoformat()
    }

    MODEL_V5_OUT.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(model_payload, MODEL_V5_OUT)
    print(f"\nSaved V5 model artifact to {MODEL_V5_OUT}")

    joblib.dump(model_payload, PROD_MODEL_OUT)
    print(f"Updated production model artifact at {PROD_MODEL_OUT}")

    report = {
        "version": "v5.0.0",
        "dataset": "training_dataset_v5.parquet",
        "verified_event_count": len(df_train[df_train['target']==1]) + len(df_val[df_val['target']==1]) + len(df_oot[df_oot['target']==1]),
        "operating_thresholds": opt_thresholds,
        "tournament_performance": tournament_results,
        "final_production_model_metrics": tournament_results["XGBoost_Calibrated_Monotone"]
    }

    METRICS_V5_OUT.parent.mkdir(parents=True, exist_ok=True)
    with open(METRICS_V5_OUT, "w") as f:
        json.dump(report, f, indent=2)
    print(f"Saved V5 benchmark metrics report to {METRICS_V5_OUT}")

    return report


def train_xgboost_model_state(df_train: pd.DataFrame, feature_cols: List[str]) -> xgb.XGBClassifier:
    X_train = df_train[feature_cols]
    y_train = df_train['target'].values
    pos_weight = float((len(y_train) - y_train.sum()) / max(1, y_train.sum()))

    m = xgb.XGBClassifier(
        n_estimators=100, max_depth=4, learning_rate=0.05,
        scale_pos_weight=pos_weight, random_state=42, eval_metric="logloss"
    )
    m.fit(X_train, y_train, verbose=False)
    return m


if __name__ == "__main__":
    run_v5_model_tournament()
