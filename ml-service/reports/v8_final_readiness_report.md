# V8 Final Deployment-Readiness Evaluation Report

## 1. Executive Summary & Verdict

- **Final Status Verdict**: `RESEARCH-PROTOTYPE ONLY`
- **Rationale**: V8 shows clean feature integration and monotonicity, but OOT state coverage requires additional regional landslide event history.

---

## 2. Hydrography Semantics & Spatial Feature Audit

- **Stream Feature Source**: `Natural Earth 10m Physical Rivers & HydroBASINS Stream Vector Network (ner_streams.shp)`
- **Vector Stream Coverage**: `2,489 stream line vector features covering 100% of all 8 NER states`
- **Distance to Stream (`distance_to_stream_m`) Statistics**:
  - **Min**: `0.6 m`
  - **Median**: `10185.5 m` (`10.19 km`)
  - **Mean**: `12323.3 m` (`12.32 km`)
  - **Max**: `52803.1 m` (`52.80 km`)
  - **Missingness**: `0.0%` (0 NaNs)

---

## 3. Untouched 2018 OOT Scorecard (Frozen Validation Thresholds)

Thresholds frozen from CV: **WATCH** (`0.0104`), **HIGH** (`0.3158`), **CRITICAL** (`0.6667`).

| Alert Level | Threshold | ROC-AUC | PR-AUC | Recall | Precision | F1 Score | FNR | False Alarms / 1,000 Cells | Calibration ECE |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **WATCH** | `0.0104` | **0.737** | **0.014** | **100.0%** | 0.0137 | 0.0271 | 0.0 | 492.46 | 0.0086 |
| **HIGH** | `0.3158` | **0.737** | **0.014** | **0.0%** | 0.0 | 0.0 | 1.0 | 4.12 | 0.0086 |
| **CRITICAL** | `0.6667` | **0.737** | **0.014** | **0.0%** | 0.0 | 0.0 | 1.0 | 2.74 | 0.0086 |

---

## 4. Warning Lead Time Analysis (2018 OOT Events)

- **Total OOT Events Evaluated**: `5`
- **WATCH Detection Rate**: `100.0%` (Median Lead Time: `2.0 days`, Range: 1.0-3.0 days)
- **HIGH Detection Rate**: `0.0%` (Median Lead Time: `1.0 days`, Range: 0.0-2.0 days)
- **CRITICAL Detection Rate**: `0.0%` (Median Lead Time: `0.0 days`, Range: 0.0-1.0 days)

---

## 5. Untouched OOT Feature Ablation (Stage 1 to Stage 6)

| Ablation Stage | Features Included | PR-AUC | Recall | Precision |
| :--- | :--- | :---: | :---: | :---: |
| **Stage 1 (Terrain)** | SRTM Topo (8) | 0.0072 | 0.0 | 0.0 |
| **Stage 2 (Rainfall)** | IMD Rain Dynamics (18) | 0.0062 | 0.0 | 0.0 |
| **Stage 3 (Terrain+Rain)** | Topo + Rain (26) | 0.013 | 0.0 | 0.0 |
| **Stage 4 (+LandCover)** | Topo + Rain + ESA WorldCover (31) | 0.013 | 0.0 | 0.0 |
| **Stage 5 (+Hydro)** | Topo + Rain + LC + HydroBASINS Streams (33) | 0.0206 | 0.0 | 0.0 |
| **Stage 6 (All Features)** | Topo + Rain + LC + Hydro + Major Roads (34) | **0.014** | **0.0** | **0.0** |

---

## 6. Domain Permutation & Counterfactual Monotonicity

- **OOT Domain Permutation Importance (PR-AUC Drop)**:
  - **Rainfall**: `-0.0084`
  - **Terrain**: `0.005`
  - **Land Cover**: `0.0`
  - **Hydrology**: `0.0015`
  - **Roads**: `-0.0067`
- **Rainfall Counterfactual Monotonicity ($dp/dr \ge 0$)**: `VERIFIED MONOTONIC`

---

## 7. Reliability Curve & Calibration Bins (2018 OOT)

| Probability Bin | Sample Count | Mean Predicted Prob | Observed Positive Rate |
| :---: | :---: | :---: | :---: |
| **0.0-0.2** | 554 | 0.0126 | 0.009 |
| **0.2-0.4** | 5 | 0.3158 | 0.0 |
| **0.4-0.6** | 0 | 0.0 | 0.0 |
| **0.6-0.8** | 1 | 0.6667 | 0.0 |
| **0.8-1.0** | 2 | 1.0 | 0.0 |

---

## 8. State-by-State Generalization (2018 OOT)

| NER State | Total OOT Samples | Positive Events | ROC-AUC | PR-AUC | Recall |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Arunachal Pradesh** | 83 | 0 | 0.5 | 0.0 | 0.0% |
| **Assam** | 60 | 5 | 0.6455 | 0.1205 | 0.0% |
| **Manipur** | 130 | 0 | 0.5 | 0.0 | 0.0% |
| **Meghalaya** | 81 | 0 | 0.5 | 0.0 | 0.0% |
| **Mizoram** | 192 | 0 | 0.5 | 0.0 | 0.0% |
| **Nagaland** | 121 | 0 | 0.5 | 0.0 | 0.0% |
| **Sikkim** | 57 | 0 | 0.5 | 0.0 | 0.0% |

---
*Report generated automatically by V8 Final Readiness Audit Pipeline.*
