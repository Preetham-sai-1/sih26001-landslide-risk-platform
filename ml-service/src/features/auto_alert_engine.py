"""
Threshold-Based Automatic Alert Engine for SIH Landslide Risk Platform.
Handles deterministic risk evaluation against prototype thresholds, persistence protection,
cooldown deduplication, state transitions, and delivery simulation.
"""

from datetime import datetime, timezone
from typing import Dict, List, Optional, Any


# Configurable Prototype Thresholds
DEFAULT_THRESHOLDS = {
    "WATCH_THRESHOLD": 60.0,
    "HIGH_THRESHOLD": 75.0,
    "VERY_HIGH_THRESHOLD": 85.0,
    "AUTO_ALERT_THRESHOLD": 85.0,
    "CONSECUTIVE_CYCLES_REQUIRED": 2,
    "MAJOR_JUMP_THRESHOLD": 8.0,
    "COOLDOWN_MINUTES": 30,
    "DISPLAY_LABEL": "Prototype Alert Threshold",
    "DISCLAIMER": "Prototype alert thresholds for decision-support evaluation. Non-official government warning."
}

# Alert States: NORMAL, WATCH, ESCALATING, ALERT_PENDING, AUTO_ALERTED, ACKNOWLEDGED, RESOLVED
ALERT_STATES = [
    "NORMAL",
    "WATCH",
    "ESCALATING",
    "ALERT_PENDING",
    "AUTO_ALERTED",
    "ACKNOWLEDGED",
    "RESOLVED"
]


class AutoAlertRecord:
    """Represents a generated automatic alert."""
    def __init__(
        self,
        alert_id: str,
        grid_id: str,
        zone_name: str,
        state_name: str,
        district_name: str,
        previous_probability: float,
        current_probability: float,
        risk_level: str,
        trigger_factors: List[str],
        affected_infrastructure: List[str],
        affected_population: int,
        recommended_action: str,
        trigger_reason: str,
        is_auto: bool = True,
        is_demo: bool = True
    ):
        self.id = alert_id
        self.grid_id = grid_id
        self.zone_name = zone_name
        self.state_name = state_name
        self.district_name = district_name
        self.previous_probability = round(previous_probability, 1)
        self.current_probability = round(current_probability, 1)
        self.risk_level = risk_level
        self.trigger_factors = trigger_factors
        self.timestamp = datetime.now(timezone.utc).isoformat()
        self.data_freshness = "IMD AWS Live Telemetry (Real-time)" if not is_demo else "Demo Deterministic Telemetry"
        self.affected_infrastructure = affected_infrastructure
        self.affected_population = affected_population
        self.recommended_action = recommended_action
        self.delivery_channels = ["SMS", "VOICE", "IN_APP"]
        self.delivery_status = "DEMO / QUEUED (External delivery unavailable)"
        self.state = "AUTO_ALERTED"
        self.is_auto = is_auto
        self.is_demo = is_demo
        self.trigger_reason = trigger_reason

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "grid_id": self.grid_id,
            "zone_name": self.zone_name,
            "state": self.state_name,
            "district": self.district_name,
            "previous_probability": self.previous_probability,
            "current_probability": self.current_probability,
            "risk_level": self.risk_level,
            "trigger_factors": self.trigger_factors,
            "timestamp": self.timestamp,
            "data_freshness": self.data_freshness,
            "affected_infrastructure": self.affected_infrastructure,
            "affected_population": self.affected_population,
            "recommended_action": self.recommended_action,
            "delivery_channels": self.delivery_channels,
            "delivery_status": self.delivery_status,
            "state": self.state,
            "is_auto": self.is_auto,
            "is_demo": self.is_demo,
            "trigger_reason": self.trigger_reason,
            "disclaimer": "Prototype alert output. Requires admin authorization for external dispatch."
        }


class GridCellState:
    """Tracks state and history for a single monitored grid cell."""
    def __init__(self, grid_id: str):
        self.grid_id = grid_id
        self.current_score: float = 0.0
        self.previous_score: float = 0.0
        self.consecutive_over_threshold: int = 0
        self.alert_state: str = "NORMAL"
        self.last_alert_time: Optional[datetime] = None
        self.active_alert_id: Optional[str] = None


