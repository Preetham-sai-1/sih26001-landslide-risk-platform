# V11 Model Training & Validation Report (Train + Validation Splits)

## 1. Executive Summary & Validation Performance

- **Model Architecture**: Monotone XGBoost Classifier + Isotonic Probability Calibration + Model Coverage Index
- **Validation Dataset**: 2837 samples across 2013-2017 (26 positive episodes, 2776 negatives)
- **Features Included**: 43 total (34 validated features + operational risk dynamics & model coverage score)
- **5-Fold Episode-Grouped CV ROC-AUC**: `0.9455`
- **5-Fold Episode-Grouped CV PR-AUC**: `0.6357`
- **Post-Calibration Brier Score**: `0.0102` (Log Loss: `0.0452`)

---

## 2. Optimized Operational Decision Thresholds (From Validation PR Curves)

- **WATCH Alert Threshold**: `0.0133` (~95% validation event recall)
- **HIGH Alert Threshold**: `0.5` (Optimal F1 operating point)
- **CRITICAL Alert Threshold**: `0.5` (High-precision operating point)

---

## 3. Physical Monotonicity Verification

- **Counterfactual Monotonicity ($dp/dr \ge 0$)**: `VERIFIED MONOTONIC`

---
*Report generated automatically by V11 Model Training Pipeline.*
