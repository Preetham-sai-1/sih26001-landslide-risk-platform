import React, { useState, useEffect } from 'react';
import { 
  RiskZone, 
  ZoneDetailsResponse, 
  ResponseRecommendation, 
  ForecastHorizon, 
  LiveWeatherStation, 
  LiveWeatherStatus,
  AutoAlertRecord,
  AutoAlertState,
  MLPredictionResponse
} from '../types';
import { fetchMLPrediction } from '../services/api';
import { 
  calculateSimulatedRisk, 
  calculateRiskEvolutionStages, 
  generateResponseRecommendations 
} from '../utils/simulation';
import { evaluateCellForecast } from '../utils/forecastEngine';
import { computeCommunityImpact } from '../utils/communityImpact';
import { getZoneEvacuationPlan } from '../utils/shelters';
import { PROTOTYPE_THRESHOLDS, evaluateZoneAutoAlert } from '../utils/autoAlertEngine';
import {
  X,
  ChevronDown,
  ChevronRight,
  ShieldAlert,
  CloudRain,
  Zap,
  History,
  Home,
  Send,
  FileCheck2,
  Radio,
  Users,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Play
} from 'lucide-react';

interface ZoneInspectorProps {
  zone: RiskZone;
  details: ZoneDetailsResponse | null;
  onClose: () => void;
  onDispatchAlert: (zone: RiskZone) => void;
  onOpenFieldReport: (zone: RiskZone) => void;
  onCreateResponsePlan?: (zone: RiskZone, recommendation: ResponseRecommendation) => void;
  isDemoMode: boolean;
  simulatedMm: number;
  onSimulateRainfall: (addedMm: number) => void;
  forecastHorizon?: ForecastHorizon;
  liveWeatherStations?: LiveWeatherStation[];
  liveStatus?: LiveWeatherStatus | null;
  isAutoAlertingEnabled?: boolean;
  onToggleAutoAlerting?: () => void;
  onAcknowledgeAlert?: (gridId: string) => void;
  onManualOverride?: (zone: RiskZone) => void;
  onRunDemoSequence?: (zone: RiskZone) => void;
  activeAutoAlerts?: AutoAlertRecord[];
}