class AutoAlertEngine:
    """Automatic Threshold Evaluation & Alert Engine."""
    def __init__(self, thresholds: Optional[Dict[str, Any]] = None):
        self.thresholds = dict(DEFAULT_THRESHOLDS)
        if thresholds:
            self.thresholds.update(thresholds)
        self.is_auto_alerting_enabled = True
        self.cells: Dict[str, GridCellState] = {}
        self.alerts: List[AutoAlertRecord] = []
        self.audit_log: List[Dict[str, Any]] = []
        self._alert_counter = 1000

    def evaluate_zone(
        self,
        grid_id: str,
        current_score: float,
        zone_meta: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Evaluates a zone against thresholds.
        Applies consecutive cycle rule and major jump rule.
        Returns evaluation dict and alert if triggered.
        """
        meta = zone_meta or {
            "name": f"Sector {grid_id}",
            "state": "Assam",
            "district": "Dima Hasao",
            "population": 28400,
            "infrastructure": ["NH-27 Highway Corridor", "Culvert #4"]
        }

        cell = self.cells.setdefault(grid_id, GridCellState(grid_id))
        cell.previous_score = cell.current_score
        cell.current_score = current_score
        score_delta = cell.current_score - cell.previous_score

        auto_threshold = self.thresholds["AUTO_ALERT_THRESHOLD"]
        watch_threshold = self.thresholds["WATCH_THRESHOLD"]
        high_threshold = self.thresholds["HIGH_THRESHOLD"]
        consecutive_required = self.thresholds["CONSECUTIVE_CYCLES_REQUIRED"]
        major_jump_threshold = self.thresholds["MAJOR_JUMP_THRESHOLD"]
        cooldown_mins = self.thresholds["COOLDOWN_MINUTES"]

        # Track consecutive cycles exceeding threshold
        if current_score >= auto_threshold:
            cell.consecutive_over_threshold += 1
        else:
            cell.consecutive_over_threshold = 0

        # Determine state
        triggered = False
        trigger_reason = ""

        # Cooldown check
        in_cooldown = False
        if cell.last_alert_time:
            elapsed_mins = (datetime.now(timezone.utc) - cell.last_alert_time).total_seconds() / 60.0
            if elapsed_mins < cooldown_mins and cell.alert_state in ["AUTO_ALERTED", "ACKNOWLEDGED"]:
                in_cooldown = True

        if current_score < watch_threshold:
            cell.alert_state = "NORMAL"
        elif watch_threshold <= current_score < high_threshold:
            cell.alert_state = "WATCH"
        elif high_threshold <= current_score < auto_threshold:
            cell.alert_state = "ESCALATING"
        elif current_score >= auto_threshold:
            if in_cooldown:
                # Retain state under cooldown
                pass
            elif self.is_auto_alerting_enabled:
                # Trigger conditions:
                # Condition A: Exceeded threshold for consecutive cycles
                # Condition B: Major score jump >= MAJOR_JUMP_THRESHOLD
                if cell.consecutive_over_threshold >= consecutive_required:
                    triggered = True
                    trigger_reason = f"Consecutive evaluations over prototype threshold ({cell.consecutive_over_threshold} cycles >= {auto_threshold}%)"
                elif score_delta >= major_jump_threshold and cell.previous_score > 0:
                    triggered = True
                    trigger_reason = f"Major risk surge (+{score_delta:.1f}% jump) crossing prototype threshold ({auto_threshold}%)"
                else:
                    cell.alert_state = "ALERT_PENDING"

        # Log audit entry for threshold evaluation
        audit_entry = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "event": "THRESHOLD_EVALUATION",
            "grid_id": grid_id,
            "previous_score": round(cell.previous_score, 1),
            "current_score": round(cell.current_score, 1),
            "score_delta": round(score_delta, 1),
            "state": cell.alert_state,
            "consecutive_cycles": cell.consecutive_over_threshold,
            "auto_enabled": self.is_auto_alerting_enabled
        }
        self.audit_log.append(audit_entry)

        new_alert_record = None
        if triggered and not in_cooldown:
            self._alert_counter += 1
            alert_id = f"AUTO-ALT-2026-{self._alert_counter}"
            
            risk_level = "VERY HIGH" if current_score >= 85 else "HIGH"
            trigger_factors = [
                f"Risk score crossed prototype threshold ({current_score:.1f}% >= {auto_threshold:.1f}%)",
                trigger_reason,
                f"Rainfall surge impact (+{score_delta:.1f}% delta)"
            ]

            rec_action = "Issue Stage-3 Emergency Broadcast & Restrict Traffic Corridor"

            new_alert_record = AutoAlertRecord(
                alert_id=alert_id,
                grid_id=grid_id,
                zone_name=meta.get("name", f"Sector {grid_id}"),
                state_name=meta.get("state", "Assam"),
                district_name=meta.get("district", "Dima Hasao"),
                previous_probability=cell.previous_score,
                current_probability=current_score,
                risk_level=risk_level,
                trigger_factors=trigger_factors,
                affected_infrastructure=meta.get("infrastructure", ["NH-27 Highway Corridor"]),
                affected_population=meta.get("population", 28400),
                recommended_action=rec_action,
                trigger_reason=trigger_reason,
                is_auto=True,
                is_demo=True
            )

            cell.alert_state = "AUTO_ALERTED"
            cell.last_alert_time = datetime.now(timezone.utc)
            cell.active_alert_id = alert_id
            self.alerts.insert(0, new_alert_record)

            self.audit_log.append({
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "event": "AUTOMATIC_ALERT_TRIGGERED",
                "alert_id": alert_id,
                "grid_id": grid_id,
                "current_score": round(current_score, 1),
                "trigger_reason": trigger_reason
            })

        return {
            "grid_id": grid_id,
            "previous_score": round(cell.previous_score, 1),
            "current_score": round(cell.current_score, 1),
            "score_delta": round(score_delta, 1),
            "alert_state": cell.alert_state,
            "consecutive_cycles": cell.consecutive_over_threshold,
            "triggered": triggered,
            "in_cooldown": in_cooldown,
            "alert": new_alert_record.to_dict() if new_alert_record else None
        }

    def acknowledge_alert(self, alert_id: str, actor: str = "SDMA Admin") -> Optional[Dict[str, Any]]:
        """Admin acknowledges an active automatic alert."""
        for record in self.alerts:
            if record.id == alert_id:
                record.state = "ACKNOWLEDGED"
                cell = self.cells.get(record.grid_id)
                if cell:
                    cell.alert_state = "ACKNOWLEDGED"

                self.audit_log.append({
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "event": "ALERT_ACKNOWLEDGED",
                    "alert_id": alert_id,
                    "grid_id": record.grid_id,
                    "actor": actor
                })
                return record.to_dict()
        return None

    def resolve_alert(self, alert_id: str, actor: str = "SDMA Admin") -> Optional[Dict[str, Any]]:
        """Admin marks alert as resolved."""
        for record in self.alerts:
            if record.id == alert_id:
                record.state = "RESOLVED"
                cell = self.cells.get(record.grid_id)
                if cell:
                    cell.alert_state = "RESOLVED"

                self.audit_log.append({
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "event": "ALERT_RESOLVED",
                    "alert_id": alert_id,
                    "grid_id": record.grid_id,
                    "actor": actor
                })
                return record.to_dict()
        return None

    def run_demo_sequence(self, grid_id: str = "ner_grid_056061") -> List[Dict[str, Any]]:
        """
        Executes a deterministic offline demo sequence: 72% -> 79% -> 88% -> 92%
        Demonstrates threshold crossing at cycle 3 & 4.
        """
        sequence = [72.0, 79.0, 88.0, 92.0]
        results = []
        meta = {
          "name": "Haflong Hill Sector",
          "state": "Assam",
          "district": "Dima Hasao",
          "population": 28400,
          "infrastructure": ["NH-27 Highway Corridor", "Jatinga Culvert #4"]
        }

        for score in sequence:
            res = self.evaluate_zone(grid_id, score, meta)
            results.append(res)

        return results


# Global singleton engine instance
auto_alert_engine = AutoAlertEngine()
