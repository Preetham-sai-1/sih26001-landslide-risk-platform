# V11 State Coverage & Evidence Support Audit Report

## 1. Executive Summary

- **Study Area**: 8 Official North Eastern Region (NER) States
- **Coverage Index Formula**:
  $$\text{Coverage\_Index} = \min\left(1.0, 0.40 \cdot \frac{N_{\text{events, state}}}{10} + 0.40 \cdot \frac{N_{\text{train, state}}}{500} + 0.20 \cdot S_{\text{feat\_avail}}\right)$$

---

## 2. State Coverage Matrix (All 8 NER States)

| NER State | Status Classification | Coverage Tier | Coverage Score | OOT Samples | OOT Events | WATCH Recall | Lead Time | False Event Rate |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Arunachal Pradesh** | `LIMITED` | `LIMITED` | 0.5496 | 83 | 0 | N/A (0 OOT events) | N/A | 0.0/1k |
| **Assam** | `VALIDATED` | `HIGH` | 0.7736 | 60 | 5 | 100.0% | 2.0 days | 666.67/1k |
| **Manipur** | `LIMITED` | `LIMITED` | 0.64 | 130 | 0 | N/A (0 OOT events) | N/A | 0.0/1k |
| **Meghalaya** | `LIMITED` | `LIMITED` | 0.4864 | 81 | 0 | N/A (0 OOT events) | N/A | 0.0/1k |
| **Mizoram** | `LIMITED` | `LIMITED` | 0.64 | 192 | 0 | N/A (0 OOT events) | N/A | 0.0/1k |
| **Nagaland** | `LIMITED` | `HIGH` | 0.72 | 121 | 0 | N/A (0 OOT events) | N/A | 0.0/1k |
| **Sikkim** | `LIMITED` | `LIMITED` | 0.568 | 57 | 0 | N/A (0 OOT events) | N/A | 0.0/1k |
| **Tripura** | `NOT EVALUABLE` | `LOW` | 0.2224 | 5 | 0 | N/A (0 OOT events) | N/A | 0.0/1k |

---
*Report generated automatically by V11 State Coverage Pipeline.*
