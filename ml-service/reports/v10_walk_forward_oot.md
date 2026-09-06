# V10 Multi-Year Walk-Forward OOT Evaluation Report

## 1. Executive Summary

- **Evaluation Methodology**: Multi-Year Walk-Forward OOT Splits & Untouched 2018 Holdout Set
- **Model Architecture**: Monotone XGBoost + Isotonic Calibration + V10 Operational Engine
- **Denominator Breakdown Audit**:
  - Total 2018 OOT Observation Grid: `729` cell-days across all 8 NER states
  - Assam 2018 Spatial Subset: `60` cell-days (5 positive events, 55 negatives)
  - Other 7 NER States: `669` cell-days (0 recorded positive events in 2018 OOT)

---

## 2. Multi-Year Walk-Forward Results Table

| Window Name | Test Year | Train Samples | Test Samples | Test Positives | ROC-AUC | PR-AUC | Cell WATCH Recall | Event WATCH Recall | Brier Score | False Alarms / 1k Cells |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Window 1 (Train <= 2015 -> Test 2016)** | 2016 | 1406 | 704 | 42 | **0.4992** | **0.0597** | 0.0% | **0.0%** | 0.0607 | 1.42 |
| **Window 2 (Train <= 2016 -> Test 2017)** | 2017 | 2110 | 727 | 4 | **0.491** | **0.0055** | 0.0% | **0.0%** | 0.0098 | 17.88 |
| **Window 3 (Train <= 2017 -> Test 2018)** | 2018 | 2837 | 729 | 5 | **0.4903** | **0.0069** | 0.0% | **0.0%** | 0.0104 | 19.2 |

---

## 3. Untouched 2018 OOT Scorecard (Frozen Validation Thresholds)

| Operational Severity | Threshold | ROC-AUC | PR-AUC | Recall | Precision | F1 Score | FNR | False Alarms / 1,000 Cells | Calibration ECE |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **WATCH** | `0.009` | **0.7305** | **0.0138** | **80.0%** | 0.0143 | 0.0281 | 0.2 | 378.6 | 0.0078 |
| **HIGH** | `0.3333` | **0.7305** | **0.0138** | **0.0%** | 0.0 | 0.0 | 1.0 | 8.23 | 0.0078 |
| **CRITICAL** | `0.5` | **0.7305** | **0.0138** | **0.0%** | 0.0 | 0.0 | 1.0 | 2.74 | 0.0078 |

---

## 4. Multi-Evidence Corroborated Alert Impact

- **Raw Uncorroborated High Triggers**: `6`
- **Corroborated High Alerts**: `1`
- **False Positive Reduction Rate**: **`83.3%`** (Achieved by requiring spatial cluster + temporal acceleration + rainfall trigger confirmation)

---

## 5. Domain Permutation Importance

| Domain Category | Feature Subsets Included | PR-AUC Drop |
| :--- | :--- | :---: |
| **Rainfall Dynamics** | `r1h`, `r24h`, `r7d`, `r30d`, `intensity`, `percentile`, `antecedent`, `acceleration` | **-0.007** |
| **Geomorphology** | `elev`, `slope`, `aspect`, `curv`, `relative_elevation`, `twi` | **0.0038** |
| **Hydrology (Line Streams)** | `distance_to_stream_m` (OSM line geometry), `basin_area_km2` | **0.0036** |
| **Land Cover** | `worldcover_class`, `forest`, `builtup`, `bare_ground` | **0.0** |
| **Human Infrastructure** | `distance_to_major_road_m` | **0.0042** |

---
*Report generated automatically by V10 Walk-Forward Evaluation Pipeline.*
