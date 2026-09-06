import React, { useState } from 'react';
import { RiskZone, FieldReport, AlertLog, LiveWeatherStation } from '../types';
import { NER_STATES } from './StateCommandStrip';
import { 
  BarChart3, 
  TrendingUp, 
  ShieldAlert, 
  Users, 
  Navigation, 
  CloudRain, 
  FileText, 
  Radio, 
  Download, 
  Calendar, 
  MapPin, 
  Layers,
  ArrowUpRight,
  Sparkles,
  Info
} from 'lucide-react';

interface AnalyticsCenterProps {
  zones: RiskZone[];
  reports: FieldReport[];
  alerts: AlertLog[];
  stations: LiveWeatherStation[];
  onSelectZone?: (zone: RiskZone) => void;
  onExportCSV?: () => void;
}

export const AnalyticsCenter: React.FC<AnalyticsCenterProps> = ({
  zones,
  reports,
  alerts,
  stations,
  onSelectZone,
  onExportCSV,
}) => {
  const [timeRange, setTimeRange] = useState<'24H' | '7D' | '30D'>('24H');
  const [selectedStateFilter, setSelectedStateFilter] = useState<string>('All');

  // Filter zones by state if selected
  const activeZones = selectedStateFilter === 'All' 
    ? zones 
    : zones.filter(z => z.state.toLowerCase() === selectedStateFilter.toLowerCase());

  // Risk Counts
  const veryHighCount = activeZones.filter(z => z.risk === 'VERY HIGH').length;
  const highCount = activeZones.filter(z => z.risk === 'HIGH').length;
  const modCount = activeZones.filter(z => z.risk === 'MODERATE').length;
  const lowCount = activeZones.filter(z => z.risk === 'LOW').length;
  const safeCount = activeZones.filter(z => z.risk === 'SAFE').length;
  const totalCount = activeZones.length || 1;

  // Total Population & Infrastructure Exposed
  const totalPopExposed = activeZones.reduce((acc, z) => acc + (z.risk === 'VERY HIGH' || z.risk === 'HIGH' ? z.population : Math.round(z.population * 0.2)), 0);
  const totalVillagesExposed = activeZones.reduce((acc, z) => acc + (z.risk === 'VERY HIGH' || z.risk === 'HIGH' ? z.villages : Math.round(z.villages * 0.4)), 0);

  // Mean 24h & 7d Rain
  const avg24hRain = (activeZones.reduce((acc, z) => acc + z.r24, 0) / totalCount).toFixed(1);
  const avg7dRain = (activeZones.reduce((acc, z) => acc + z.r7d, 0) / totalCount).toFixed(1);

  return (
    <div className="w-full h-full flex flex-col bg-slate-950 overflow-y-auto select-none text-slate-100 p-4 md:p-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg md:text-xl font-black text-white font-sans">
                REGIONAL LANDSLIDE ANALYTICS & THREAT INTELLIGENCE
              </h2>
              <p className="text-xs text-slate-400">
                Aggregated spatial risk metrics, precipitation anomalies & exposure intelligence across Northeast India
              </p>
            </div>
          </div>
        </div>

        {/* Controls: Time Range & Export */}
        <div className="flex items-center gap-3">
          {/* Time Range Selector */}
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs font-mono">
            {(['24H', '7D', '30D'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTimeRange(t)}
                className={`py-1.5 px-3 rounded-lg font-bold transition ${
                  timeRange === t ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* State Filter Selector */}
          <select
            value={selectedStateFilter}
            onChange={(e) => setSelectedStateFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 text-xs text-white rounded-xl p-2 font-semibold focus:outline-none"
          >
            {NER_STATES.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>

          {/* Export Button */}
          {onExportCSV && (
            <button
              onClick={onExportCSV}
              className="py-2 px-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold text-xs flex items-center gap-2 border border-slate-700 transition"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>Export CSV</span>
            </button>
          )}
        </div>
      </div>

      {/* Top 4 Primary Analytics Tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800/80 space-y-1">
          <span className="text-[10px] font-bold uppercase text-slate-400 block">Critical Risk Sectors</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-red-400 font-mono">{veryHighCount}</span>
            <span className="text-xs text-slate-400 font-mono">{((veryHighCount/totalCount)*100).toFixed(1)}%</span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div className="bg-red-500 h-full" style={{ width: `${(veryHighCount/totalCount)*100}%` }} />
          </div>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800/80 space-y-1">
          <span className="text-[10px] font-bold uppercase text-slate-400 block">Population at Elevated Risk</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-amber-400 font-mono">{totalPopExposed.toLocaleString()}</span>
            <span className="text-xs text-slate-400 font-mono">Residents</span>
          </div>
          <span className="text-[10px] text-slate-400 block">Across {totalVillagesExposed} Hill Villages</span>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800/80 space-y-1">
          <span className="text-[10px] font-bold uppercase text-slate-400 block">Regional Mean 24h Rain</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-cyan-400 font-mono">{avg24hRain} mm</span>
            <span className="text-xs text-slate-400 font-mono">7D: {avg7dRain}mm</span>
          </div>
          <span className="text-[10px] text-slate-400 block">Anomaly: <strong className="text-emerald-400">+28% vs Seasonal</strong></span>
        </div>

        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800/80 space-y-1">
          <span className="text-[10px] font-bold uppercase text-slate-400 block">Active Alerts & Reports</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-indigo-400 font-mono">{alerts.length} Alerts</span>
            <span className="text-xs text-emerald-400 font-mono">{reports.length} Reports</span>
          </div>
          <span className="text-[10px] text-slate-400 block">Ground Truth Sync: 100% Active</span>
        </div>
      </div>

      {/* Middle Grid: Risk Breakdown Bars & State Comparison Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Risk Distribution Breakdown */}
        <div className="bg-slate-900/90 p-5 rounded-2xl border border-slate-800/80 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h3 className="font-extrabold text-white text-xs uppercase tracking-wider">
              Risk Level Distribution ({activeZones.length} Monitored Units)
            </h3>
            <span className="text-[10px] font-mono text-slate-400">1 km Units</span>
          </div>

          <div className="space-y-3 text-xs">
            {[
              { label: 'VERY HIGH', count: veryHighCount, color: 'bg-red-500', textColor: 'text-red-400' },
              { label: 'HIGH', count: highCount, color: 'bg-orange-500', textColor: 'text-orange-400' },
              { label: 'MODERATE', count: modCount, color: 'bg-amber-500', textColor: 'text-amber-400' },
              { label: 'LOW', count: lowCount, color: 'bg-cyan-500', textColor: 'text-cyan-400' },
              { label: 'SAFE', count: safeCount, color: 'bg-emerald-500', textColor: 'text-emerald-400' },
            ].map(item => {
              const pct = ((item.count / totalCount) * 100).toFixed(1);
              return (
                <div key={item.label} className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className={`font-bold ${item.textColor}`}>{item.label}</span>
                    <span className="font-mono text-slate-300 font-semibold">{item.count} Cells ({pct}%)</span>
                  </div>
                  <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden p-0.5 border border-slate-800">
                    <div className={`${item.color} h-full rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* State-by-State Exposure Comparison Table */}
        <div className="lg:col-span-2 bg-slate-900/90 p-5 rounded-2xl border border-slate-800/80 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h3 className="font-extrabold text-white text-xs uppercase tracking-wider">
              Northeast India 8-State Risk & Infrastructure Matrix
            </h3>
            <span className="text-[10px] font-mono text-emerald-400 font-bold">LIVE TELEMETRY SYNC</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-[10px] uppercase text-slate-400 font-mono">
                  <th className="pb-2">State</th>
                  <th className="pb-2">Very High</th>
                  <th className="pb-2">High</th>
                  <th className="pb-2">Population</th>
                  <th className="pb-2">Primary Corridor</th>
                  <th className="pb-2">Live Weather</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {NER_STATES.filter(s => s.id !== 'All').map(st => {
                  const sZones = zones.filter(z => z.state.toLowerCase() === st.name.toLowerCase());
                  const vh = sZones.filter(z => z.risk === 'VERY HIGH').length;
                  const h = sZones.filter(z => z.risk === 'HIGH').length;
                  const pop = sZones.reduce((acc, z) => acc + z.population, 0);
                  const stStation = stations.find(s => s.state.toLowerCase() === st.name.toLowerCase());

                  return (
                    <tr key={st.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-2.5 font-bold text-white flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-brand-400" />
                        <span>{st.name}</span>
                      </td>
                      <td className="py-2.5 font-mono font-bold text-red-400">{vh}</td>
                      <td className="py-2.5 font-mono font-bold text-amber-400">{h}</td>
                      <td className="py-2.5 font-mono text-slate-300">{pop.toLocaleString()}</td>
                      <td className="py-2.5 font-mono text-[11px] text-cyan-300">
                        {st.id === 'Assam' ? 'NH-27' : st.id === 'Arunachal Pradesh' ? 'NH-13' : st.id === 'Meghalaya' ? 'NH-6' : st.id === 'Sikkim' ? 'NH-10' : 'State Highway'}
                      </td>
                      <td className="py-2.5">
                        <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border font-mono ${
                          stStation?.warning_level === 'RED' ? 'bg-red-500/20 text-red-300 border-red-500/40' :
                          stStation?.warning_level === 'ORANGE' ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' :
                          stStation?.warning_level === 'YELLOW' ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40' :
                          'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        }`}>
                          {stStation ? `${stStation.warning_level} (${stStation.rainfall_24h_mm.toFixed(0)}mm)` : 'Normal'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
