"""
Landslide Risk ML Model Training, Probability Calibration & Evaluation.
Trains Baseline (LogisticRegression) and Primary (XGBoost) models with
spatial-leakage aware validation, Platt scaling calibration, and full metrics output.
"""

import os
import json
import joblib
import numpy as np
import pandas as pd
from pathlib import Path
from typing import Dict, Any, Tuple

from sklearn.model_selection import GroupShuffleSplit
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.calibration import CalibratedClassifierCV, calibration_curve
from sklearn.metrics import (
    roc_auc_score,
    average_precision_score,
    precision_score,
    recall_score,
    f1_score,
    brier_score_loss
)
import xgboost as xgb

BASE_DIR = Path(__file__).resolve().parents[2]
DATASET_PATH = BASE_DIR / "data" / "processed" / "ner_temporal_ml_dataset.parquet"
MODEL_PATH = BASE_DIR / "models" / "landslide_probability_model.joblib"
METRICS_PATH = BASE_DIR / "models" / "model_evaluation_metrics.json"

FEATURE_COLS = [
    "elev", "slope", "aspect", "curv",
    "r1h", "r3h", "r6h", "r12h", "r24h", "r48h", "r72h", "r7d", "r14d", "r30d",
    "rolling_max", "rainfall_intensity", "rainfall_acceleration",
    "recent_antecedent_ratio", "rainfall_anomaly", "days_since_heavy_rainfall"
]


def load_dataset() -> pd.DataFrame:
    if not DATASET_PATH.exists():
        raise FileNotFoundError(f"Missing dataset at {DATASET_PATH}. Run build_temporal_ml_dataset.py first.")
    return pd.read_parquet(DATASET_PATH)


def train_and_evaluate_models() -> Dict[str, Any]:
    print(f"Loading dataset from {DATASET_PATH}...")
    df = load_dataset()

    X = df[FEATURE_COLS]
    y = df["target"]
    groups = df["cell_cluster"]

    # Spatial leakage-aware split (GroupShuffleSplit on spatial cell clusters)
    gss = GroupShuffleSplit(n_splits=1, test_size=0.25, random_state=42)
    train_idx, val_idx = next(gss.split(X, y, groups))

    X_train, y_train = X.iloc[train_idx], y.iloc[train_idx]
    X_val, y_val = X.iloc[val_idx], y.iloc[val_idx]

    print(f"Dataset Split -> Train samples: {len(X_train)} (Pos: {sum(y_train)}), Val samples: {len(X_val)} (Pos: {sum(y_val)})")

    # 1. Baseline Model: Logistic Regression
    baseline_pipe = Pipeline([
        ("scaler", StandardScaler()),
        ("clf", LogisticRegression(max_iter=1000, class_weight="balanced", random_state=42))
    ])
    baseline_pipe.fit(X_train, y_train)
    baseline_prob = baseline_pipe.predict_proba(X_val)[:, 1]

    baseline_metrics = {
        "roc_auc": float(roc_auc_score(y_val, baseline_prob)),
        "pr_auc": float(average_precision_score(y_val, baseline_prob)),
        "brier_score": float(brier_score_loss(y_val, baseline_prob)),
        "model_type": "LogisticRegression (Baseline)"
    }

    # 2. Primary Model: XGBoost
    scale_pos_weight = (len(y_train) - sum(y_train)) / max(1, sum(y_train))
    primary_xgb = xgb.XGBClassifier(
        n_estimators=100,
        max_depth=4,
        learning_rate=0.05,
        scale_pos_weight=scale_pos_weight,
        random_state=42,
        eval_metric="logloss"
    )
    primary_xgb.fit(X_train, y_train)

    # Probability Calibration (Sigmoidal Platt Scaling via 3-fold CV)
    calibrated_model = CalibratedClassifierCV(
        estimator=xgb.XGBClassifier(
            n_estimators=100,
            max_depth=4,
            learning_rate=0.05,
            scale_pos_weight=scale_pos_weight,
            random_state=42,
            eval_metric="logloss"
        ),
        method="sigmoid",
        cv=3
    )
    calibrated_model.fit(X_train, y_train)

    val_probs = calibrated_model.predict_proba(X_val)[:, 1]
    val_preds = (val_probs >= 0.5).astype(int)

    # Calculate Evaluation Metrics
    roc_auc = float(roc_auc_score(y_val, val_probs))
    pr_auc = float(average_precision_score(y_val, val_probs))
    precision = float(precision_score(y_val, val_preds, zero_division=0))
    recall = float(recall_score(y_val, val_preds, zero_division=0))
    f1 = float(f1_score(y_val, val_preds, zero_division=0))
    brier = float(brier_score_loss(y_val, val_probs))
    fnr = float(1.0 - recall)

    # Calibration Curve error
    fraction_of_positives, mean_predicted_value = calibration_curve(y_val, val_probs, n_bins=5)
    calibration_mae = float(np.mean(np.abs(fraction_of_positives - mean_predicted_value)))

    # Feature Importances (Model SHAP / Feature Weights)
    importances = primary_xgb.feature_importances_
    feature_importance_dict = {
        col: float(imp) for col, imp in zip(FEATURE_COLS, importances)
    }
    sorted_importances = dict(sorted(feature_importance_dict.items(), key=lambda item: item[1], reverse=True))

    evaluation_report = {
        "model_version": "v1.0.0 (XGBoost + Calibrated Sigmoid)",
        "train_samples": len(X_train),
        "val_samples": len(X_val),
        "metrics": {
            "ROC-AUC": round(roc_auc, 4),
            "PR-AUC": round(pr_auc, 4),
            "Precision": round(precision, 4),
            "Recall": round(recall, 4),
            "F1-Score": round(f1, 4),
            "Brier-Score": round(brier, 4),
            "False-Negative-Rate": round(fnr, 4),
            "Calibration-MAE": round(calibration_mae, 4)
        },
        "baseline_comparison": baseline_metrics,
        "feature_importances": sorted_importances
    }

    print("\n================ MODEL EVALUATION REPORT ================")
    print(f"Model: {evaluation_report['model_version']}")
    print(f"ROC-AUC: {roc_auc:.4f} | PR-AUC: {pr_auc:.4f} | Brier Score: {brier:.4f}")
    print(f"Recall: {recall:.4f} | Precision: {precision:.4f} | F1: {f1:.4f} | FNR: {fnr:.4f}")
    print("Top Feature Importances:")
    for k, v in list(sorted_importances.items())[:6]:
        print(f"  • {k}: {v*100:.1f}%")
    print("=========================================================\n")

    # Save model artifact
    MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    model_artifact = {
        "model": calibrated_model,
        "raw_xgb": primary_xgb,
        "feature_cols": FEATURE_COLS,
        "evaluation_report": evaluation_report,
        "version": "1.0.0"
    }
    joblib.dump(model_artifact, MODEL_PATH)
    print(f"Saved trained calibrated ML model pipeline to {MODEL_PATH}")

    with open(METRICS_PATH, "w") as f:
        json.dump(evaluation_report, f, indent=2)

    return evaluation_report


if __name__ == "__main__":
    train_and_evaluate_models()
