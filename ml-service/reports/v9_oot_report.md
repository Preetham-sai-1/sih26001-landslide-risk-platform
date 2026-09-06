# V9 Untouched 2018 OOT Evaluation Report

## 1. Executive Summary

- **Evaluated Dataset**: Untouched 2018 OOT Holdout (729 samples, 5 positive events in 8 NER states)
- **Model Architecture**: Monotone XGBoost + Isotonic Calibration + V9 Operational Engine (Hysteresis & Persistence)
- **OOT Cell-Level ROC-AUC**: `0.7402`
- **OOT Cell-Level PR-AUC**: `0.0155`
- **OOT WATCH Event Detection Rate**: **`80.0%`**

---

## 2. Cell-Level Scorecard (Frozen Validation Thresholds)

| Alert Level | Threshold | ROC-AUC | PR-AUC | Recall | Precision | F1 Score | FNR | False Alarms / 1,000 Cells | Calibration ECE |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **WATCH** | `0.0091` | **0.7402** | **0.0155** | **80.0%** | 0.0138 | 0.0272 | 0.2 | 390.95 | 0.0075 |
| **HIGH** | `0.75` | **0.7402** | **0.0155** | **0.0%** | 0.0 | 0.0 | 1.0 | 0.0 | 0.0075 |
| **CRITICAL** | `0.75` | **0.7402** | **0.0155** | **0.0%** | 0.0 | 0.0 | 1.0 | 0.0 | 0.0075 |

---

## 3. Event-Level Performance & Lead Time Analysis

- **Total OOT Events Evaluated**: `5`
- **WATCH Detection Rate**: `80.0%` (Median Lead Time: `2.0 days`, Range: 1.0-3.0 days)
- **HIGH Detection Rate**: `0.0%`
- **CRITICAL Detection Rate**: `0.0%`
- **False Alarms per Event**: `49.2`
- **Average Warning Duration**: `36.0 hours`

---

## 4. OOT Calibration Bins & Reliability Curve

| Probability Bin | Sample Count | Mean Predicted Prob | Observed Positive Rate |
| :---: | :---: | :---: | :---: |
| **0.0-0.2** | 405 | 0.0192 | 0.0123 |
| **0.2-0.4** | 12 | 0.2239 | 0.0 |
| **0.4-0.6** | 0 | 0.0 | 0.0 |
| **0.6-0.8** | 0 | 0.0 | 0.0 |
| **0.8-1.0** | 0 | 0.0 | 0.0 |

---

## 5. State-by-State Evaluation (2018 OOT)

| NER State | Total Samples | Positive Events | Evaluation Status | ROC-AUC | PR-AUC | WATCH Recall |
| :--- | :---: | :---: | :--- | :---: | :---: | :---: |
| **Arunachal Pradesh** | 83 | 0 | `NOT EVALUABLE (0 events in OOT)` | N/A | N/A | N/A |
| **Assam** | 60 | 5 | `EVALUABLE` | 0.6436 | 0.1321 | 80.0% |
| **Manipur** | 130 | 0 | `NOT EVALUABLE (0 events in OOT)` | N/A | N/A | N/A |
| **Meghalaya** | 81 | 0 | `NOT EVALUABLE (0 events in OOT)` | N/A | N/A | N/A |
| **Mizoram** | 192 | 0 | `NOT EVALUABLE (0 events in OOT)` | N/A | N/A | N/A |
| **Nagaland** | 121 | 0 | `NOT EVALUABLE (0 events in OOT)` | N/A | N/A | N/A |
| **Sikkim** | 57 | 0 | `NOT EVALUABLE (0 events in OOT)` | N/A | N/A | N/A |
| **Tripura** | 5 | 0 | `NOT EVALUABLE (0 events in OOT)` | N/A | N/A | N/A |

---
*Report generated automatically by V9 Evaluation Pipeline.*
