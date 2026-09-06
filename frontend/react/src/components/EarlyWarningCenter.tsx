import React, { useState } from 'react';
import { RiskZone, ForecastHorizon, EscalatingCell, ResponseRecommendation, LiveWeatherStation } from '../types';
import { evaluateAllZonesForecast, getEscalatingCellsOnly } from '../utils/forecastEngine';
import { generateResponseRecommendations } from '../utils/simulation';
import { RiskMap } from './RiskMap';
import { ZoneInspector } from './ZoneInspector';
import {
  CloudLightning,
  AlertTriangle,
  ShieldAlert,
  ArrowRight,
  Send,
  Activity,
  ClipboardList,
  Clock,
  TrendingUp,
  Layers,
  MapPin,
  ChevronRight,
  Filter,
  Info
} from 'lucide-react';

interface EarlyWarningCenterProps {
  zones: RiskZone[];
  selectedZone: RiskZone | null;
  onSelectZone: (zone: RiskZone) => void;
  isDarkMode: boolean;
  onOpenAlertModal: (zone?: RiskZone) => void;
  onOpenFieldReport: (zone: RiskZone) => void;
  onCreateResponsePlan: (zone: RiskZone, recommendation: ResponseRecommendation) => void;
  isDemoMode: boolean;
  liveWeatherStations?: LiveWeatherStation[];
}

