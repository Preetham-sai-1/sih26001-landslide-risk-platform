import pytest
from src.features.auto_alert_engine import AutoAlertEngine, DEFAULT_THRESHOLDS


def test_default_thresholds_configuration():
    engine = AutoAlertEngine()
    assert engine.thresholds["AUTO_ALERT_THRESHOLD"] == 85.0
    assert engine.thresholds["WATCH_THRESHOLD"] == 60.0
    assert engine.thresholds["HIGH_THRESHOLD"] == 75.0
    assert engine.thresholds["CONSECUTIVE_CYCLES_REQUIRED"] == 2
    assert engine.thresholds["DISPLAY_LABEL"] == "Prototype Alert Threshold"


def test_no_alert_triggered_below_auto_threshold():
    engine = AutoAlertEngine()
    res1 = engine.evaluate_zone("grid_test_1", 50.0)
    assert res1["alert_state"] == "NORMAL"
    assert res1["triggered"] is False

    res2 = engine.evaluate_zone("grid_test_1", 65.0)
    assert res2["alert_state"] == "WATCH"
    assert res2["triggered"] is False

    res3 = engine.evaluate_zone("grid_test_1", 78.0)
    assert res3["alert_state"] == "ESCALATING"
    assert res3["triggered"] is False


def test_consecutive_cycles_triggers_alert():
    engine = AutoAlertEngine()
    
    # Cycle 1 at 86% -> ALERT_PENDING (1 cycle)
    res1 = engine.evaluate_zone("grid_test_2", 86.0)
    assert res1["alert_state"] == "ALERT_PENDING"
    assert res1["triggered"] is False

    # Cycle 2 at 89% -> AUTO_ALERTED (2 consecutive cycles >= 85%)
    res2 = engine.evaluate_zone("grid_test_2", 89.0)
    assert res2["alert_state"] == "AUTO_ALERTED"
    assert res2["triggered"] is True
    assert res2["alert"] is not None
    assert res2["alert"]["current_probability"] == 89.0
    assert res2["alert"]["delivery_status"] == "DEMO / QUEUED (External delivery unavailable)"


def test_major_risk_jump_triggers_immediately():
    engine = AutoAlertEngine()
    
    # Baseline cycle
    engine.evaluate_zone("grid_test_3", 72.0)
    
    # Major jump: 72% -> 88% (+16.0% delta >= 10.0% major jump threshold)
    res = engine.evaluate_zone("grid_test_3", 88.0)
    assert res["triggered"] is True
    assert res["alert_state"] == "AUTO_ALERTED"
    assert "Major risk surge" in res["alert"]["trigger_reason"]


def test_cooldown_prevents_duplicate_alerts():
    engine = AutoAlertEngine()
    
    # Trigger initial alert via major jump
    engine.evaluate_zone("grid_test_4", 70.0)
    res1 = engine.evaluate_zone("grid_test_4", 87.0)
    assert res1["triggered"] is True

    # Immediate follow-up cycle at 90% (within cooldown)
    res2 = engine.evaluate_zone("grid_test_4", 90.0)
    assert res2["in_cooldown"] is True
    assert res2["triggered"] is False


def test_acknowledge_and_resolve_alert_state_transitions():
    engine = AutoAlertEngine()
    engine.evaluate_zone("grid_test_5", 70.0)
    eval_res = engine.evaluate_zone("grid_test_5", 88.0)
    alert_id = eval_res["alert"]["id"]

    # Acknowledge
    ack_res = engine.acknowledge_alert(alert_id, actor="Operator Admin")
    assert ack_res is not None
    assert ack_res["state"] == "ACKNOWLEDGED"

    # Resolve
    res_res = engine.resolve_alert(alert_id, actor="Operator Admin")
    assert res_res is not None
    assert res_res["state"] == "RESOLVED"


def test_disabled_auto_alerting_toggle():
    engine = AutoAlertEngine()
    engine.is_auto_alerting_enabled = False

    engine.evaluate_zone("grid_test_6", 70.0)
    res = engine.evaluate_zone("grid_test_6", 89.0)
    assert res["triggered"] is False
    assert res["alert"] is None


def test_offline_demo_sequence_72_79_88_92():
    engine = AutoAlertEngine()
    seq_results = engine.run_demo_sequence("ner_grid_056061")
    
    assert len(seq_results) == 4
    assert seq_results[0]["current_score"] == 72.0  # WATCH / ESCALATING
    assert seq_results[1]["current_score"] == 79.0  # ESCALATING
    assert seq_results[2]["current_score"] == 88.0  # Major jump -> AUTO_ALERTED
    assert seq_results[2]["triggered"] is True
    assert seq_results[3]["current_score"] == 92.0  # In cooldown
    assert seq_results[3]["in_cooldown"] is True
