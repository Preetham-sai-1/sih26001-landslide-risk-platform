import React, { useState } from 'react';
import { LiveWeatherStation, LiveWeatherStatus } from '../types';
import { 
  Radio, 
  CloudRain, 
  Thermometer, 
  Droplets, 
  Wind, 
  CloudLightning, 
  Clock, 
  MapPin, 
  RefreshCw, 
  ExternalLink,
  ShieldAlert,
  AlertTriangle,
  Layers,
  Database,
  Search
} from 'lucide-react';

interface LiveWeatherCenterProps {
  liveStatus: LiveWeatherStatus | null;
  stations: LiveWeatherStation[];
  onOpenDataSources?: () => void;
}

export const LiveWeatherCenter: React.FC<LiveWeatherCenterProps> = ({
  liveStatus,
  stations,
  onOpenDataSources,
}) => {
  const [selectedStationId, setSelectedStationId] = useState<string>(stations[0]?.station_id || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [warningFilter, setWarningFilter] = useState<'ALL' | 'RED' | 'ORANGE' | 'YELLOW' | 'GREEN'>('ALL');

  const status = liveStatus?.status || 'LIVE';
  const observationTime = liveStatus?.observation_time 
    ? new Date(liveStatus.observation_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' IST'
    : 'Real-Time Sync';

  const filteredStations = stations.filter(s => {
    const matchesSearch = !searchQuery || 
      s.station_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.district.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.state.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesWarning = warningFilter === 'ALL' || s.warning_level === warningFilter;
    return matchesSearch && matchesWarning;
  });

  const activeStation = stations.find(s => s.station_id === selectedStationId) || filteredStations[0] || stations[0];

  const getWarningBadge = (level: string) => {
    switch (level) {
      case 'RED': return 'bg-red-500/20 text-red-300 border-red-500/40';
      case 'ORANGE': return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'YELLOW': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40';
      case 'GREEN': default: return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-slate-950 text-slate-100 overflow-hidden select-none">
      {/* Header Strip */}
      <div className="p-4 bg-slate-900/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Radio className="w-5 h-5 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold text-white font-sans">
                LIVE IMD WEATHER & AWS TELEMETRY
              </h2>
              <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded border font-mono ${
                status === 'LIVE' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
              }`}>
                {status === 'LIVE' ? 'IMD AWS LIVE' : 'CACHED FEED'}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              National Automatic Weather Station Network • RMC Guwahati • 12 NER Telemetry Nodes
            </p>
          </div>
        </div>

        {/* Controls & Actions */}
        <div className="flex items-center gap-3 text-xs">
          <span className="font-mono text-slate-400 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-brand-400" />
            <span>Obs: {observationTime}</span>
          </span>

          {onOpenDataSources && (
            <button
              onClick={onOpenDataSources}
              className="py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-semibold flex items-center gap-1.5 border border-slate-700 transition"
            >
              <Database className="w-3.5 h-3.5 text-blue-400" />
              <span>Data Provenance</span>
            </button>
          )}
        </div>
      </div>

      {/* Main 2-Column Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Column: Stations Directory & Filters */}
        <div className="w-full lg:w-[380px] border-r border-slate-800 bg-slate-950/60 flex flex-col shrink-0">
          {/* Search & Warning Filter */}
          <div className="p-3 border-b border-slate-800 space-y-2 bg-slate-900/40">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search station, district, state..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
              />
            </div>

            <div className="flex items-center gap-1 text-[10px] font-bold">
              {(['ALL', 'RED', 'ORANGE', 'YELLOW', 'GREEN'] as const).map(w => (
                <button
                  key={w}
                  onClick={() => setWarningFilter(w)}
                  className={`py-1 px-2 rounded-lg transition ${
                    warningFilter === w ? 'bg-brand-600 text-white shadow' : 'bg-slate-900 text-slate-400 hover:text-white'
                  }`}
                >
                  {w}
                </button>
              ))}
            </div>
          </div>

          {/* Station Cards List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            {filteredStations.map(st => {
              const isSelected = activeStation?.station_id === st.station_id;
              return (
                <div
                  key={st.station_id}
                  onClick={() => setSelectedStationId(st.station_id)}
                  className={`p-3 rounded-xl border transition cursor-pointer ${
                    isSelected
                      ? 'bg-slate-900 border-brand-500/80 shadow-md ring-1 ring-brand-500/40'
                      : 'bg-slate-950/80 hover:bg-slate-900/60 border-slate-800/80'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-brand-400 shrink-0" />
                      <h4 className="font-bold text-white text-xs">{st.station_name}</h4>
                    </div>
                    <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded border font-mono ${getWarningBadge(st.warning_level)}`}>
                      {st.warning_level}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>{st.district}, {st.state}</span>
                    <span className="font-mono font-bold text-emerald-400">{st.rainfall_24h_mm.toFixed(1)} mm/24h</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Selected Station Comprehensive Telemetry */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-950">
          {activeStation ? (
            <div className="max-w-3xl space-y-5">
              {/* Station Hero Card */}
              <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 space-y-3 shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-brand-400 uppercase tracking-widest block">
                      STATION ID: {activeStation.station_id} • ELEVATION {activeStation.elevation_m}m
                    </span>
                    <h3 className="text-xl font-black text-white font-sans">{activeStation.station_name} Observatory</h3>
                    <p className="text-xs text-slate-400">{activeStation.district}, {activeStation.state} • Lat: {activeStation.lat.toFixed(4)}°N, Lon: {activeStation.lon.toFixed(4)}°E</p>
                  </div>
                  <span className={`text-xs font-extrabold px-3 py-1 rounded-xl border font-mono ${getWarningBadge(activeStation.warning_level)}`}>
                    {activeStation.warning_level} ALERT
                  </span>
                </div>

                {/* Nowcast Advisory Banner */}
                {activeStation.warning_message && (
                  <div className={`p-3 rounded-xl border text-xs space-y-1 ${
                    activeStation.warning_level === 'RED' ? 'bg-red-950/30 border-red-500/40 text-red-200' :
                    activeStation.warning_level === 'ORANGE' ? 'bg-amber-950/30 border-amber-500/40 text-amber-200' :
                    'bg-slate-950 border-slate-800 text-slate-300'
                  }`}>
                    <span className="font-extrabold flex items-center gap-1.5 text-[11px] uppercase">
                      <CloudLightning className="w-3.5 h-3.5" /> IMD Nowcast Warning Directive
                    </span>
                    <p className="text-[11px] leading-relaxed">{activeStation.warning_message}</p>
                  </div>
                )}
              </div>

              {/* 4 Primary Telemetry Metrics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800/80 space-y-1">
                  <div className="flex items-center gap-1.5 text-slate-400 text-xs font-semibold">
                    <CloudRain className="w-4 h-4 text-emerald-400" />
                    <span>1h Precipitation</span>
                  </div>
                  <div className="flex items-baseline gap-1 font-mono">
                    <span className="text-2xl font-black text-emerald-300">{activeStation.rainfall_1h_mm.toFixed(1)}</span>
                    <span className="text-xs text-slate-400">mm/h</span>
                  </div>
                  <span className="text-[10px] text-slate-500 block font-mono">24h Total: {activeStation.rainfall_24h_mm.toFixed(1)} mm</span>
                </div>

                <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800/80 space-y-1">
                  <div className="flex items-center gap-1.5 text-slate-400 text-xs font-semibold">
                    <Thermometer className="w-4 h-4 text-rose-400" />
                    <span>Temperature</span>
                  </div>
                  <span className="text-2xl font-black text-white font-mono block">{activeStation.temperature_c.toFixed(1)}°C</span>
                  <span className="text-[10px] text-slate-500 block">Ambient surface temp</span>
                </div>

                <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800/80 space-y-1">
                  <div className="flex items-center gap-1.5 text-slate-400 text-xs font-semibold">
                    <Droplets className="w-4 h-4 text-cyan-400" />
                    <span>Relative Humidity</span>
                  </div>
                  <span className="text-2xl font-black text-cyan-300 font-mono block">{activeStation.humidity_pct}%</span>
                  <span className="text-[10px] text-slate-500 block">Atmospheric moisture</span>
                </div>

                <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800/80 space-y-1">
                  <div className="flex items-center gap-1.5 text-slate-400 text-xs font-semibold">
                    <Wind className="w-4 h-4 text-indigo-400" />
                    <span>Surface Wind</span>
                  </div>
                  <span className="text-xl font-black text-slate-200 font-mono block truncate">{activeStation.wind_speed_kmh.toFixed(1)} kph</span>
                  <span className="text-[10px] text-slate-500 block font-mono">Direction: {activeStation.wind_direction}</span>
                </div>
              </div>

              {/* Data Ingestion & Architecture Info */}
              <div className="bg-slate-900/40 p-4 rounded-2xl border border-slate-800 text-xs text-slate-400 space-y-1">
                <span className="font-bold text-slate-300 block">Observational Pipeline & Governance</span>
                <p className="text-[11px] leading-relaxed">
                  Real-time telemetry ingested from the India Meteorological Department (IMD) AWS network. Observations represent point-source meteorological measurements at the station location and serve as dynamic trigger inputs over static SRTM digital elevation slope models.
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-slate-500">
              <Radio className="w-8 h-8 mx-auto text-slate-600 mb-2" />
              <p className="text-sm font-semibold">Select an IMD Weather Station to view telemetry</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
