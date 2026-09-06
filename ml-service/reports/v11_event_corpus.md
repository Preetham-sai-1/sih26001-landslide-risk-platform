# V11 Landslide Event Corpus Quality & Reconciliation Audit Report

## 1. Executive Summary

- **Study Area**: 8 Official North Eastern Region (NER) States (West Bengal Excluded)
- **Total Ground-Truth Records**: `8546` raw GSI inventory records
- **Total Canonical Episodes**: `3243` spatial-temporal episode clusters

---

## 2. Temporal Precision Breakdown Across NER

| Precision Tier | Definition | Raw Record Count | Episode Count | Usage Policy |
| :--- | :--- | :---: | :---: | :--- |
| **A_EXACT_DATETIME** | Exact Date & Timestamp | `0` | `0` | Day-level Supervised ML Training & Lead Time Eval |
| **B_EXACT_DATE** | Exact Date (YYYY-MM-DD) | `66` | `44` | Day-level Supervised ML Training & Lead Time Eval |
| **C_MONTH_YEAR** | Month & Year (YYYY-MM) | `1559` | `1534` | Monthly Validation & Seasonal Analysis Only |
| **D_YEAR_ONLY** | Year Only (YYYY) | `6921` | `1665` | Static Spatial Susceptibility Analysis Only |
| **E_UNKNOWN** | No Temporal Information | `0` | `0` | Excluded from Supervised Evaluation |

---

## 3. State-by-State Temporal Precision Distribution

| NER State | Total Records | Exact Date (A+B) | Month-Year (C) | Year Only (D) | Unknown (E) |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Arunachal Pradesh** | 1048 | **7** | 110 | 931 | 0 |
| **Assam** | 624 | **45** | 257 | 322 | 0 |
| **Manipur** | 1575 | **1** | 332 | 1242 | 0 |
| **Meghalaya** | 865 | **1** | 235 | 629 | 0 |
| **Mizoram** | 2042 | **2** | 375 | 1665 | 0 |
| **Nagaland** | 1632 | **3** | 206 | 1423 | 0 |
| **Sikkim** | 693 | **7** | 31 | 655 | 0 |
| **Tripura** | 67 | **0** | 13 | 54 | 0 |

---

## 4. Provenance & Target Separation Policy

- **Zero Date Fabrication**: Records with year-only (`D`) or month-year (`C`) precision are NEVER assigned synthetic or guessed day dates.
- **Deduplication Audit**: Spatial-temporal clustering groups raw multi-report entries within $0.05^\circ$ (~5km) into single canonical episodes.
- **Day-Level ML Training Target**: Formed exclusively from verified `A_EXACT_DATETIME` and `B_EXACT_DATE` canonical episodes.

---
*Report generated automatically by V11 Event Corpus Pipeline.*
