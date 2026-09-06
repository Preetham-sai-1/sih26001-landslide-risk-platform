"""
V11 Model Training & Validation Pipeline.

Trains Monotone XGBoost on Train + Validation splits (< 2018):
- Includes all 34 validated features + V11 operational risk dynamics & model coverage score
- Enforces physical monotonicity constraints (dp/dr >= 0)
- Applies Isotonic Probability Calibration on 5-fold episode-grouped CV out-of-fold predictions
- Optimizes operational alert thresholds (WATCH, HIGH, CRITICAL) using validation PR curves
- Saves model package to ml-service/models/model_v11.joblib
- Generates ml-service/reports/v11_training_report.md
- Keeps 2018 OOT holdout set untouched until final evaluation
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Dict, List, Any, Tuple

import joblib
import numpy as np
import pandas as pd
from sklearn.isotonic import IsotonicRegression
from sklearn.metrics import (
    roc_auc_score,
    average_precision_score,
    brier_score_loss,
    precision_recall_curve,
    f1_score,
    precision_score,
    recall_score,
    log_loss
)
from sklearn.model_selection import GroupKFold
import xgboost as xgb

BASE_DIR = Path(__file__).resolve().parents[2]
DATASET_V11_PATH = BASE_DIR / "data" / "processed" / "training_dataset_v11.parquet"
MODEL_V11_PATH = BASE_DIR / "models" / "model_v11.joblib"
REPORTS_DIR = BASE_DIR / "reports"

ALL_V11_FEATURES = [
    "elev", "slope", "aspect_sin", "aspect_cos", "curv",
    "relative_elevation", "slope_position", "topographic_wetness_proxy",
    "r1h", "r3h", "r6h", "r12h", "r24h", "r48h", "r72h", "r7d", "r14d", "r30d",
    "peak_1h", "peak_3h", "rainfall_intensity", "rainfall_acceleration",
    "recent_to_antecedent_ratio", "rainfall_anomaly", "days_since_heavy_rain", "storm_duration",
    "worldcover_class", "forest_fraction", "agriculture_fraction",
    "builtup_fraction", "bare_ground_fraction",
    "distance_to_stream_m", "basin_area_km2", "distance_to_major_road_m",
    "rainfall_percentile", "antecedent_rain_m", "risk_acceleration",
    "neighbor_max_prob", "spatial_cluster_size", "cluster_growth_rate",
    "risk_gradient", "coverage_score", "is_mined_hard_negative"
]


def get_monotone_constraints(features: List[str]) -> Tuple[int, ...]:
    constraints = []
    for f in features:
        if f.startswith("r") or "rain" in f or "slope" in f or "wetness" in f or "risk" in f or "percentile" in f or "antecedent" in f:
            constraints.append(1)
        elif "bare" in f or "builtup" in f:
            constraints.append(1)
        elif "forest" in f:
            constraints.append(-1)
        else:
            constraints.append(0)
    return tuple(constraints)


def calculate_metrics(y_true: np.ndarray, y_prob: np.ndarray, threshold: float = 0.5) -> Dict[str, float]:
    roc_auc = float(roc_auc_score(y_true, y_prob)) if len(np.unique(y_true)) > 1 else 0.5
    pr_auc = float(average_precision_score(y_true, y_prob)) if len(np.unique(y_true)) > 1 else 0.0
    brier = float(brier_score_loss(y_true, y_prob))
    ll = float(log_loss(y_true, np.clip(y_prob, 1e-15, 1 - 1e-15)))

    y_pred = (y_prob >= threshold).astype(int)
    rec = float(recall_score(y_true, y_pred, zero_division=0))
    prec = float(precision_score(y_true, y_pred, zero_division=0))
    f1 = float(f1_score(y_true, y_pred, zero_division=0))
    fnr = round(1.0 - rec, 4)

    fp_count = int(((y_pred == 1) & (y_true == 0)).sum())
    total_cells = len(y_true)
    false_alarms_per_1000 = round(float((fp_count / max(1, total_cells)) * 1000.0), 2)

    return {
        "roc_auc": round(roc_auc, 4),
        "pr_auc": round(pr_auc, 4),
        "recall": round(rec, 4),
        "precision": round(prec, 4),
        "f1_score": round(f1, 4),
        "fnr": fnr,
        "false_alarms_per_1000_cells": false_alarms_per_1000,
        "brier_score": round(brier, 4),
        "log_loss": round(ll, 4)
    }


def optimize_thresholds_on_cv(y_true: np.ndarray, y_prob: np.ndarray) -> Dict[str, float]:
    precisions, recalls, thresholds = precision_recall_curve(y_true, y_prob)
    f1_scores = 2 * (precisions * recalls) / (precisions + recalls + 1e-10)

    # WATCH threshold: ~95% recall target
    watch_idx = np.argmin(np.abs(recalls - 0.95))
    t_watch = float(thresholds[watch_idx]) if watch_idx < len(thresholds) else 0.01

    # HIGH threshold: Optimal F1 operating point
    best_f1_idx = np.argmax(f1_scores)
    t_high = float(thresholds[best_f1_idx]) if best_f1_idx < len(thresholds) else 0.25

    # CRITICAL threshold: High precision target (~70%+ precision)
    high_prec_mask = precisions >= 0.70
    if np.any(high_prec_mask[:-1]):
        t_critical = float(thresholds[np.where(high_prec_mask[:-1])[0][0]])
    else:
        t_critical = float(thresholds[min(len(thresholds) - 1, best_f1_idx + 2)])

    return {
        "WATCH": round(max(0.005, min(0.95, t_watch)), 4),
        "HIGH": round(max(t_watch, min(0.98, t_high)), 4),
        "CRITICAL": round(max(t_high, min(0.99, t_critical)), 4)
    }


def run_v11_training():
    print("=================================================================")
    print("      EXECUTING V11 MODEL TRAINING & VALIDATION PIPELINE         ")
    print("=================================================================")

    if not DATASET_V11_PATH.exists():
        raise FileNotFoundError(f"Dataset V11 not found at {DATASET_V11_PATH}")

    df = pd.read_parquet(DATASET_V11_PATH)
    df["year"] = pd.to_datetime(df["sample_date"]).dt.year

    # Strictly train + validation split (< 2018) for all tuning
    df_train = df[df["year"] < 2018].copy().reset_index(drop=True)
    print(f"Train + Validation set (< 2018): {len(df_train)} samples")
    print(f"Positives: {(df_train['target'] == 1).sum()} | Negatives: {(df_train['target'] == 0).sum()}")
    print(f"Unique Landslide Episodes: {df_train[df_train['target'] == 1]['episode_id'].nunique()}")

    pos_count = (df_train['target'] == 1).sum()
    neg_count = (df_train['target'] == 0).sum()
    scale_pos_weight = neg_count / max(1, pos_count)

    # 1. 5-FOLD EVENT-EPISODE GROUPED CV
    print("\nPhase 1: Running Event-Episode Grouped 5-Fold Cross Validation...")
    gkf = GroupKFold(n_splits=5)
    groups = df_train["episode_id"]

    raw_oof_preds = np.zeros(len(df_train))
    constraints = get_monotone_constraints(ALL_V11_FEATURES)

    for fold, (tr_idx, val_idx) in enumerate(gkf.split(df_train, df_train["target"], groups)):
        d_tr, d_val = df_train.iloc[tr_idx], df_train.iloc[val_idx]
        clf = xgb.XGBClassifier(
            n_estimators=100,
            max_depth=4,
            learning_rate=0.05,
            subsample=0.8,
            colsample_bytree=0.8,
            scale_pos_weight=scale_pos_weight,
            monotone_constraints=constraints,
            random_state=42,
            eval_metric="logloss"
        )
        clf.fit(d_tr[ALL_V11_FEATURES], d_tr["target"])
        raw_oof_preds[val_idx] = clf.predict_proba(d_val[ALL_V11_FEATURES])[:, 1]

    raw_cv_metrics = calculate_metrics(df_train["target"].values, raw_oof_preds)
    print(f"  Raw OOF CV: ROC-AUC={raw_cv_metrics['roc_auc']}, PR-AUC={raw_cv_metrics['pr_auc']}, Brier={raw_cv_metrics['brier_score']}")

    # 2. PROBABILITY CALIBRATION & THRESHOLD TUNING ON CV
    print("\nPhase 2: Calibrating Model & Optimizing Thresholds on CV Folds...")
    iso = IsotonicRegression(out_of_bounds="clip")
    calib_oof_preds = iso.fit_transform(raw_oof_preds, df_train["target"].values)
    calib_cv_metrics = calculate_metrics(df_train["target"].values, calib_oof_preds)

    thresholds = optimize_thresholds_on_cv(df_train["target"].values, calib_oof_preds)
    print(f"  Calibrated OOF CV: ROC-AUC={calib_cv_metrics['roc_auc']}, PR-AUC={calib_cv_metrics['pr_auc']}, Brier={calib_cv_metrics['brier_score']}")
    print(f"  Validation Decision Thresholds -> WATCH: {thresholds['WATCH']}, HIGH: {thresholds['HIGH']}, CRITICAL: {thresholds['CRITICAL']}")

    # 3. FIT FINAL V11 MODEL ON FULL TRAIN SPLIT (< 2018)
    print("\nPhase 3: Fitting Final V11 Model on Full Train Split (< 2018)...")
    clf_v11 = xgb.XGBClassifier(
        n_estimators=100,
        max_depth=4,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        scale_pos_weight=scale_pos_weight,
        monotone_constraints=constraints,
        random_state=42,
        eval_metric="logloss"
    )
    clf_v11.fit(df_train[ALL_V11_FEATURES], df_train["target"])

    # 4. COUNTERFACTUAL MONOTONICITY TEST
    print("\nPhase 4: Verifying Physical Monotonicity (dp/dr >= 0)...")
    sample_row = df_train.iloc[0:1].copy()
    rain_sweep = np.linspace(0, 300, 31)
    cf_results = []
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
        p_raw = clf_v11.predict_proba(row_test[ALL_V11_FEATURES])[0, 1]
        p_cal = float(iso.transform([p_raw])[0])
        cf_results.append({"r24h_mm": float(r), "raw_prob": round(float(p_raw), 4), "calibrated_prob": round(p_cal, 4)})

    diffs = np.diff([c["calibrated_prob"] for c in cf_results])
    is_strictly_monotonic = bool(np.all(diffs >= -1e-6))
    print(f"  Counterfactual Monotonicity Preserved: {is_strictly_monotonic}")

    # 5. SAVE MODEL PACKAGE & TRAINING REPORT
    MODEL_V11_PATH.parent.mkdir(parents=True, exist_ok=True)
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)

    model_package = {
        "model": clf_v11,
        "isotonic_calibrator": iso,
        "thresholds": thresholds,
        "features": ALL_V11_FEATURES
    }
    joblib.dump(model_package, MODEL_V11_PATH)
    print(f"Saved model package to {MODEL_V11_PATH}")

    val_report_md = f"""# V11 Model Training & Validation Report (Train + Validation Splits)

