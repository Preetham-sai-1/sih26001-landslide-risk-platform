# V9 Model Validation Evaluation Report (Train + Validation Splits)

## 1. Executive Summary & Validation Performance

- **Model Architecture**: Monotone XGBoost Classifier + Isotonic Probability Calibration
- **Validation Dataset**: 2,837 samples across 2013-2017 (26 positive episodes, 2,811 negatives)
- **5-Fold Episode-Grouped CV ROC-AUC**: `0.932`
- **5-Fold Episode-Grouped CV PR-AUC**: `0.514`
- **Post-Calibration Brier Score**: `0.0127` (Log Loss: `0.0543`)

---

## 2. Optimized Operational Decision Thresholds (From Validation PR Curves)

- **WATCH Alert Threshold**: `0.0091` (~95% validation event recall)
- **HIGH Alert Threshold**: `0.75` (Optimal F1 operating point)
- **CRITICAL Alert Threshold**: `0.75` (High-precision operating point)

---

## 3. Physical Monotonicity Verification

- **Counterfactual Monotonicity ($dp/dr \ge 0$)**: `VERIFIED MONOTONIC`

---
*Report generated automatically by V9 Model Training Pipeline.*