export const EarlyWarningCenter: React.FC<EarlyWarningCenterProps> = ({
  zones,
  selectedZone,
  onSelectZone,
  isDarkMode,
  onOpenAlertModal,
  onOpenFieldReport,
  onCreateResponsePlan,
  isDemoMode,
  liveWeatherStations = [],
}) => {

  const [horizon, setHorizon] = useState<ForecastHorizon>('+12H');
  const [filterSeverity, setFilterSeverity] = useState<'ALL' | 'CRITICAL' | 'ESCALATING'>('ALL');

  const allForecastCells = evaluateAllZonesForecast(zones, horizon);
  const escalatingCells = allForecastCells.filter(c => c.isEscalating);

  const displayedCells = allForecastCells.filter(c => {
    if (filterSeverity === 'CRITICAL') return c.forecastRisk === 'VERY HIGH' || c.priority === 'P1 CRITICAL';
    if (filterSeverity === 'ESCALATING') return c.isEscalating;
    return true;
  });

  const criticalEscalations = escalatingCells.filter(c => c.forecastRisk === 'VERY HIGH' || c.priority === 'P1 CRITICAL').length;
  const highEscalations = escalatingCells.filter(c => c.forecastRisk === 'HIGH' || c.priority === 'P2 HIGH').length;

  const horizons: ForecastHorizon[] = ['CURRENT', '+6H', '+12H', '+24H'];

  return (
    <div className="w-full h-full flex flex-col bg-slate-950 overflow-hidden select-none">
      {/* Top Early Warning Operations Strip */}
      <div className="p-3.5 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0 shadow-lg z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 via-orange-600 to-rose-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
            <CloudLightning className="w-5 h-5 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm md:text-base font-extrabold text-white font-sans">
                EARLY WARNING FORECAST CENTER
              </h2>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                SCENARIO PROJECTION ENGINE
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Northeast India Meteorological Storm Front & Cut-Slope Saturation Projections
            </p>
          </div>
        </div>

        {/* Forecast Horizon Switcher */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-semibold hidden md:inline">Forecast Window:</span>
          <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-xl border border-slate-800">
            {horizons.map((h) => (
              <button
                key={h}
                onClick={() => setHorizon(h)}
                className={`py-1.5 px-3 rounded-lg text-xs font-extrabold transition-all duration-200 ${
                  horizon === h
                    ? h === 'CURRENT'
                      ? 'bg-brand-600 text-white shadow'
                      : 'bg-gradient-to-r from-amber-600 to-rose-600 text-white shadow-md shadow-amber-500/30 border border-amber-400/40 scale-105'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                {h}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 p-3 bg-slate-950/80 border-b border-slate-800/80 shrink-0">
        <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800/80 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase block">Escalating Sectors</span>
            <span className="text-xl font-black text-amber-400 font-mono">{escalatingCells.length} Zones</span>
          </div>
          <AlertTriangle className="w-6 h-6 text-amber-400/60" />
        </div>

        <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800/80 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase block">Critical Escalations</span>
            <span className="text-xl font-black text-red-400 font-mono">{criticalEscalations} Zones</span>
          </div>
          <ShieldAlert className="w-6 h-6 text-red-400/60" />
        </div>

        <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800/80 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase block">High Vulnerability</span>
            <span className="text-xl font-black text-orange-400 font-mono">{highEscalations} Zones</span>
          </div>
          <TrendingUp className="w-6 h-6 text-orange-400/60" />
        </div>

        <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800/80 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase block">Threatened Highways</span>
            <span className="text-xl font-black text-cyan-400 font-mono">NH-27 / NH-13 / NH-54</span>
          </div>
          <Layers className="w-6 h-6 text-cyan-400/60" />
        </div>
      </div>

      {/* Main Split Body: Map on Left, Ranked Escalations on Right */}
      <div className="flex-1 relative flex overflow-hidden">
        {/* Central Map Area with Forecast Layer */}
        <div className="flex-1 h-full relative">
          <RiskMap
            zones={zones}
            selectedZone={selectedZone}
            onSelectZone={onSelectZone}
            isDarkMode={isDarkMode}
            forecastHorizon={horizon}
            onForecastHorizonChange={setHorizon}
            liveWeatherStations={liveWeatherStations}
          />

        </div>

        {/* Right Operations Escalation Drawer */}
        <div className="w-full lg:w-[440px] h-full bg-slate-900/95 backdrop-blur-xl border-l border-slate-800 flex flex-col z-20 shadow-2xl overflow-hidden">
          {/* Header & Filter */}
          <div className="p-3.5 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CloudLightning className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-extrabold text-white uppercase tracking-wider">
                Ranked Escalation Queue ({horizon})
              </span>
            </div>
            
            {/* Filter Pills */}
            <div className="flex items-center gap-1 text-[10px] font-bold">
              {(['ALL', 'ESCALATING', 'CRITICAL'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilterSeverity(f)}
                  className={`px-2 py-0.5 rounded transition-all ${
                    filterSeverity === f
                      ? 'bg-amber-500 text-slate-950 font-black'
                      : 'text-slate-400 hover:text-white bg-slate-900'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Scrollable Escalation List */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
            {displayedCells.map((item, idx) => {
              const isSelected = selectedZone?.grid_id === item.zone.grid_id;
              const rec = generateResponseRecommendations(item.zone, item.forecastScore, item.forecastRisk);

              return (
                <div
                  key={item.zone.grid_id}
                  onClick={() => onSelectZone(item.zone)}
                  className={`p-3.5 rounded-xl border transition-all duration-200 cursor-pointer space-y-2.5 ${
                    isSelected
                      ? 'bg-slate-950 border-amber-500 shadow-lg shadow-amber-500/10 ring-1 ring-amber-500/50'
                      : item.isEscalating
                      ? 'bg-slate-950/80 hover:bg-slate-950 border-amber-500/40 hover:border-amber-400'
                      : 'bg-slate-950/50 hover:bg-slate-950/80 border-slate-800'
                  }`}
                >
                  {/* Card Top Row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[10px] font-black bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded">
                        #{idx + 1}
                      </span>
                      <h4 className="font-extrabold text-white text-xs font-sans truncate max-w-[170px]">{item.zone.name}</h4>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {item.isEscalating && (
                        <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                          {item.transition}
                        </span>
                      )}
                      <span className="font-extrabold text-amber-400 text-xs font-mono">{item.forecastScore.toFixed(1)}%</span>
                    </div>
                  </div>

                  {/* District & Highway Corridor */}
                  <div className="text-[11px] text-slate-400 flex items-center justify-between">
                    <span>{item.zone.district}, {item.zone.state}</span>
                    <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-indigo-950/60 text-indigo-300 border border-indigo-800/60">
                      {item.highwayCorridor}
                    </span>
                  </div>

                  {/* Transition Progression Box */}
                  <div className="bg-slate-900/90 p-2 rounded-lg border border-slate-800/80 text-[10px] space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Risk Transition ({horizon}):</span>
                      <span className="font-bold text-amber-300 font-mono">
                        {item.currentRisk} ({item.currentScore.toFixed(1)}%) → {item.forecastRisk} ({item.forecastScore.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Projected 24h Rain:</span>
                      <span className="font-bold text-cyan-400 font-mono">
                        {item.forecast24hRain.toFixed(1)} mm (+{item.addedRainMm}mm storm surge)
                      </span>
                    </div>
                  </div>

                  {/* Recommended Action Summary */}
                  <p className="text-[10px] text-slate-300 italic leading-tight line-clamp-2">
                    {item.recommendedAction}
                  </p>

                  {/* Action Directives: VERIFY | CREATE RESPONSE PLAN | ALERT */}
                  <div className="grid grid-cols-3 gap-1.5 pt-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenFieldReport(item.zone);
                      }}
                      className="py-1.5 text-[10px] font-bold bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 rounded-lg flex items-center justify-center gap-1 transition-colors"
                    >
                      <Activity className="w-3 h-3" /> VERIFY
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onCreateResponsePlan(item.zone, rec);
                      }}
                      className="py-1.5 text-[10px] font-bold bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 rounded-lg flex items-center justify-center gap-1 transition-colors truncate"
                    >
                      <ClipboardList className="w-3 h-3 shrink-0" /> PLAN
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenAlertModal(item.zone);
                      }}
                      className="py-1.5 text-[10px] font-bold bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/40 rounded-lg flex items-center justify-center gap-1 transition-colors"
                    >
                      <Send className="w-3 h-3" /> ALERT
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer Disclaimer */}
          <div className="p-2.5 border-t border-slate-800 bg-slate-950 text-[9px] text-slate-500 text-center italic flex items-center justify-center gap-1.5">
            <Info className="w-3 h-3 text-slate-400 shrink-0" />
            <span>Prototype Early Warning Scenario Engine • Non-official decision support.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