## 1. Executive Summary & Validation Performance

- **Model Architecture**: Monotone XGBoost Classifier + Isotonic Probability Calibration + Model Coverage Index
- **Validation Dataset**: {len(df_train)} samples across 2013-2017 ({df_train[df_train['target'] == 1]['episode_id'].nunique()} positive episodes, {(df_train['target'] == 0).sum()} negatives)
- **Features Included**: {len(ALL_V11_FEATURES)} total (34 validated features + operational risk dynamics & model coverage score)
- **5-Fold Episode-Grouped CV ROC-AUC**: `{calib_cv_metrics['roc_auc']}`
- **5-Fold Episode-Grouped CV PR-AUC**: `{calib_cv_metrics['pr_auc']}`
- **Post-Calibration Brier Score**: `{calib_cv_metrics['brier_score']}` (Log Loss: `{calib_cv_metrics['log_loss']}`)

---

## 2. Optimized Operational Decision Thresholds (From Validation PR Curves)

- **WATCH Alert Threshold**: `{thresholds['WATCH']}` (~95% validation event recall)
- **HIGH Alert Threshold**: `{thresholds['HIGH']}` (Optimal F1 operating point)
- **CRITICAL Alert Threshold**: `{thresholds['CRITICAL']}` (High-precision operating point)

---

## 3. Physical Monotonicity Verification

- **Counterfactual Monotonicity ($dp/dr \\ge 0$)**: `{"VERIFIED MONOTONIC" if is_strictly_monotonic else "VIOLATED"}`

---
*Report generated automatically by V11 Model Training Pipeline.*
"""

    with open(REPORTS_DIR / "v11_training_report.md", "w") as f:
        f.write(val_report_md)

    print(f"Saved training report to {REPORTS_DIR / 'v11_training_report.md'}")


if __name__ == "__main__":
    run_v11_training()
