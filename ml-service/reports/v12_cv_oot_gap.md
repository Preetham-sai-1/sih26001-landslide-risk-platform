# V12 CV-vs-OOT Generalization Gap Audit Report

## 1. Executive Summary & Quantification

| Evaluation Split | Dataset Population | ROC-AUC | PR-AUC | Delta ROC | Delta PR |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **In-Sample Train (<2018)** | 2,837 samples (61 positives) | `0.9994` | `0.9603` | Baseline | Baseline |
| **5-Fold Grouped CV (<2018)** | 2,837 samples (26 episodes) | **`0.9455`** | **`0.6357`** | Baseline | Baseline |
| **Regional OOT (8 States)** | 729 samples (5 positives) | **`0.8700`** | **`0.0292`** | **`-0.0755`** | **`-0.6065`** |
| **Assam OOT (Evaluable)** | 60 samples (5 positives) | **`0.6745`** | **`0.1353`** | **`-0.271`** | **`-0.5004`** |

---

## 2. Root Cause Breakdown Analysis

### A. Base Prevalence Shift (Primary Cause of PR-AUC Drop)
- **Training CV Base Prevalence**: 2.15% (61 positives / 2,837 samples).
- **Regional OOT Base Prevalence**: 0.686% (5 positives / 729 samples).
- **PR-AUC Dependency**: Precision-Recall AUC is mathematically linked to the prior class prevalence. A 3.1x drop in base prevalence causes a steep decline in precision and PR-AUC.

### B. Spatial Un-evaluability Across 7 NER States
- In the 2018 OOT holdout set, **7 out of 8 NER states** (Arunachal Pradesh, Manipur, Meghalaya, Mizoram, Nagaland, Sikkim, Tripura) had **0 recorded ground-truth positive landslide events**.
- The 669 observations in these 7 zero-event states generated false positive predictions without any possible true positives, dragging regional PR-AUC down to `0.0292`.
- When evaluating strictly in Assam (where positive events occurred), PR-AUC rises from `0.0292` to `0.1353`.

### C. Hard-Negative Sampling Shift
- Mined hard negatives in training (<2018) were selected with high slope (>=20 deg) and high 24h rain (>=30mm).
- The 2018 OOT holdout grid contains non-monsoon and low-slope cell days, resulting in a distribution shift between training hard negatives and deployment test grids.

---
*Report generated automatically by V12 Red-Team Audit Engine.*
