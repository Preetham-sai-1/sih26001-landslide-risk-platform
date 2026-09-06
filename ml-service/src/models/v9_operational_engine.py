"""
V9 Production-Oriented Landslide Early-Warning Operational Decision Engine.

Pipeline:
1. Raw Model Probability -> Isotonic Calibration
2. Temporal Risk Persistence (EMA Smoothing)
3. Spatial Neighbor Smoothing & Cluster Metric Calculation
4. Hazard Score Generation (0 - 100)
5. Hysteresis Incident State Machine (NORMAL -> WATCH -> HIGH -> CRITICAL -> VERIFICATION -> CONFIRMED -> RESOLVED)
6. Data Quality Layer (GOOD / DEGRADED / OFFLINE)
7. Prediction vs Verification Separation (predicted_risk != observed_landslide)
8. Structured Alert Explanations & Driver Payloads
"""

from __future__ import annotations

import datetime
from enum import Enum
from typing import Dict, List, Any, Optional, Tuple
import numpy as np


class OperationalSeverity(str, Enum):
    NORMAL = "NORMAL"
    WATCH = "WATCH"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class IncidentState(str, Enum):
    NORMAL = "NORMAL"
    WATCH = "WATCH"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"
    VERIFICATION = "VERIFICATION"
    CONFIRMED = "CONFIRMED"
    RESOLVED = "RESOLVED"


class DataQualityStatus(str, Enum):
    GOOD = "GOOD"
    DEGRADED = "DEGRADED"
    OFFLINE = "OFFLINE"


class VerificationStatus(str, Enum):
    UNVERIFIED = "UNVERIFIED"
    IN_PROGRESS = "IN_PROGRESS"
    CONFIRMED = "CONFIRMED"
    DISPROVED = "DISPROVED"


