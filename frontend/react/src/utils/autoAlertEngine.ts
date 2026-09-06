import { RiskZone, AutoAlertRecord, AutoAlertState, RiskLevel } from '../types';

export const PROTOTYPE_THRESHOLDS = {
  WATCH_THRESHOLD: 60.0,
  HIGH_THRESHOLD: 75.0,
  VERY_HIGH_THRESHOLD: 85.0,
  AUTO_ALERT_THRESHOLD: 85.0,
  CONSECUTIVE_CYCLES_REQUIRED: 2,
  MAJOR_JUMP_THRESHOLD: 8.0,
  COOLDOWN_MINUTES: 30,
  DISPLAY_LABEL: 'Prototype Alert Threshold',
  DISCLAIMER: 'Prototype alert thresholds for decision-support evaluation. Non-official government warning.'
};

export interface GridEvaluationState {
  grid_id: string;
  previous_score: number;
  current_score: number;
  consecutive_cycles: number;
  alert_state: AutoAlertState;
  last_alert_time?: string;
  active_alert_id?: string;
}

const cellStatesStore = new Map<string, GridEvaluationState>();
let alertSequenceCounter = 1000;

export interface AutoAlertEvalResult {
  grid_id: string;
  previous_score: number;
  current_score: number;
  score_delta: number;
  alert_state: AutoAlertState;
  consecutive_cycles: number;
  triggered: boolean;
  in_cooldown: boolean;
  alert: AutoAlertRecord | null;
  trigger_reason: string;
}

export function evaluateZoneAutoAlert(
  zone: RiskZone,
  newScore?: number,
  isAutoEnabled: boolean = true
): AutoAlertEvalResult {
  const currentScore = newScore !== undefined ? newScore : zone.score;
  const gridId = zone.grid_id;

  let state = cellStatesStore.get(gridId);
  if (!state) {
    state = {
      grid_id: gridId,
      previous_score: currentScore > 75 ? Math.max(0, currentScore - 12) : Math.max(0, currentScore - 5),
      current_score: currentScore,
      consecutive_cycles: currentScore >= PROTOTYPE_THRESHOLDS.AUTO_ALERT_THRESHOLD ? 1 : 0,
      alert_state: 'NORMAL'
    };
    cellStatesStore.set(gridId, state);
  } else {
    state.previous_score = state.current_score;
    state.current_score = currentScore;
  }

  const scoreDelta = state.current_score - state.previous_score;

  if (state.current_score >= PROTOTYPE_THRESHOLDS.AUTO_ALERT_THRESHOLD) {
    state.consecutive_cycles += 1;
  } else {
    state.consecutive_cycles = 0;
  }

  // Cooldown calculation
  let inCooldown = false;
  if (state.last_alert_time) {
    const elapsedMins = (Date.now() - new Date(state.last_alert_time).getTime()) / (60 * 1000);
    if (elapsedMins < PROTOTYPE_THRESHOLDS.COOLDOWN_MINUTES && ['AUTO_ALERTED', 'ACKNOWLEDGED'].includes(state.alert_state)) {
      inCooldown = true;
    }
  }

  let triggered = false;
  let triggerReason = '';

  if (state.current_score < PROTOTYPE_THRESHOLDS.WATCH_THRESHOLD) {
    state.alert_state = 'NORMAL';
  } else if (state.current_score < PROTOTYPE_THRESHOLDS.HIGH_THRESHOLD) {
    state.alert_state = 'WATCH';
  } else if (state.current_score < PROTOTYPE_THRESHOLDS.AUTO_ALERT_THRESHOLD) {
    state.alert_state = 'ESCALATING';
  } else if (state.current_score >= PROTOTYPE_THRESHOLDS.AUTO_ALERT_THRESHOLD) {
    if (inCooldown) {
      // Cooldown active
    } else if (isAutoEnabled) {
      if (state.consecutive_cycles >= PROTOTYPE_THRESHOLDS.CONSECUTIVE_CYCLES_REQUIRED) {
        triggered = true;
        triggerReason = `Consecutive evaluations over prototype threshold (${state.consecutive_cycles} cycles >= ${PROTOTYPE_THRESHOLDS.AUTO_ALERT_THRESHOLD}%)`;
      } else if (scoreDelta >= PROTOTYPE_THRESHOLDS.MAJOR_JUMP_THRESHOLD && state.previous_score > 0) {
        triggered = true;
        triggerReason = `Major risk surge (+${scoreDelta.toFixed(1)}% jump) crossing prototype threshold (${PROTOTYPE_THRESHOLDS.AUTO_ALERT_THRESHOLD}%)`;
      } else {
        state.alert_state = 'ALERT_PENDING';
      }
    }
  }

  let alertRecord: AutoAlertRecord | null = null;

  if (triggered && !inCooldown) {
    alertSequenceCounter += 1;
    const alertId = `AUTO-ALT-2026-${alertSequenceCounter}`;
    const riskLevel: RiskLevel = state.current_score >= 85 ? 'VERY HIGH' : 'HIGH';

    alertRecord = {
      id: alertId,
      grid_id: zone.grid_id,
      zone_name: zone.name,
      target_state: zone.state,
      district: zone.district,
      previous_probability: Math.round(state.previous_score * 10) / 10,
      current_probability: Math.round(state.current_score * 10) / 10,
      risk_level: riskLevel,
      trigger_factors: [
        `Risk probability crossed prototype threshold (${state.current_score.toFixed(1)}% >= ${PROTOTYPE_THRESHOLDS.AUTO_ALERT_THRESHOLD}%)`,
        triggerReason,
        `Antecedent 7-day rainfall accumulation surge (${zone.r7d.toFixed(0)}mm)`
      ],
      timestamp: new Date().toISOString(),
      data_freshness: 'IMD AWS Live Telemetry (Real-Time)',
      affected_infrastructure: ['National Highway NH-27', 'Culvert #4 Bridge Node', '132kV Power Grid'],
      affected_population: zone.population,
      recommended_action: 'Issue Stage-3 Emergency Broadcast & Restrict Traffic Corridor',
      delivery_channels: ['SMS', 'VOICE', 'IN_APP'],
      delivery_status: 'DEMO / QUEUED (External delivery unavailable)',
      alert_state: 'AUTO_ALERTED',
      is_auto: true,
      is_demo: true,
      trigger_reason: triggerReason,
      disclaimer: PROTOTYPE_THRESHOLDS.DISCLAIMER
    };

    state.alert_state = 'AUTO_ALERTED';
    state.last_alert_time = new Date().toISOString();
    state.active_alert_id = alertId;
  }

  return {
    grid_id: zone.grid_id,
    previous_score: Math.round(state.previous_score * 10) / 10,
    current_score: Math.round(state.current_score * 10) / 10,
    score_delta: Math.round(scoreDelta * 10) / 10,
    alert_state: state.alert_state,
    consecutive_cycles: state.consecutive_cycles,
    triggered,
    in_cooldown: inCooldown,
    alert: alertRecord,
    trigger_reason: triggerReason
  };
}

