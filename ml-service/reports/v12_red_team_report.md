# V12 Red-Team Audit & Robustness Report

## 1. Spatial Leakage & Buffer Sensitivity Analysis

| Buffer Radius | Test Samples | OOT Positives | ROC-AUC | PR-AUC | Leakage Finding |
| :---: | :---: | :---: | :---: | :---: | :--- |
| **>=0 km** | 729 | 5 | **0.87** | **0.0292** | Verified zero exact coordinate overlap |
| **>=1 km** | 718 | 5 | **0.8731** | **0.0303** | Verified zero exact coordinate overlap |
| **>=5 km** | 686 | 5 | **0.8846** | **0.0353** | Verified zero exact coordinate overlap |
| **>=10 km** | 671 | 3 | **0.8775** | **0.0276** | Verified zero exact coordinate overlap |
| **>=25 km** | 579 | 3 | **0.8857** | **0.0419** | Verified zero exact coordinate overlap |
| **>=50 km** | 405 | 2 | **0.8182** | **0.0161** | Verified zero exact coordinate overlap |

---

## 2. Hard-Negative Bias Audit

| Sample Population | Sample Count | Mean Slope | Mean 24h Rainfall |
| :--- | :---: | :---: | :---: |
| **Random Negatives** | `2602` | `25.2 deg` | `6.1 mm` |
| **Mined Hard Negatives (<2018)** | `174` | `30.9 deg` | `55.2 mm` |
| **Positive Event Targets** | `61` | `20.3 deg` | `67.0 mm` |

---

## 3. Operational Threshold Trade-Off Analysis

| Operational Stage | Threshold | Cell Recall | Cell Precision | False Alarms / 1k Cells | False Alarms / Event | Events Detected | Events Missed |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **RAW ML (>= 0.50)** | - | 20.0% | 0.0263 | 50.75 | 7.4 | **1** | **4** |
| **WATCH (>= 0.0133)** | - | 100.0% | 0.0208 | 322.36 | 47.0 | **5** | **0** |
| **CORROBORATED WATCH** | - | 80.0% | 0.0292 | 182.44 | 26.6 | **4** | **1** |
| **HIGH (>= 0.50)** | - | 0.0% | 0.0 | 0.0 | 0.0 | **0** | **5** |
| **CRITICAL (>= 0.50)** | - | 0.0% | 0.0 | 4.12 | 0.6 | **0** | **5** |

- **True Events Lost Under Corroboration**: **`1`** events lost when multi-evidence corroboration rules were applied.

---

## 4. Event-Level Confusion Matrix

| Classification Metric | Count |
| :--- | :---: |
| **True Events Detected** | `5` |
| **True Events Missed** | `0` |
| **False Alert Episodes** | `0` |
| **Duplicate Alerts Suppressed** | `137` |

---
*Report generated automatically by V12 Red-Team Audit Engine.*
