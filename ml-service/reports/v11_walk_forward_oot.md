# V11 Multi-Year Walk-Forward OOT Evaluation Report

## 1. Executive Summary

- **Evaluation Split**: Multi-Year Walk-Forward OOT Splits & Untouched 2018 Holdout Set
- **Model Architecture**: Monotone XGBoost + Isotonic Calibration + V11 Operational Engine
- **Model Coverage Integration**: State & Cell-Level Model Coverage Index attached to every alert payload

---

## 2. Walk-Forward Results Summary

| Window Name | Test Year | Train Samples | Test Samples | Test Positives | ROC-AUC | PR-AUC | Cell WATCH Recall | Event WATCH Recall | Brier Score | False Alarms / 1k Cells |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Window 1 (Train <= 2015 -> Test 2016)** | 2016 | 1406 | 704 | 42 | **0.4992** | **0.0597** | 0.0% | **0.0%** | 0.0611 | 1.42 |
| **Window 2 (Train <= 2016 -> Test 2017)** | 2017 | 2110 | 727 | 4 | **0.4931** | **0.0055** | 0.0% | **0.0%** | 0.0085 | 13.76 |
| **Window 3 (Train <= 2017 -> Test 2018)** | 2018 | 2837 | 729 | 5 | **0.4855** | **0.0069** | 0.0% | **0.0%** | 0.0191 | 28.81 |

---

## 3. Untouched 2018 OOT Scorecard (Frozen Validation Thresholds)

| Severity Level | Threshold | ROC-AUC | PR-AUC | Recall | Precision | F1 Score | FNR | False Alarms / 1,000 Cells | Calibration ECE |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **WATCH** | `0.0133` | **0.87** | **0.0292** | **100.0%** | 0.0208 | 0.0408 | 0.0 | 322.36 | 0.0147 |
| **HIGH** | `0.5` | **0.87** | **0.0292** | **0.0%** | 0.0 | 0.0 | 1.0 | 5.49 | 0.0147 |
| **CRITICAL** | `0.5` | **0.87** | **0.0292** | **0.0%** | 0.0 | 0.0 | 1.0 | 5.49 | 0.0147 |

---
*Report generated automatically by V11 Walk-Forward Evaluation Pipeline.*
