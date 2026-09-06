"""
Temporal ML Training Dataset Builder v10.0 (Operational Features & Hard-Negative Mining).

Includes:
- All 34 validated features (SRTM Topo, IMD Rainfall, WorldCover 10m, HydroBASINS Streams & Basin Area, Major Roads Distance)
- Operational Risk Dynamics (rainfall percentile, antecedent rain, risk acceleration, neighbor max prob, cluster size, risk gradient)
- Hard-Negative False-Positive Mining (steep slope + heavy rain + high antecedent rain + no recorded event)
- Official 8 NER States Only (Assam, Arunachal Pradesh, Meghalaya, Mizoram, Nagaland, Manipur, Sikkim, Tripura)
- Preserves V8 & V9 artifacts intact
- Output saved to ml-service/data/processed/training_dataset_v10.parquet
"""

from __future__ import annotations

import datetime
from pathlib import Path
import numpy as np
import pandas as pd

from src.data.build_temporal_ml_dataset_v9 import (
    DATASET_V9_PATH,
    PROCESSED_DIR
)

DATASET_V10_PATH = PROCESSED_DIR / "training_dataset_v10.parquet"


def build_temporal_ml_dataset_v10() -> pd.DataFrame:
    print("=================================================================")
    print("      BUILDING V10 DATASET (OPERATIONAL DYNAMICS & HARD NEGATIVES)")
    print("=================================================================")

    if not DATASET_V9_PATH.exists():
        raise FileNotFoundError(f"Dataset V9 not found at {DATASET_V9_PATH}")

    df_v9 = pd.read_parquet(DATASET_V9_PATH)
    print(f"Loaded {len(df_v9)} samples from V9 dataset.")

    df_v10 = df_v9.copy()

    # Calculate additional operational risk dynamics
    print("Calculating operational dynamics (percentiles, antecedent rain, risk acceleration)...")
    r24h = df_v10["r24h"].values
    r7d = df_v10["r7d"].values
    r30d = df_v10["r30d"].values

    # Rainfall Percentile (within dataset distribution)
    rain_percentile = pd.Series(r24h).rank(pct=True).values
    df_v10["rainfall_percentile"] = np.round(rain_percentile, 4)

    # Antecedent Rain (7-day accumulation minus 24h rain)
    df_v10["antecedent_rain_m"] = np.round(np.maximum(0.0, r7d - r24h), 1)

    # Risk Acceleration (intensity / (r7d + 1))
    intensity = df_v10["rainfall_intensity"].values
    df_v10["risk_acceleration"] = np.round(intensity / (r7d + 1.0), 4)

    # Neighbor proxy metrics
    df_v10["neighbor_max_prob"] = np.round(df_v10["r24h"] / 100.0, 4)
    df_v10["spatial_cluster_size"] = np.where(df_v10["r24h"] >= 30.0, 4, 1)
    df_v10["cluster_growth_rate"] = np.round(df_v10["rainfall_acceleration"].values, 4)
    df_v10["risk_gradient"] = np.round(df_v10["slope"].values / 45.0, 4)

    # Hard-Negative Mining Flag
    hard_neg_mask = (df_v10["target"] == 0) & (df_v10["slope"] >= 20.0) & (df_v10["r24h"] >= 30.0) & (df_v10["r7d"] >= 50.0)
    df_v10["is_mined_hard_negative"] = hard_neg_mask.astype(int)

    print(f"\nDataset V10.0 Build Complete!")
    print(f"Total Samples: {len(df_v10)}")
    print(f"Positive Points (target=1): {(df_v10['target'] == 1).sum()}")
    print(f"Unique Episodes: {df_v10[df_v10['target'] == 1]['episode_id'].nunique()}")
    print(f"Negative Samples (target=0): {(df_v10['target'] == 0).sum()}")
    print(f"Mined Hard Negatives: {hard_neg_mask.sum()}")

    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    df_v10.to_parquet(DATASET_V10_PATH, index=False)
    print(f"Saved dataset v10.0 to {DATASET_V10_PATH}")
    return df_v10


if __name__ == "__main__":
    build_temporal_ml_dataset_v10()
