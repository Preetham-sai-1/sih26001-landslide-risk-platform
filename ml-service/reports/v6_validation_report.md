# V6 Generalization-First Rebuild Validation Report

## Executive Verdict
**FINAL VERDICT**: `RESEARCH-PROTOTYPE ONLY`

---

## 1. Study Area & Event Cohort Audit
- **Official Study Area**: Official 8 NER States (Assam, Arunachal Pradesh, Meghalaya, Mizoram, Nagaland, Manipur, Sikkim, Tripura)
- **Excluded Territory**: West Bengal (excluded per Section 1)
- **Total Verified Positive Events**: **66 events** (2010–2019)

---

## 2. Geographic Spatial Blocking (Section 5)
- **Spatial Block Size**: 0.5° x 0.5° lat/lon blocks
- **Total Spatial Blocks**: 86
- **Minimum Geographic Distance (Train vs Test)**: **1.5 km**

---

## 3. Rolling Temporal Forward Cross-Validation (Section 6 & 7)
| Fold | Train Years | Val Year | Val Positives | PR-AUC | Recall | ROC-AUC |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| 1 | [2013, 2014, 2015] | 2016 | 42 | 0.4030 | 0.2857 | 0.8667 |
| 2 | [2013, 2014, 2015, 2016] | 2017 | 4 | 0.0165 | 0.0000 | 0.6070 |
| 3 | [2013, 2014, 2015, 2016, 2017] | 2018 | 5 | 0.0149 | 0.0000 | 0.6977 |

---

## 4. Optimized Operating Thresholds (Section 11)
- **`WATCH` Threshold**: `0.2`
- **`HIGH` Threshold**: `0.45`
- **`CRITICAL` Threshold**: `0.85`

---

## 5. Critical Counterfactual Rainfall Test (Section 13)
- **Strict Monotonicity**: `True`
- **Response Curve**:
  - `r24h` =   0 mm $\to P(\text{landslide}) = 0.0020$
  - `r24h` =  10 mm $\to P(\text{landslide}) = 0.0070$
  - `r24h` =  25 mm $\to P(\text{landslide}) = 0.1053$
  - `r24h` =  50 mm $\to P(\text{landslide}) = 0.1520$
  - `r24h` =  75 mm $\to P(\text{landslide}) = 0.1569$
  - `r24h` = 100 mm $\to P(\text{landslide}) = 0.1569$
  - `r24h` = 150 mm $\to P(\text{landslide}) = 0.1569$
  - `r24h` = 200 mm $\to P(\text{landslide}) = 0.1569$
  - `r24h` = 250 mm $\to P(\text{landslide}) = 0.1569$

---

## 6. Untouched OOT Permutation Importance (Section 14)
- **Baseline OOT PR-AUC**: `0.0066`
- **Rainfall Feature Drop**: `0.0004`
- **Terrain Feature Drop**: `0.0`

---

## 7. Warning Lead Time Analysis (Section 15)
- **OOT Events Detected**: `0 / 5`
- **Mean Lead Time**: `0.0 day(s)`
