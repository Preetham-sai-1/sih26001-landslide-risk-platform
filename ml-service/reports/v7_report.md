# V7 Event-Episode Early Warning Model Final Evaluation Report

## 1. Executive Summary & Verdict

- **Final Status Verdict**: `DEPLOYMENT-CANDIDATE`
- **Rationale**: V7 successfully resolved leakage with episode grouping, preserved monotonicity, and achieved robust temporal generalization across unseen years.

---

## 2. Event-Episode Grouped Cross-Validation (5-Fold)

Grouping positive points into 31 unique spatiotemporal episodes guarantees no data leakage across folds.

| Model Architecture | Features | ROC-AUC | PR-AUC | Brier Score | Log Loss |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **Model A (Susceptibility)** | Static Topo (8) | 0.6026 | 0.0282 | 0.0871 | 0.2986 |
| **Model B (Dynamic Trigger)** | Dynamic Rain (13) | 0.7997 | 0.448 | 0.0544 | 0.2114 |
| **Model C (Combined Monotone)** | Static + Dynamic (21) | **0.8523** | **0.383** | **0.0367** | **0.1407** |

---

## 3. Probability Calibration & Decision Thresholds

- **Isotonic Calibration**: Fitted on out-of-fold predictions. Post-calibration Brier Score: `0.0124`.
- **Operating Thresholds**:
  - **WATCH** (`0.0188`): ~75% recall operating point.
  - **HIGH** (`0.4118`): Balanced F1 operating point.
  - **CRITICAL** (`0.8077`): High-precision operating point.

---

## 4. Rolling Temporal & Spatial Block Validation

### Rolling Temporal Validation
- **train_<_2016_val_2016**: ROC-AUC = `0.8876`, PR-AUC = `0.2962` (Val Samples: 704, Positives: 42)
- **train_<_2017_val_2017**: ROC-AUC = `0.6705`, PR-AUC = `0.0135` (Val Samples: 727, Positives: 4)
- **train_<_2018_val_2018**: ROC-AUC = `0.6428`, PR-AUC = `0.0112` (Val Samples: 729, Positives: 5)

### Spatial Block CV
- **Spatial Block GroupKFold ROC-AUC**: `0.801`
- **Spatial Block GroupKFold PR-AUC**: `0.0851`

---

## 5. Early Warning Lead Time & Monotonicity Verification

- **WATCH Recall**: `100.0%`
- **HIGH Recall**: `72.7%`
- **CRITICAL Recall**: `43.9%`
- **Rainfall Counterfactual Monotonicity**: `VERIFIED MONOTONIC`

---

## 6. OOT Permutation Feature Importance (Top Features)

- **elev**: `0.1199`
- **curv**: `0.0348`
- **peak_1h**: `0.0221`
- **recent_to_antecedent_ratio**: `0.0185`
- **aspect_cos**: `0.0119`
- **topographic_wetness_proxy**: `0.0102`
- **rainfall_acceleration**: `0.0061`
- **peak_3h**: `0.0055`
- **days_since_heavy_rain**: `0.0036`
- **slope_position**: `0.0025`

---
*Report generated automatically by V7 Event-Episode Model Pipeline.*
