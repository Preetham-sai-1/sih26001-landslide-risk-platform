# V10 Event-Level Evaluation Report

## 1. Executive Summary & Event Episode Metrics

- **Evaluated OOT Landslide Episodes**: `5` verified episode clusters in 2018 OOT
- **WATCH Event Detection Rate**: **`80.0%`**
- **HIGH Event Detection Rate**: **`0.0%`**
- **CRITICAL Event Detection Rate**: **`0.0%`**
- **False Alarms per Event Episode**: `42.4`
- **Average Early Warning Duration**: `36.0 hours`

---

## 2. Warning Lead-Time Breakdown

| Severity Level | Median Lead Time | Mean Lead Time | Min Lead Time | Max Lead Time |
| :--- | :---: | :---: | :---: | :---: |
| **WATCH** | **2.0 days** | 2.2 days | 1.0 days | 3.0 days |
| **HIGH** | **1.0 days** | 1.1 days | 0.0 days | 2.0 days |
| **CRITICAL** | **0.0 days** | 0.2 days | 0.0 days | 1.0 days |

---

## 3. State-by-State Event Breakdown (All 8 Official NER States)

| NER State | Total Samples | Positive Events | Evaluation Status | ROC-AUC | PR-AUC | WATCH Event Recall |
| :--- | :---: | :---: | :--- | :---: | :---: | :---: |
| **Arunachal Pradesh** | 83 | 0 | `NOT EVALUABLE (0 events in OOT)` | N/A | N/A | N/A |
| **Assam** | 60 | 5 | `EVALUABLE` | 0.64 | 0.1178 | 80.0% |
| **Manipur** | 130 | 0 | `NOT EVALUABLE (0 events in OOT)` | N/A | N/A | N/A |
| **Meghalaya** | 81 | 0 | `NOT EVALUABLE (0 events in OOT)` | N/A | N/A | N/A |
| **Mizoram** | 192 | 0 | `NOT EVALUABLE (0 events in OOT)` | N/A | N/A | N/A |
| **Nagaland** | 121 | 0 | `NOT EVALUABLE (0 events in OOT)` | N/A | N/A | N/A |
| **Sikkim** | 57 | 0 | `NOT EVALUABLE (0 events in OOT)` | N/A | N/A | N/A |
| **Tripura** | 5 | 0 | `NOT EVALUABLE (0 events in OOT)` | N/A | N/A | N/A |

---
*Report generated automatically by V10 Event-Level Evaluation Pipeline.*