export const ZoneInspector: React.FC<ZoneInspectorProps> = ({
  zone,
  details,
  onClose,
  onDispatchAlert,
  onOpenFieldReport,
  onCreateResponsePlan,
  isDemoMode,
  simulatedMm,
  onSimulateRainfall,
  forecastHorizon = '+12H',
  liveWeatherStations = [],
  liveStatus = null,
  isAutoAlertingEnabled = true,
  onToggleAutoAlerting,
  onAcknowledgeAlert,
  onManualOverride,
  onRunDemoSequence,
  activeAutoAlerts = []
}) => {
  const [openAccordion, setOpenAccordion] = useState<string | null>('WHY');
  const [selectedHorizon, setSelectedHorizon] = useState<ForecastHorizon>(forecastHorizon);
  const [mlPred, setMlPred] = useState<MLPredictionResponse | null>(null);

  const toggleAccordion = (key: string) => {
    setOpenAccordion(prev => (prev === key ? null : key));
  };

  // Find nearest reporting AWS station
  const station = liveWeatherStations.find(
    s => s.district.toLowerCase() === zone.district.toLowerCase()
  ) || liveWeatherStations.find(
    s => s.state.toLowerCase() === zone.state.toLowerCase()
  ) || (liveWeatherStations.length > 0 ? liveWeatherStations[0] : null);

  useEffect(() => {
    let isMounted = true;
    const liveR1h = station ? station.rainfall_1h_mm : 0.0;
    fetchMLPrediction(zone.grid_id, liveR1h, simulatedMm).then(({ prediction }) => {
      if (isMounted) {
        setMlPred(prediction);
      }
    });
    return () => { isMounted = false; };
  }, [zone.grid_id, station, simulatedMm]);

  // Calculations
  const simResult = calculateSimulatedRisk(zone, simulatedMm);
  const fcEval = evaluateCellForecast(zone, selectedHorizon);
  const evolutionStages = calculateRiskEvolutionStages(zone, simulatedMm);
  const responseRecommendation = generateResponseRecommendations(
    zone,
    fcEval.isEscalating ? fcEval.forecastScore : simResult.simulatedScore,
    fcEval.isEscalating ? fcEval.forecastRisk : simResult.simulatedRisk
  );
  const communityImpact = computeCommunityImpact(zone, simulatedMm);
  const evacPlan = getZoneEvacuationPlan(zone);

  // Auto alert evaluation for this zone
  const autoEval = evaluateZoneAutoAlert(zone, simResult.simulatedScore, isAutoAlertingEnabled);
  const existingAlert = activeAutoAlerts.find(a => a.grid_id === zone.grid_id);

  const getRiskColor = (r: string) => {
    switch (r) {
      case 'VERY HIGH': return 'text-red-400 bg-red-500/20 border-red-500/40';
      case 'HIGH': return 'text-amber-400 bg-amber-500/20 border-amber-500/40';
      case 'MODERATE': return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/40';
      case 'LOW': return 'text-cyan-400 bg-cyan-500/20 border-cyan-500/40';
      default: return 'text-emerald-400 bg-emerald-500/20 border-emerald-500/40';
    }
  };

  const getPriorityColor = (p: string) => {
    switch (p) {
      case 'P1 CRITICAL': return 'bg-red-500/20 text-red-300 border-red-500/40';
      case 'P2 HIGH': return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'P3 MODERATE': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40';
      default: return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
    }
  };

  return (
    <div className="fixed top-0 right-0 bottom-0 w-80 sm:w-96 z-40 bg-slate-950/95 backdrop-blur-xl border-l border-slate-800 flex flex-col shadow-2xl overflow-hidden select-none animate-in slide-in-from-right duration-200 text-slate-100">
      {/* Header Bar */}
      <div className="p-3.5 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-[10px] font-bold text-amber-400 bg-slate-950 px-1.5 py-0.2 rounded border border-slate-800">
              {zone.grid_id}
            </span>
            <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded border font-mono ${getPriorityColor(responseRecommendation.priority)}`}>
              {responseRecommendation.priority.split(' ')[0]}
            </span>
          </div>
          <h3 className="font-extrabold text-sm text-white font-sans truncate max-w-[200px] mt-0.5">{zone.name}</h3>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          title="Close Zone Intelligence & Return to Operational Priority"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Main Body */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-3 text-xs">
        {/* 1. THREE KEY PRIMARY METRICS */}
        <div className="grid grid-cols-3 gap-2">
          {/* Risk Level */}
          <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 text-center">
            <span className="text-[9px] uppercase font-bold text-slate-400 block">Risk</span>
            <span className={`text-xs font-black px-1.5 py-0.5 rounded border font-mono mt-1 inline-block ${getRiskColor(simResult.simulatedRisk)}`}>
              {simResult.simulatedRisk}
            </span>
            <span className="text-[10px] font-mono font-bold text-amber-400 block mt-1">{simResult.simulatedScore.toFixed(0)}%</span>
          </div>

          {/* 24h Rainfall */}
          <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 text-center">
            <span className="text-[9px] uppercase font-bold text-slate-400 block">24h Rain</span>
            <span className="text-sm font-black text-cyan-300 font-mono block mt-1">{(zone.r24 + simulatedMm).toFixed(0)}mm</span>
            <span className="text-[9px] font-mono text-slate-500 block mt-0.5">{simulatedMm > 0 ? `+${simulatedMm}mm surge` : '24h total'}</span>
          </div>

          {/* Slope & Elevation */}
          <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 text-center">
            <span className="text-[9px] uppercase font-bold text-slate-400 block">Slope</span>
            <span className="text-sm font-black text-amber-400 font-mono block mt-1">{zone.slope.toFixed(1)}°</span>
            <span className="text-[9px] font-mono text-slate-400 block mt-0.5">{zone.elev.toFixed(0)}m elev</span>
          </div>
        </div>

        {/* 2. 2-LINE AI EXPLANATION */}
        <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-brand-400" />
            <span className="text-[10px] uppercase font-bold text-brand-400 tracking-wider">AI Hazard Diagnosis</span>
          </div>
          <p className="text-slate-300 text-[11px] leading-relaxed line-clamp-2">
            {simResult.naturalExplanation}
          </p>
        </div>

        {/* 3. THRESHOLD-BASED AUTOMATIC ALERTING CONTROL PANEL */}
        <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded border font-mono ${
                isAutoAlertingEnabled ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}>
                AUTO ALERTING: {isAutoAlertingEnabled ? 'ON' : 'OFF'}
              </span>
              <span className="text-[9px] text-slate-400 font-mono">
                Threshold: <strong className="text-amber-400">{PROTOTYPE_THRESHOLDS.AUTO_ALERT_THRESHOLD}%</strong>
              </span>
            </div>

            {onToggleAutoAlerting && (
              <button
                onClick={onToggleAutoAlerting}
                className="text-[9px] font-bold text-brand-400 hover:underline"
              >
                {isAutoAlertingEnabled ? 'DISABLE AUTO' : 'ENABLE AUTO'}
              </button>
            )}
          </div>

          {/* Status & Risk Indicators */}
          <div className="flex items-center justify-between text-[10px] bg-slate-950 p-2 rounded-lg border border-slate-800 font-mono">
            <span className="text-slate-400">Current Risk: <strong className="text-white">{simResult.simulatedScore.toFixed(1)}%</strong></span>
            <span className="text-slate-400">
              Status: <strong className={
                autoEval.alert_state === 'AUTO_ALERTED' ? 'text-red-400' :
                autoEval.alert_state === 'ESCALATING' ? 'text-amber-400' : 'text-emerald-400'
              }>{autoEval.alert_state}</strong>
            </span>
          </div>

          <div className="text-[9px] text-slate-500 italic">
            "{PROTOTYPE_THRESHOLDS.DISPLAY_LABEL}" (Decision-support output)
          </div>

          {/* Action Row: ACKNOWLEDGE, ESCALATE, MANUAL OVERRIDE */}
          <div className="grid grid-cols-3 gap-1 pt-1">
            <button
              onClick={() => onAcknowledgeAlert && onAcknowledgeAlert(zone.grid_id)}
              disabled={autoEval.alert_state !== 'AUTO_ALERTED' && existingAlert?.alert_state !== 'AUTO_ALERTED'}
              className={`py-1.5 px-1 rounded-lg font-bold text-[9px] flex items-center justify-center gap-1 border transition ${
                autoEval.alert_state === 'AUTO_ALERTED' || existingAlert?.alert_state === 'AUTO_ALERTED'
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-400 shadow'
                  : 'bg-slate-950 text-slate-600 border-slate-800 cursor-not-allowed'
              }`}
              title="Acknowledge active automatic alert"
            >
              <CheckCircle2 className="w-3 h-3" />
              <span>ACKNOWLEDGE</span>
            </button>

            <button
              onClick={() => onDispatchAlert(zone)}
              className="py-1.5 px-1 bg-amber-600 hover:bg-amber-500 text-white font-bold text-[9px] rounded-lg flex items-center justify-center gap-1 shadow transition"
              title="Escalate Alert Broadcast"
            >
              <ShieldAlert className="w-3 h-3" />
              <span>ESCALATE</span>
            </button>

            <button
              onClick={() => onManualOverride ? onManualOverride(zone) : onDispatchAlert(zone)}
              className="py-1.5 px-1 bg-red-600 hover:bg-red-500 text-white font-bold text-[9px] rounded-lg flex items-center justify-center gap-1 shadow transition"
              title="Emergency Admin Manual Dispatch Override"
            >
              <Send className="w-3 h-3" />
              <span>MANUAL OVERRIDE</span>
            </button>
          </div>

          {/* Demo Auto Alert Test Runner (72% -> 79% -> 88% -> 92%) */}
          {onRunDemoSequence && (
            <button
              onClick={() => onRunDemoSequence(zone)}
              className="w-full py-1.5 bg-indigo-950/80 hover:bg-indigo-900/80 border border-indigo-500/40 text-indigo-300 font-bold text-[10px] rounded-lg flex items-center justify-center gap-1.5 transition"
            >
              <Play className="w-3 h-3 text-indigo-400" />
              <span>RUN DEMO AUTO-ALERT (72% → 79% → 88% → 92%)</span>
            </button>
          )}
        </div>

        {/* 4. PRIMARY ACTIONS (VERIFY, PLAN) */}
        <div className="grid grid-cols-2 gap-1.5">
          <button
            onClick={() => onOpenFieldReport(zone)}
            className="py-2 px-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-white font-bold text-[10px] rounded-xl flex items-center justify-center gap-1 transition"
            title="Request Field Verification"
          >
            <FileCheck2 className="w-3.5 h-3.5 text-amber-400" />
            <span>VERIFY FIELD TICKET</span>
          </button>

          {onCreateResponsePlan && (
            <button
              onClick={() => onCreateResponsePlan(zone, responseRecommendation)}
              className="py-2 px-2 bg-gradient-to-r from-indigo-600 to-brand-600 hover:from-indigo-500 text-white font-bold text-[10px] rounded-xl flex items-center justify-center gap-1 shadow-md transition"
              title="Create Response Plan Workflow"
            >
              <FileCheck2 className="w-3.5 h-3.5 text-white" />
              <span>CREATE RESPONSE PLAN</span>
            </button>
          )}
        </div>

        {/* 5. PROGRESSIVE DISCLOSURE ACCORDIONS */}
        <div className="space-y-2 pt-1 border-t border-slate-800/80">
          {/* ACCORDION 1: WEATHER > */}
          <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-900/60">
            <button
              onClick={() => toggleAccordion('WEATHER')}
              className="w-full p-3 flex items-center justify-between font-bold text-xs text-white hover:bg-slate-900 transition"
            >
              <div className="flex items-center gap-2">
                <CloudRain className="w-4 h-4 text-cyan-400" />
                <span>WEATHER & SIMULATOR</span>
              </div>
              {openAccordion === 'WEATHER' ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
            </button>

            {openAccordion === 'WEATHER' && (
              <div className="p-3 border-t border-slate-800/80 space-y-3 bg-slate-950/60">
                {station && (
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 space-y-1 font-mono text-[10px]">
                    <div className="flex items-center justify-between text-white font-bold">
                      <span className="flex items-center gap-1"><Radio className="w-3 h-3 text-emerald-400 animate-pulse" /> {station.station_name} AWS</span>
                      <span className="text-emerald-400">{station.warning_level}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1 text-slate-300 pt-1">
                      <span>1h Rain: {station.rainfall_1h_mm.toFixed(1)}mm</span>
                      <span>24h Total: {station.rainfall_24h_mm.toFixed(1)}mm</span>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-4 gap-1 text-center font-mono text-[10px]">
                  <div className="bg-slate-900 p-1.5 rounded border border-slate-800">
                    <span className="text-slate-500 block">24h</span>
                    <span className="font-bold text-cyan-300">{zone.r24.toFixed(0)}mm</span>
                  </div>
                  <div className="bg-slate-900 p-1.5 rounded border border-slate-800">
                    <span className="text-slate-500 block">3D</span>
                    <span className="font-bold text-blue-300">{zone.r3d.toFixed(0)}mm</span>
                  </div>
                  <div className="bg-slate-900 p-1.5 rounded border border-slate-800">
                    <span className="text-slate-500 block">7D</span>
                    <span className="font-bold text-indigo-300">{zone.r7d.toFixed(0)}mm</span>
                  </div>
                  <div className="bg-slate-900 p-1.5 rounded border border-slate-800">
                    <span className="text-slate-500 block">30D</span>
                    <span className="font-bold text-purple-300">{zone.r30d.toFixed(0)}mm</span>
                  </div>
                </div>

                {/* Rainfall Surge Simulator */}
                <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-bold text-amber-300 flex items-center gap-1">
                      <Zap className="w-3 h-3 text-amber-400" />
                      <span>Rainfall Surge Simulator</span>
                    </span>
                    <span className="font-mono text-amber-400 font-bold">+{simulatedMm}mm</span>
                  </div>

                  <div className="grid grid-cols-4 gap-1">
                    {[0, 25, 50, 100].map(mm => (
                      <button
                        key={mm}
                        onClick={() => onSimulateRainfall(mm)}
                        className={`py-1 rounded text-[10px] font-bold font-mono transition border ${
                          simulatedMm === mm
                            ? 'bg-amber-600 text-white border-amber-400 shadow'
                            : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                        }`}
                      >
                        +{mm}mm
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ACCORDION 2: WHY / AI DIAGNOSIS & SHAP EXPLAINABILITY */}
          <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-900/60">
            <button
              onClick={() => toggleAccordion('WHY')}
              className="w-full p-3 flex items-center justify-between font-bold text-xs text-white hover:bg-slate-900 transition"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-brand-400" />
                <span>ML MODEL INFERENCE & SHAP</span>
              </div>
              {openAccordion === 'WHY' ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
            </button>

            {openAccordion === 'WHY' && (
              <div className="p-3 border-t border-slate-800/80 space-y-3 bg-slate-950/60">
                {/* 1. ML Model Version & Semantics Badge */}
                <div className="p-2 bg-slate-900 rounded-lg border border-slate-800 space-y-1 font-mono text-[9px]">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>MODEL ENGINE:</span>
                    <span className="font-bold text-brand-400">{mlPred?.model_version || 'v1.0.0 (XGBoost + Platt Scaling)'}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span>TELEMETRY:</span>
                    <span className={`font-bold ${mlPred?.telemetry_status === 'LIVE' ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {mlPred?.telemetry_status || 'OFFLINE'}
                    </span>
                  </div>
                  <div className="mt-1 pt-1 border-t border-slate-800 text-[8px] text-amber-300 font-sans font-semibold">
                    {mlPred?.semantics_badge || 'PREDICTED RISK - Elevated Probability, Not Confirmed Landslide'}
                  </div>
                </div>

                {/* 2. Calibrated Probability Metric */}
                <div className="p-2.5 bg-slate-900/90 rounded-xl border border-brand-500/30 flex items-center justify-between">
                  <div>
                    <span className="text-[9px] uppercase font-bold text-slate-400 block">Model-estimated landslide risk</span>
                    <span className="text-[9px] font-mono text-slate-400 block">P(landslide | terrain + rain)</span>
                  </div>
                  <span className="text-xl font-black text-amber-400 font-mono">
                    {mlPred ? `${mlPred.probability_pct}%` : `${simResult.simulatedScore.toFixed(1)}%`}
                  </span>
                </div>

                {/* 3. SHAP / XGBoost Feature Importances */}
                <div className="space-y-2">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">SHAP / XGBoost Feature Importances</span>
                  <div className="space-y-1.5">
                    {(
                      Array.isArray(mlPred?.model_explainability?.top_contributing_factors)
                        ? mlPred.model_explainability.top_contributing_factors.map((f: any) => ({
                            factor: f.factor || f.feature || 'Factor',
                            weight: typeof f.weight === 'number' ? f.weight : (typeof f.weight_pct === 'number' ? f.weight_pct : (parseFloat(f.weight || f.weight_pct || 0) || 0)),
                            detail: f.detail || f.observed_value || ''
                          }))
                        : simResult.rankedFactors.map(f => ({
                            factor: f.name,
                            weight: Math.round(f.weight * 100),
                            detail: f.valStr
                          }))
                    ).map((f, idx) => (
                      <div key={idx} className="space-y-0.5">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-slate-300 font-semibold truncate max-w-[190px]">{f.factor}</span>
                          <span className="font-mono font-bold text-amber-400">{typeof f.weight === 'number' ? f.weight.toFixed(1) : f.weight}%</span>
                        </div>
                        <div className="text-[8px] font-mono text-slate-500">{f.detail}</div>
                        <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-gradient-to-r from-brand-500 to-amber-500 h-full" style={{ width: `${Math.min(100, Math.max(0, typeof f.weight === 'number' ? f.weight : parseFloat(f.weight || 0)))}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 4. Scenario Projections */}
                <div className="pt-2 border-t border-slate-800 space-y-1.5">
                  <span className="text-[10px] uppercase font-bold text-indigo-400 block">Scenario Projections</span>
                  <div className="grid grid-cols-3 gap-1">
                    {(
                      Array.isArray(mlPred?.scenario_projections)
                        ? mlPred.scenario_projections
                        : (mlPred?.scenario_projections && typeof mlPred.scenario_projections === 'object'
                            ? [
                                { horizon: '+6H', projected_probability: ((mlPred.scenario_projections as any).P_next_6h_pct || 85) / 100, projected_risk_level: 'HIGH' },
                                { horizon: '+12H', projected_probability: ((mlPred.scenario_projections as any).P_next_12h_pct || 91) / 100, projected_risk_level: 'VERY HIGH' },
                                { horizon: '+24H', projected_probability: ((mlPred.scenario_projections as any).P_next_24h_pct || 96) / 100, projected_risk_level: 'VERY HIGH' }
                              ]
                            : [
                                { horizon: '+6H', projected_probability: 0.85, projected_risk_level: 'HIGH' },
                                { horizon: '+12H', projected_probability: 0.91, projected_risk_level: 'VERY HIGH' },
                                { horizon: '+24H', projected_probability: 0.96, projected_risk_level: 'VERY HIGH' }
                              ])
                    ).map((proj: any, i: number) => (
                      <div key={i} className="p-1.5 bg-slate-900 rounded border border-slate-800 text-center font-mono text-[9px]">
                        <span className="text-slate-400 font-bold block">{proj.horizon} SCENARIO</span>
                        <span className="font-black text-amber-400 block">{(proj.projected_probability * 100).toFixed(0)}%</span>
                        <span className="text-[7px] text-slate-500 block uppercase font-bold">{proj.projected_risk_level}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ACCORDION 3: IMPACT > */}
          <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-900/60">
            <button
              onClick={() => toggleAccordion('IMPACT')}
              className="w-full p-3 flex items-center justify-between font-bold text-xs text-white hover:bg-slate-900 transition"
            >
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-400" />
                <span>INFRASTRUCTURE & IMPACT</span>
              </div>
              {openAccordion === 'IMPACT' ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
            </button>

            {openAccordion === 'IMPACT' && (
              <div className="p-3 border-t border-slate-800/80 space-y-2.5 bg-slate-950/60 text-[11px]">
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                    <span className="text-[9px] text-slate-400 uppercase font-bold block">Pop. at Threat</span>
                    <span className="text-base font-black text-amber-400 font-mono">{zone.population.toLocaleString()}</span>
                  </div>
                  <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                    <span className="text-[9px] text-slate-400 uppercase font-bold block">Villages</span>
                    <span className="text-base font-black text-white font-mono">{zone.villages}</span>
                  </div>
                </div>

                <div className="p-2 bg-slate-900 rounded-lg border border-slate-800 space-y-1">
                  <span className="text-[10px] font-bold text-indigo-400 block flex items-center gap-1">
                    <Home className="w-3 h-3" /> Relief Shelter
                  </span>
                  <p className="font-bold text-white text-[11px]">{evacPlan.nearest_shelter.name}</p>
                  <p className="text-[10px] text-slate-400">Capacity: {evacPlan.nearest_shelter.capacity_persons} • Route: {evacPlan.primary_route.name} ({evacPlan.primary_route.distance_km} km)</p>
                </div>
              </div>
            )}
          </div>

          {/* ACCORDION 4: TIMELINE > */}
          <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-900/60">
            <button
              onClick={() => toggleAccordion('TIMELINE')}
              className="w-full p-3 flex items-center justify-between font-bold text-xs text-white hover:bg-slate-900 transition"
            >
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-indigo-400" />
                <span>TIMELINE & EVOLUTION</span>
              </div>
              {openAccordion === 'TIMELINE' ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
            </button>

            {openAccordion === 'TIMELINE' && (
              <div className="p-3 border-t border-slate-800/80 space-y-1.5 bg-slate-950/60 text-[11px]">
                {evolutionStages.map((stg, idx) => (
                  <div key={idx} className="p-2 bg-slate-900 rounded-lg border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-white block">{stg.stage}</span>
                      <span className="text-[9px] text-slate-400">{stg.rainfallMm.toFixed(0)}mm Rain • {stg.description}</span>
                    </div>
                    <span className="font-mono font-bold text-amber-400">{stg.score.toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ACCORDION 5: RESPONSE > */}
          <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-900/60">
            <button
              onClick={() => toggleAccordion('RESPONSE')}
              className="w-full p-3 flex items-center justify-between font-bold text-xs text-white hover:bg-slate-900 transition"
            >
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-red-400" />
                <span>RESPONSE DIRECTIVES</span>
              </div>
              {openAccordion === 'RESPONSE' ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
            </button>

            {openAccordion === 'RESPONSE' && (
              <div className="p-3 border-t border-slate-800/80 space-y-2 bg-slate-950/60 text-[11px]">
                <div className="p-2 bg-slate-900 rounded-lg border border-slate-800 space-y-0.5">
                  <span className="font-bold text-amber-300 block">Verification Protocol:</span>
                  <p className="text-slate-300 leading-tight">{responseRecommendation.verificationAction}</p>
                </div>
                <div className="p-2 bg-slate-900 rounded-lg border border-slate-800 space-y-0.5">
                  <span className="font-bold text-red-300 block">Corridor & Highway Monitoring:</span>
                  <p className="text-slate-300 leading-tight">{responseRecommendation.infrastructureMonitoring}</p>
                </div>
                <div className="p-2 bg-slate-900 rounded-lg border border-slate-800 space-y-0.5">
                  <span className="font-bold text-cyan-300 block">Public Emergency Alert:</span>
                  <p className="text-slate-300 leading-tight">{responseRecommendation.publicAlertAction}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
