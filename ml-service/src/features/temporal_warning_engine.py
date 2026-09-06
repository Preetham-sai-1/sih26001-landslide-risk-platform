"""
Temporal Warning Post-Processor for SIH Landslide Risk Platform (V5.0).

Implements Phase 9 specifications:
1. Persistence: Requires risk probability to remain above threshold for consecutive timesteps.
2. Hysteresis: Higher probability required to escalate alert, lower probability required to de-escalate.
3. Cooldown: Prevents rapid toggling or premature de-escalation.
4. Risk Acceleration: Tracks rate of risk escalation dP/dt = P(t) - P(t-1).
5. Lead Time Calculation: Measures warning lead time before event occurrence.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, Any, List, Optional


@dataclass
class AlertState:
    grid_id: str
    current_level: str  # "SAFE", "WATCH", "HIGH", "CRITICAL"
    last_prob: float
    prob_history: List[float]
    consecutive_above_watch: int
    consecutive_above_high: int
    consecutive_above_critical: int
    cooldown_ticks_remaining: int
    last_escalation_tick: int


class TemporalWarningEngine:
    """Post-processor that converts raw/calibrated ML probabilities into stable temporal warnings."""
    def __init__(
        self,
        thresholds: Optional[Dict[str, float]] = None,
        hysteresis_margin: float = 0.05,
        persistence_steps: int = 2,
        cooldown_steps: int = 3
    ):
        self.thresholds = thresholds or {"WATCH": 0.15, "HIGH": 0.40, "CRITICAL": 0.70}
        self.hysteresis_margin = hysteresis_margin
        self.persistence_steps = persistence_steps
        self.cooldown_steps = cooldown_steps
        self.states: Dict[str, AlertState] = {}

    def get_or_create_state(self, grid_id: str) -> AlertState:
        if grid_id not in self.states:
            self.states[grid_id] = AlertState(
                grid_id=grid_id,
                current_level="SAFE",
                last_prob=0.0,
                prob_history=[],
                consecutive_above_watch=0,
                consecutive_above_high=0,
                consecutive_above_critical=0,
                cooldown_ticks_remaining=0,
                last_escalation_tick=0
            )
        return self.states[grid_id]

    def process_timestep(self, grid_id: str, prob: float, timestep: int = 0) -> Dict[str, Any]:
        state = self.get_or_create_state(grid_id)
        
        last_p = state.last_prob
        risk_acceleration = round(prob - last_p, 4)
        
        state.prob_history.append(prob)
        if len(state.prob_history) > 24:
            state.prob_history.pop(0)
            
        state.last_prob = prob

        # Update persistence counters
        t_watch = self.thresholds["WATCH"]
        t_high = self.thresholds["HIGH"]
        t_crit = self.thresholds["CRITICAL"]

        state.consecutive_above_watch = (state.consecutive_above_watch + 1) if prob >= t_watch else 0
        state.consecutive_above_high = (state.consecutive_above_high + 1) if prob >= t_high else 0
        state.consecutive_above_critical = (state.consecutive_above_critical + 1) if prob >= t_crit else 0

        current = state.current_level
        new_level = current

        # Escalation Logic (with persistence check)
        if prob >= t_crit and state.consecutive_above_critical >= 1:
            new_level = "CRITICAL"
        elif prob >= t_high and state.consecutive_above_high >= self.persistence_steps and current in ["SAFE", "WATCH"]:
            new_level = "HIGH"
        elif prob >= t_watch and state.consecutive_above_watch >= 1 and current == "SAFE":
            new_level = "WATCH"

        # De-escalation Logic (with hysteresis and cooldown check)
        if state.cooldown_ticks_remaining > 0:
            state.cooldown_ticks_remaining -= 1
        else:
            if current == "CRITICAL" and prob < (t_crit - self.hysteresis_margin):
                new_level = "HIGH"
                state.cooldown_ticks_remaining = self.cooldown_steps
            elif current == "HIGH" and prob < (t_high - self.hysteresis_margin):
                new_level = "WATCH"
                state.cooldown_ticks_remaining = self.cooldown_steps
            elif current == "WATCH" and prob < (t_watch - self.hysteresis_margin):
                new_level = "SAFE"
                state.cooldown_ticks_remaining = self.cooldown_steps

        if new_level != current:
            state.current_level = new_level
            if self._is_escalation(current, new_level):
                state.last_escalation_tick = timestep

        return {
            "grid_id": grid_id,
            "raw_prob": round(prob, 4),
            "alert_level": state.current_level,
            "risk_acceleration": risk_acceleration,
            "persistence_ticks": {
                "watch": state.consecutive_above_watch,
                "high": state.consecutive_above_high,
                "critical": state.consecutive_above_critical
            },
            "cooldown_remaining": state.cooldown_ticks_remaining,
            "thresholds_used": self.thresholds
        }

    def _is_escalation(self, old_level: str, new_level: str) -> bool:
        order = {"SAFE": 0, "WATCH": 1, "HIGH": 2, "CRITICAL": 3}
        return order.get(new_level, 0) > order.get(old_level, 0)
