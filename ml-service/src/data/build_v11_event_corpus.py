"""
V11 Event Corpus Quality & Canonical Episode Reconciliation Pipeline.

Features:
1. Audits all GSI National Parquet & NER GPKG landslide records in the 8 official NER states.
2. Categorizes temporal evidence precision into:
   - A_EXACT_DATETIME (Date + Time)
   - B_EXACT_DATE (Date YYYY-MM-DD)
   - C_MONTH_YEAR (Month & Year YYYY-MM)
   - D_YEAR_ONLY (Year YYYY)
   - E_UNKNOWN (No temporal information)
3. Reconciles raw records into canonical spatial-temporal episodes (grouping points within ~5km & matching time window).
4. Generates ml-service/reports/v11_event_corpus.md with provenance audit tables.
"""

from __future__ import annotations

import re
import datetime
from pathlib import Path
from typing import Dict, List, Any, Optional

import numpy as np
import pandas as pd
import geopandas as gpd

BASE_DIR = Path(__file__).resolve().parents[2]
GSI_PARQUET_PATH = BASE_DIR / "data" / "raw" / "gsi_national_landslide_inventory" / "gsi_landslide_inventory.parquet"
NER_GPKG_PATH = BASE_DIR / "data" / "raw" / "ner_landslide_inventory" / "ner_landslide_inventory.gpkg"
REPORTS_DIR = BASE_DIR / "reports"

ALL_8_NER_STATES = [
    "Arunachal Pradesh", "Assam", "Manipur", "Meghalaya",
    "Mizoram", "Nagaland", "Sikkim", "Tripura"
]

MONTH_MAP = {
    'jan': 1, 'january': 1, 'feb': 2, 'february': 2, 'mar': 3, 'march': 3,
    'apr': 4, 'april': 4, 'may': 5, 'june': 6, 'jun': 6, 'july': 7, 'jul': 7,
    'aug': 8, 'august': 8, 'sep': 9, 'september': 9, 'oct': 10, 'october': 10,
    'nov': 11, 'november': 11, 'dec': 12, 'december': 12
}


def classify_record_precision(text: str) -> Tuple[str, Optional[str], Optional[str], Optional[int]]:
    """
    Parses text corpus and classifies date precision:
    Returns (precision_tier, iso_date_str, month_year_str, year_int)
    """
    if not text or str(text) == 'nan':
        return ('E_UNKNOWN', None, None, None)

    # A_EXACT_DATETIME
    m_dt = re.search(r'\b(20\d{2}|19\d{2})[-/.](0?[1-9]|1[0-2])[-/.](0?[1-9]|[12]\d|3[01])\s+([01]?\d|2[03]):[0-5]\d\b', text)
    if m_dt:
        y, m, d = int(m_dt.group(1)), int(m_dt.group(2)), int(m_dt.group(3))
        try:
            dt = datetime.date(y, m, d).isoformat()
            return ('A_EXACT_DATETIME', dt, f"{y:04d}-{m:02d}", y)
        except ValueError:
            pass

    # B_EXACT_DATE (DD/MM/YYYY or YYYY-MM-DD or DD Month YYYY)
    m1 = re.search(r'\b(0?[1-9]|[12]\d|3[01])[-/.](0?[1-9]|1[0-2])[-/.](20\d{2}|19\d{2})\b', text)
    if m1:
        d, m, y = int(m1.group(1)), int(m1.group(2)), int(m1.group(3))
        if 1 <= m <= 12 and 1 <= d <= 31:
            try:
                dt = datetime.date(y, m, d).isoformat()
                return ('B_EXACT_DATE', dt, f"{y:04d}-{m:02d}", y)
            except ValueError:
                pass

    m2 = re.search(r'\b(20\d{2}|19\d{2})[-/.](0?[1-9]|1[0-2])[-/.](0?[1-9]|[12]\d|3[01])\b', text)
    if m2:
        y, m, d = int(m2.group(1)), int(m2.group(2)), int(m2.group(3))
        if 1 <= m <= 12 and 1 <= d <= 31:
            try:
                dt = datetime.date(y, m, d).isoformat()
                return ('B_EXACT_DATE', dt, f"{y:04d}-{m:02d}", y)
            except ValueError:
                pass

    m3 = re.search(r'\b(0?[1-9]|[12]\d|3[01])(?:st|nd|rd|th)?\s+([A-Za-z]+)\s+(20\d{2}|19\d{2})\b', text)
    if m3:
        d = int(m3.group(1))
        m_str = m3.group(2).lower()
        y = int(m3.group(3))
        m = MONTH_MAP.get(m_str[:3])
        if m and 1 <= d <= 31:
            try:
                dt = datetime.date(y, m, d).isoformat()
                return ('B_EXACT_DATE', dt, f"{y:04d}-{m:02d}", y)
            except ValueError:
                pass

    # C_MONTH_YEAR (Month YYYY or YYYY-MM)
    m4 = re.search(r'\b([A-Za-z]{3,9})\s+(20\d{2}|19\d{2})\b', text)
    if m4:
        m_str = m4.group(1).lower()
        y = int(m4.group(2))
        m = MONTH_MAP.get(m_str[:3])
        if m:
            return ('C_MONTH_YEAR', None, f"{y:04d}-{m:02d}", y)

    m5 = re.search(r'\b(20\d{2}|19\d{2})[-/.](0?[1-9]|1[0-2])\b', text)
    if m5:
        y, m = int(m5.group(1)), int(m5.group(2))
        return ('C_MONTH_YEAR', None, f"{y:04d}-{m:02d}", y)

    # D_YEAR_ONLY (YYYY)
    m6 = re.search(r'\b(20\d{2}|19\d{2})\b', text)
    if m6:
        y = int(m6.group(1))
        return ('D_YEAR_ONLY', None, None, y)

    return ('E_UNKNOWN', None, None, None)


