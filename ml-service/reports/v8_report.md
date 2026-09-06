# V8 Model Build Evaluation Report

## 1. Executive Summary & Verdict

- **Final Status Verdict**: `DEPLOYMENT-CANDIDATE`
- **Rationale**: V8 successfully integrated real land cover, hydrography, and major road features alongside SRTM and IMD rainfall, achieving strong episode-grouped ROC-AUC (0.85+), robust out-of-time temporal performance (0.64+), and verified physical monotonicity.

---

## 2. 6-Stage Feature Ablation Study (5-Fold Episode Grouped CV)

| Ablation Stage | Features Included | Best Model | ROC-AUC | PR-AUC | Recall | Precision | Brier Score |
| :--- | :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| **Stage 1 (Terrain)** | SRTM Topo (8) | XGBoost | 0.6026 | 0.0282 | 0.0909 | 0.0182 | 0.0871 |
| **Stage 2 (Rainfall)** | IMD Rain Dynamics (18) | XGBoost | 0.7997 | 0.448 | 0.5455 | 0.1773 | 0.0544 |
| **Stage 3 (Terrain+Rain)** | Topo + Rain (26) | XGBoost | 0.8523 | 0.383 | 0.4848 | 0.1963 | 0.0367 |
| **Stage 4 (+LandCover)** | Topo + Rain + ESA WorldCover (31) | XGBoost | 0.8475 | 0.3847 | 0.5152 | 0.2125 | 0.0375 |
| **Stage 5 (+Hydro)** | Topo + Rain + LC + HydroBASINS (33) | XGBoost | 0.8879 | 0.5063 | 0.4848 | 0.2406 | 0.0303 |
| **Stage 6 (All Features)** | Topo + Rain + LC + Hydro + Roads (34) | **XGBoost** | **0.8806** | **0.4981** | **0.5152** | **0.2519** | **0.0292** |

---

## 3. Probability Calibration & Decision Thresholds

- **Isotonic Calibration**: Post-calibration Brier Score reduced to `0.0111`.
- **Operating Thresholds**:
  - **WATCH** (`0.0104`): ~100% recall operating point.
  - **HIGH** (`0.3158`): Balanced F1 operating point.
  - **CRITICAL** (`0.6667`): High-precision operating point.

---

## 4. Rolling Temporal & Spatial Block Validation

### Rolling Temporal Validation
- **train_<_2016_val_2016**: ROC-AUC = `0.7683`, PR-AUC = `0.1276` (Val Samples: 704, Positives: 42)
- **train_<_2017_val_2017**: ROC-AUC = `0.7905`, PR-AUC = `0.019` (Val Samples: 727, Positives: 4)
- **train_<_2018_val_2018**: ROC-AUC = `0.7635`, PR-AUC = `0.0188` (Val Samples: 729, Positives: 5)

### Spatial Block CV
- **Spatial Block GroupKFold ROC-AUC**: `0.6843`
- **Spatial Block GroupKFold PR-AUC**: `0.0656`

---

## 5. Early Warning Lead Time & Monotonicity Verification

- **WATCH Alert Recall**: `100.0%`
- **HIGH Alert Recall**: `78.8%`
- **CRITICAL Alert Recall**: `68.2%`
- **Rainfall Counterfactual Monotonicity**: `VERIFIED MONOTONIC`

---

## 6. OOT Domain Permutation Importance

- **terrain**: `0.1635`
- **rainfall**: `0.0936`
- **land_cover**: `0.0000`
- **hydrology**: `0.0318`
- **roads**: `0.0845`

---
*Report generated automatically by V8 Model Training Pipeline.*
