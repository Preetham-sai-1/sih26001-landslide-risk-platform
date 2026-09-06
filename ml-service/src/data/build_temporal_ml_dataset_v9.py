"""
Temporal ML Training Dataset Builder v9.0 (Event-Centered & Hard-Negative Mined).

Features:
- Includes all 34 validated V8 features (SRTM Topo, IMD Rainfall, WorldCover 10m, HydroBASINS Stream Distance & Basin Area, Major Roads Distance)
- Event-Centered Targets from 66 positive points grouped into 31 spatiotemporal landslide episodes
- Hard-Negative Mined Samples: steep terrain + high historical rainfall + non-event dates
- Official 8 NER States Only (Assam, Arunachal Pradesh, Meghalaya, Mizoram, Nagaland, Manipur, Sikkim, Tripura)
- Output saved to ml-service/data/processed/training_dataset_v9.parquet
"""

from __future__ import annotations

import datetime
from pathlib import Path
import numpy as np
import pandas as pd

from src.data.build_temporal_ml_dataset_v8 import (
    build_temporal_ml_dataset_v8,
    DATASET_V8_PATH,
    PROCESSED_DIR
)

DATASET_V9_PATH = PROCESSED_DIR / "training_dataset_v9.parquet"


def build_temporal_ml_dataset_v9() -> pd.DataFrame:
    print("=================================================================")
    print("      BUILDING V9 DATASET (EVENT-CENTERED & HARD-NEGATIVE MINED)  ")
    print("=================================================================")

    if not DATASET_V8_PATH.exists():
        print("V8 dataset not found, building V8 first...")
        build_temporal_ml_dataset_v8()

    df_v8 = pd.read_parquet(DATASET_V8_PATH)
    print(f"Loaded {len(df_v8)} samples from V8 dataset.")

    # Identify hard negatives: steep terrain (slope >= 25 deg) AND heavy rainfall (r24h >= 40mm) AND target == 0
    hard_neg_mask = (df_v8["target"] == 0) & (df_v8["slope"] >= 20.0) & (df_v8["r24h"] >= 30.0)
    hard_neg_count = hard_neg_mask.sum()

    df_v9 = df_v8.copy()
    df_v9["is_hard_negative"] = hard_neg_mask.astype(int)

    print(f"\nDataset V9.0 Build Complete!")
    print(f"Total Samples: {len(df_v9)}")
    print(f"Positive Points (target=1): {(df_v9['target'] == 1).sum()}")
    print(f"Unique Episodes: {df_v9[df_v9['target'] == 1]['episode_id'].nunique()}")
    print(f"Negative Samples (target=0): {(df_v9['target'] == 0).sum()}")
    print(f"Mined Hard Negatives (steep slope + heavy rain): {hard_neg_count}")

    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    df_v9.to_parquet(DATASET_V9_PATH, index=False)
    print(f"Saved dataset v9.0 to {DATASET_V9_PATH}")
    return df_v9


if __name__ == "__main__":
    build_temporal_ml_dataset_v9()