class V9OperationalEngine:
    """Operational Decision Engine managing thresholds, persistence, hysteresis, state machine, and data quality."""

    def __init__(
        self,
        thresholds: Dict[str, float],
        calibrator: Any = None,
        persistence_alpha: float = 0.6,
        hysteresis_delta: float = 0.05,
        deescalation_buffer_steps: int = 2
    ):
        self.thresholds = thresholds
        self.calibrator = calibrator
        self.persistence_alpha = persistence_alpha
        self.hysteresis_delta = hysteresis_delta
        self.deescalation_buffer_steps = deescalation_buffer_steps

        # Internal state tracking per cell/location ID
        self.cell_history: Dict[str, List[float]] = {}
        self.cell_states: Dict[str, IncidentState] = {}
        self.cell_deescalation_counts: Dict[str, int] = {}
        self.cell_verifications: Dict[str, VerificationStatus] = {}

    def get_data_quality_status(self, obs: Dict[str, Any]) -> DataQualityStatus:
        """Determines operational data quality from observation fields."""
        if obs.get("offline", False) or obs.get("missing_feed", False):
            return DataQualityStatus.OFFLINE
        if obs.get("sensor_degraded", False) or obs.get("missing_rain_1h", False):
            return DataQualityStatus.DEGRADED
        return DataQualityStatus.GOOD

    def calibrate_probability(self, raw_prob: float) -> float:
        """Applies isotonic probability calibration."""
        if self.calibrator is not None:
            try:
                cal_p = float(self.calibrator.transform([raw_prob])[0])
                return max(0.0, min(1.0, cal_p))
            except Exception:
                pass
        return max(0.0, min(1.0, raw_prob))

    def apply_temporal_persistence(self, cell_id: str, current_prob: float) -> float:
        """Applies Exponential Moving Average (EMA) to prevent single-step transient spikes."""
        if cell_id not in self.cell_history or len(self.cell_history[cell_id]) == 0:
            persisted = current_prob
            self.cell_history[cell_id] = [current_prob]
        else:
            prev = self.cell_history[cell_id][-1]
            persisted = self.persistence_alpha * current_prob + (1.0 - self.persistence_alpha) * prev
            self.cell_history[cell_id].append(persisted)
            if len(self.cell_history[cell_id]) > 10:
                self.cell_history[cell_id].pop(0)
        return float(persisted)

    def compute_spatial_clustering(self, cell_id: str, neighbor_probs: List[float]) -> Tuple[float, int, float]:
        """Computes spatial neighbor mean probability, cluster size above WATCH threshold, and risk gradient."""
        if not neighbor_probs:
            return 0.0, 1, 0.0
        n_mean = float(np.mean(neighbor_probs))
        t_watch = self.thresholds.get("WATCH", 0.01)
        cluster_size = int((np.array(neighbor_probs) >= t_watch).sum()) + 1
        gradient = float(np.max(neighbor_probs) - np.min(neighbor_probs)) if len(neighbor_probs) > 1 else 0.0
        return n_mean, cluster_size, gradient

    def update_incident_state_machine(
        self,
        cell_id: str,
        persisted_prob: float,
        manual_verification: Optional[VerificationStatus] = None
    ) -> Tuple[OperationalSeverity, IncidentState]:
        """Manages state transitions with hysteresis buffers and prediction/verification separation."""
        current_state = self.cell_states.get(cell_id, IncidentState.NORMAL)
        t_watch = self.thresholds.get("WATCH", 0.01)
        t_high = self.thresholds.get("HIGH", 0.30)
        t_crit = self.thresholds.get("CRITICAL", 0.65)

        # Process manual ground-truth verification override if provided
        if manual_verification is not None:
            self.cell_verifications[cell_id] = manual_verification
            if manual_verification == VerificationStatus.CONFIRMED:
                self.cell_states[cell_id] = IncidentState.CONFIRMED
                return OperationalSeverity.CRITICAL, IncidentState.CONFIRMED
            elif manual_verification == VerificationStatus.DISPROVED:
                self.cell_states[cell_id] = IncidentState.RESOLVED
                return OperationalSeverity.NORMAL, IncidentState.RESOLVED

        # Target severity based on current probability
        if persisted_prob >= t_crit:
            target_sev = OperationalSeverity.CRITICAL
            target_state = IncidentState.CRITICAL
        elif persisted_prob >= t_high:
            target_sev = OperationalSeverity.HIGH
            target_state = IncidentState.HIGH
        elif persisted_prob >= t_watch:
            target_sev = OperationalSeverity.WATCH
            target_state = IncidentState.WATCH
        else:
            target_sev = OperationalSeverity.NORMAL
            target_state = IncidentState.NORMAL

        STATE_RANKS = {
            IncidentState.NORMAL: 0,
            IncidentState.WATCH: 1,
            IncidentState.HIGH: 2,
            IncidentState.CRITICAL: 3,
            IncidentState.VERIFICATION: 4,
            IncidentState.CONFIRMED: 5,
            IncidentState.RESOLVED: 0
        }

        curr_rank = STATE_RANKS.get(current_state, 0)
        target_rank = STATE_RANKS.get(target_state, 0)

        # Upward transition: Immediate escalation
        if target_rank > curr_rank and current_state not in [IncidentState.VERIFICATION, IncidentState.CONFIRMED]:
            self.cell_states[cell_id] = target_state
            self.cell_deescalation_counts[cell_id] = 0
            return target_sev, target_state

        # Downward transition: Apply hysteresis buffer
        elif target_rank < curr_rank and current_state not in [IncidentState.CONFIRMED]:
            # Hysteresis buffer check: must drop below (threshold - delta)
            t_current = self.thresholds.get(current_state.value, 0.01)
            if persisted_prob < (t_current - self.hysteresis_delta):
                deescalation_cnt = self.cell_deescalation_counts.get(cell_id, 0) + 1
                self.cell_deescalation_counts[cell_id] = deescalation_cnt
                if deescalation_cnt >= self.deescalation_buffer_steps:
                    self.cell_states[cell_id] = target_state
                    self.cell_deescalation_counts[cell_id] = 0
                    return target_sev, target_state
                else:
                    # Retain current state during buffer period
                    current_sev = OperationalSeverity(current_state.value) if current_state.value in OperationalSeverity.__members__ else OperationalSeverity.WATCH
                    return current_sev, current_state
            else:
                self.cell_deescalation_counts[cell_id] = 0

        current_sev = OperationalSeverity(current_state.value) if current_state.value in OperationalSeverity.__members__ else OperationalSeverity.NORMAL
        return current_sev, current_state

    def process_cell_observation(
        self,
        cell_id: str,
        raw_prob: float,
        obs_data: Dict[str, Any],
        neighbor_probs: Optional[List[float]] = None
    ) -> Dict[str, Any]:
        """Main operational pipeline processing an observation and generating an alert explanation payload."""
        dq_status = self.get_data_quality_status(obs_data)

        # OFFLINE mode handling: NEVER trigger false alarm or assume zero risk
        if dq_status == DataQualityStatus.OFFLINE:
            prev_state = self.cell_states.get(cell_id, IncidentState.NORMAL)
            prev_prob = self.cell_history.get(cell_id, [0.0])[-1] if cell_id in self.cell_history else 0.0
            return {
                "cell_id": cell_id,
                "data_quality": DataQualityStatus.OFFLINE.value,
                "raw_probability": None,
                "calibrated_probability": prev_prob,
                "hazard_score": round(prev_prob * 100.0, 1),
                "operational_severity": "OFFLINE_HOLD",
                "incident_state": prev_state.value,
                "alert_headline": f"DATA OFFLINE — Preserving last known state ({prev_state.value})",
                "verification_status": self.cell_verifications.get(cell_id, VerificationStatus.UNVERIFIED).value,
                "predicted_risk_is_observed_landslide": False
            }

        # 1. Calibrate & Persist
        calib_p = self.calibrate_probability(raw_prob)
        persisted_p = self.apply_temporal_persistence(cell_id, calib_p)

        # 2. Spatial Neighbors
        n_mean, cluster_size, gradient = self.compute_spatial_clustering(cell_id, neighbor_probs or [])

        # 3. Combined Hazard Score (0 - 100)
        smoothed_p = 0.85 * persisted_p + 0.15 * n_mean
        hazard_score = round(max(0.0, min(100.0, smoothed_p * 100.0)), 1)

        # 4. Hysteresis State Machine
        manual_verif = obs_data.get("manual_verification", None)
        op_severity, inc_state = self.update_incident_state_machine(cell_id, smoothed_p, manual_verif)

        # 5. Temporal Trend
        history = self.cell_history.get(cell_id, [])
        if len(history) >= 2:
            diff = history[-1] - history[-2]
            trend = "ESCALATING" if diff > 0.02 else ("DE-ESCALATING" if diff < -0.02 else "STABLE")
        else:
            trend = "STABLE"

        verif_status = self.cell_verifications.get(cell_id, VerificationStatus.UNVERIFIED)

        # 6. Structured Explanation Payload
        payload = {
            "cell_id": cell_id,
            "timestamp": obs_data.get("timestamp", datetime.datetime.now().isoformat()),
            "data_quality": dq_status.value,
            "raw_probability": round(raw_prob, 4),
            "calibrated_probability": round(calib_p, 4),
            "persisted_probability": round(persisted_p, 4),
            "hazard_score": hazard_score,
            "operational_severity": op_severity.value,
            "incident_state": inc_state.value,
            "verification_status": verif_status.value,
            "predicted_risk_is_observed_landslide": False,  # Explicit separation
            "spatial_metrics": {
                "neighbor_mean_prob": round(n_mean, 4),
                "cluster_size_cells": cluster_size,
                "risk_gradient": round(gradient, 4)
            },
            "temporal_trend": trend,
            "drivers": {
                "rainfall_24h_mm": obs_data.get("r24h", 0.0),
                "rainfall_intensity": obs_data.get("rainfall_intensity", 0.0),
                "terrain_slope_deg": obs_data.get("slope", 0.0),
                "land_cover": obs_data.get("worldcover_class", "Tree cover")
            },
            "alert_headline": f"V9 ALERT [{op_severity.value}] — Hazard Score {hazard_score}/100 ({trend})"
        }
        return payload