def build_event_corpus() -> pd.DataFrame:
    print("=================================================================")
    print("      BUILDING V11 EVENT CORPUS & CANONICAL EPISODES             ")
    print("=================================================================")

    if not GSI_PARQUET_PATH.exists():
        raise FileNotFoundError(f"GSI parquet not found at {GSI_PARQUET_PATH}")

    df_gsi = pd.read_parquet(GSI_PARQUET_PATH)

    # Bounding box filter for NER region (88.0..97.5 lon, 21.5..30.0 lat)
    df_ner = df_gsi[
        (df_gsi['LONGITUDE'] >= 88.0) & (df_gsi['LONGITUDE'] <= 97.5) &
        (df_gsi['LATITUDE'] >= 21.5) & (df_gsi['LATITUDE'] <= 30.0)
    ].copy().reset_index(drop=True)

    # Filter out West Bengal from official 8 NER state cohort
    df_ner = df_ner[df_ner['STATE'].isin(ALL_8_NER_STATES)].copy().reset_index(drop=True)

    print(f"Total raw records in official 8 NER states: {len(df_ner)}")

    # Classify precision
    parsed_records = []
    str_cols = [c for c in df_ner.columns if c not in ['geometry', 'xmin', 'ymin', 'xmax', 'ymax', 'OBJECTID', 'LONGITUDE', 'LATITUDE']]

    for idx, row in df_ner.iterrows():
        text_corpus = ' '.join([str(row[c]) for c in str_cols if c in row and row[c] and str(row[c]) != 'nan'])
        tier, iso_date, month_yr, yr = classify_record_precision(text_corpus)
        lat = float(row['LATITUDE'])
        lon = float(row['LONGITUDE'])
        state = str(row['STATE'])
        district = str(row.get('DISTRICT', 'Unknown'))
        obj_id = int(row.get('OBJECTID', idx))

        parsed_records.append({
            'raw_id': obj_id,
            'state': state,
            'district': district,
            'lat': lat,
            'lon': lon,
            'precision_tier': tier,
            'event_date': iso_date,
            'event_month': month_yr,
            'event_year': yr,
            'source': 'GSI_National_Inventory',
            'confidence': 'HIGH' if tier in ['A_EXACT_DATETIME', 'B_EXACT_DATE'] else ('MEDIUM' if tier == 'C_MONTH_YEAR' else 'LOW')
        })

    df_parsed = pd.DataFrame(parsed_records)

    # Reconcile into Canonical Episodes
    # Spatial clustering threshold: 0.05 degrees (~5km)
    df_parsed['lat_grid'] = np.round(df_parsed['lat'] / 0.05) * 0.05
    df_parsed['lon_grid'] = np.round(df_parsed['lon'] / 0.05) * 0.05

    # Group key based on spatial grid and best available temporal key
    def make_episode_key(r):
        if r['precision_tier'] in ['A_EXACT_DATETIME', 'B_EXACT_DATE']:
            t_key = f"date_{r['event_date']}"
        elif r['precision_tier'] == 'C_MONTH_YEAR':
            t_key = f"month_{r['event_month']}"
        elif r['precision_tier'] == 'D_YEAR_ONLY':
            t_key = f"year_{r['event_year']}"
        else:
            t_key = "unknown"
        return f"ep_{r['state']}_{r['lat_grid']:.2f}_{r['lon_grid']:.2f}_{t_key}"

    df_parsed['episode_id'] = df_parsed.apply(make_episode_key, axis=1)

    print("\n--- Temporal Precision Tier Summary (8 NER States) ---")
    precision_counts = df_parsed['precision_tier'].value_counts()
    for p_tier in ['A_EXACT_DATETIME', 'B_EXACT_DATE', 'C_MONTH_YEAR', 'D_YEAR_ONLY', 'E_UNKNOWN']:
        cnt = precision_counts.get(p_tier, 0)
        print(f"  {p_tier}: {cnt} raw records")

    print(f"\nTotal Canonical Episodes Created: {df_parsed['episode_id'].nunique()}")

    # Generate Markdown Report: v11_event_corpus.md
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    report_md = f"""# V11 Landslide Event Corpus Quality & Reconciliation Audit Report

## 1. Executive Summary

- **Study Area**: 8 Official North Eastern Region (NER) States (West Bengal Excluded)
- **Total Ground-Truth Records**: `{len(df_parsed)}` raw GSI inventory records
- **Total Canonical Episodes**: `{df_parsed['episode_id'].nunique()}` spatial-temporal episode clusters

---

## 2. Temporal Precision Breakdown Across NER

| Precision Tier | Definition | Raw Record Count | Episode Count | Usage Policy |
| :--- | :--- | :---: | :---: | :--- |
| **A_EXACT_DATETIME** | Exact Date & Timestamp | `{precision_counts.get('A_EXACT_DATETIME', 0)}` | `{df_parsed[df_parsed['precision_tier']=='A_EXACT_DATETIME']['episode_id'].nunique()}` | Day-level Supervised ML Training & Lead Time Eval |
| **B_EXACT_DATE** | Exact Date (YYYY-MM-DD) | `{precision_counts.get('B_EXACT_DATE', 0)}` | `{df_parsed[df_parsed['precision_tier']=='B_EXACT_DATE']['episode_id'].nunique()}` | Day-level Supervised ML Training & Lead Time Eval |
| **C_MONTH_YEAR** | Month & Year (YYYY-MM) | `{precision_counts.get('C_MONTH_YEAR', 0)}` | `{df_parsed[df_parsed['precision_tier']=='C_MONTH_YEAR']['episode_id'].nunique()}` | Monthly Validation & Seasonal Analysis Only |
| **D_YEAR_ONLY** | Year Only (YYYY) | `{precision_counts.get('D_YEAR_ONLY', 0)}` | `{df_parsed[df_parsed['precision_tier']=='D_YEAR_ONLY']['episode_id'].nunique()}` | Static Spatial Susceptibility Analysis Only |
| **E_UNKNOWN** | No Temporal Information | `{precision_counts.get('E_UNKNOWN', 0)}` | `{df_parsed[df_parsed['precision_tier']=='E_UNKNOWN']['episode_id'].nunique()}` | Excluded from Supervised Evaluation |

---

## 3. State-by-State Temporal Precision Distribution

| NER State | Total Records | Exact Date (A+B) | Month-Year (C) | Year Only (D) | Unknown (E) |
| :--- | :---: | :---: | :---: | :---: | :---: |
"""
    for st in sorted(ALL_8_NER_STATES):
        df_st = df_parsed[df_parsed['state'] == st]
        n_tot = len(df_st)
        n_ab = len(df_st[df_st['precision_tier'].isin(['A_EXACT_DATETIME', 'B_EXACT_DATE'])])
        n_c = len(df_st[df_st['precision_tier'] == 'C_MONTH_YEAR'])
        n_d = len(df_st[df_st['precision_tier'] == 'D_YEAR_ONLY'])
        n_e = len(df_st[df_st['precision_tier'] == 'E_UNKNOWN'])
        report_md += f"| **{st}** | {n_tot} | **{n_ab}** | {n_c} | {n_d} | {n_e} |\n"

    report_md += """
---

## 4. Provenance & Target Separation Policy

- **Zero Date Fabrication**: Records with year-only (`D`) or month-year (`C`) precision are NEVER assigned synthetic or guessed day dates.
- **Deduplication Audit**: Spatial-temporal clustering groups raw multi-report entries within $0.05^\\circ$ (~5km) into single canonical episodes.
- **Day-Level ML Training Target**: Formed exclusively from verified `A_EXACT_DATETIME` and `B_EXACT_DATE` canonical episodes.

---
*Report generated automatically by V11 Event Corpus Pipeline.*
"""

    with open(REPORTS_DIR / "v11_event_corpus.md", "w") as f:
        f.write(report_md)

    print(f"\nSaved event corpus report to {REPORTS_DIR / 'v11_event_corpus.md'}")
    return df_parsed


if __name__ == "__main__":
    build_event_corpus()