export function runDemoAutoAlertSequence(zone: RiskZone): AutoAlertEvalResult[] {
  const demoSequenceScores = [72.0, 79.0, 88.0, 92.0];
  const results: AutoAlertEvalResult[] = [];

  // Reset local state store for this zone to test cleanly
  cellStatesStore.delete(zone.grid_id);

  for (const score of demoSequenceScores) {
    const res = evaluateZoneAutoAlert(zone, score, true);
    results.push(res);
  }

  return results;
}

export function createManualOverrideAlert(zone: RiskZone, customMessage?: string): AutoAlertRecord {
  alertSequenceCounter += 1;
  const alertId = `MANUAL-ALT-2026-${alertSequenceCounter}`;
  const riskLevel: RiskLevel = zone.risk;

  return {
    id: alertId,
    grid_id: zone.grid_id,
    zone_name: zone.name,
    target_state: zone.state,
    district: zone.district,
    previous_probability: Math.round(zone.score * 10) / 10,
    current_probability: Math.round(zone.score * 10) / 10,
    risk_level: riskLevel,
    trigger_factors: [
      `Emergency Admin Manual Override Dispatch`,
      `Zone hazard level: ${zone.risk} (${zone.score.toFixed(1)}%)`,
      `Custom message: "${customMessage || 'Emergency alert dispatched by SDMA Administrator'}"`
    ],
    timestamp: new Date().toISOString(),
    data_freshness: 'Manual Admin Command Center Dispatch',
    affected_infrastructure: ['National Highway NH-27', 'Local Village Access Roads'],
    affected_population: zone.population,
    recommended_action: 'Immediate Administrative Dispatch & Public Broadcast',
    delivery_channels: ['SMS', 'VOICE', 'IN_APP'],
    delivery_status: 'DEMO / QUEUED (External delivery unavailable)',
    alert_state: 'AUTO_ALERTED',
    is_auto: false,
    is_demo: true,
    trigger_reason: 'Emergency Admin Manual Override',
    disclaimer: PROTOTYPE_THRESHOLDS.DISCLAIMER
  };
}
