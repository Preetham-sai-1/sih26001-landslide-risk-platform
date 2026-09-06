"""
Temporal ML Training Dataset Builder v11.0 (Model Coverage Index & Event Expansion).

Includes:
- All 34 validated features (SRTM Topo, IMD Rainfall, WorldCover 10m, HydroBASINS Line Streams, Major Roads)
- Operational Risk Dynamics (rainfall percentile, antecedent rain, risk acceleration, neighbor max prob, cluster size, risk gradient)
- Model Coverage Index (0.0 - 1.0) & Tier ('HIGH', 'LIMITED', 'LOW') per state & cell location
- Hard-Negative False-Positive Mining (sampled strictly inside training windows < 2018)
- Preserves V8, V9, and V10 artifacts intact
- Output saved to ml-service/data/processed/training_dataset_v11.parquet
"""

from __future__ import annotations

from pathlib import Path
import numpy as np
import pandas as pd

from src.data.build_temporal_ml_dataset_v10 import DATASET_V10_PATH, PROCESSED_DIR

DATASET_V11_PATH = PROCESSED_DIR / "training_dataset_v11.parquet"

ALL_8_NER_STATES = [
    "Arunachal Pradesh", "Assam", "Manipur", "Meghalaya",
    "Mizoram", "Nagaland", "Sikkim", "Tripura"
]


def calculate_model_coverage_score(state: str, state_event_count: int, state_sample_count: int) -> Tuple[float, str]:
    """
    Calculates mathematical Model Coverage Index (0.0 - 1.0) based on training evidence support:
    - Coverage_Index = min(1.0, 0.40 * (N_events / 10) + 0.40 * (N_samples / 500) + 0.20 * feature_availability)
    - Tiers: HIGH (>= 0.70), LIMITED (0.30 - 0.69), LOW (< 0.30)
    """
    ev_score = min(1.0, state_event_count / 10.0)
    samp_score = min(1.0, state_sample_count / 500.0)
    feat_score = 1.0  # Full 34-feature availability across NER

    coverage_index = round(float(0.40 * ev_score + 0.40 * samp_score + 0.20 * feat_score), 4)

    if coverage_index >= 0.70:
        tier = "HIGH"
    elif coverage_index >= 0.30:
        tier = "LIMITED"
    else:
        tier = "LOW"

    return coverage_index, tier


def build_temporal_ml_dataset_v11() -> pd.DataFrame:
    print("=================================================================")
    print("      BUILDING V11 DATASET (MODEL COVERAGE INDEX & HARD NEGATIVES)")
    print("=================================================================")

    if not DATASET_V10_PATH.exists():
        raise FileNotFoundError(f"Dataset V10 not found at {DATASET_V10_PATH}")

    df_v10 = pd.read_parquet(DATASET_V10_PATH)
    print(f"Loaded {len(df_v10)} samples from V10 dataset.")

    df_v11 = df_v10.copy()
    df_v11["year"] = pd.to_datetime(df_v11["sample_date"]).dt.year

    # Calculate training window state event and sample counts (< 2018)
    df_tr = df_v11[df_v11["year"] < 2018]
    state_event_counts = df_tr[df_tr["target"] == 1].groupby("state")["episode_id"].nunique().to_dict()
    state_sample_counts = df_tr.groupby("state").size().to_dict()

    print("\nTraining Evidence Support & Model Coverage Index by State:")
    coverage_scores = []
    coverage_tiers = []

    for idx, row in df_v11.iterrows():
        st = str(row.get("state", "Assam"))
        ev_cnt = state_event_counts.get(st, 0)
        samp_cnt = state_sample_counts.get(st, 0)
        c_score, c_tier = calculate_model_coverage_score(st, ev_cnt, samp_cnt)
        coverage_scores.append(c_score)
        coverage_tiers.append(c_tier)

    df_v11["coverage_score"] = coverage_scores
    df_v11["model_coverage"] = coverage_tiers

    for st in sorted(ALL_8_NER_STATES):
        ev_c = state_event_counts.get(st, 0)
        sa_c = state_sample_counts.get(st, 0)
        sc, tr = calculate_model_coverage_score(st, ev_c, sa_c)
        print(f"  {st}: Training Events={ev_c}, Samples={sa_c} -> Coverage Score={sc} ({tr})")

    # Ensure hard negative mining flag is strictly confined to training window (< 2018)
    hard_neg_mask = (df_v11["target"] == 0) & (df_v11["slope"] >= 20.0) & (df_v11["r24h"] >= 30.0) & (df_v11["r7d"] >= 50.0) & (df_v11["year"] < 2018)
    df_v11["is_mined_hard_negative"] = hard_neg_mask.astype(int)

    print(f"\nDataset V11.0 Build Complete!")
    print(f"Total Samples: {len(df_v11)}")
    print(f"Positive Points (target=1): {(df_v11['target'] == 1).sum()}")
    print(f"Unique Episodes: {df_v11[df_v11['target'] == 1]['episode_id'].nunique()}")
    print(f"Negative Samples (target=0): {(df_v11['target'] == 0).sum()}")
    print(f"Training Mined Hard Negatives (< 2018): {hard_neg_mask.sum()}")

    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    df_v11.to_parquet(DATASET_V11_PATH, index=False)
    print(f"Saved dataset v11.0 to {DATASET_V11_PATH}")
    return df_v11


if __name__ == "__main__":
    build_temporal_ml_dataset_v11()
