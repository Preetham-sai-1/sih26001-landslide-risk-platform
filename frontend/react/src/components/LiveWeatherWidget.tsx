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
  ChevronRight, 
  ChevronDown, 
  ChevronUp,
  MapPin,
  RefreshCw,
  ExternalLink
} from 'lucide-react';

interface LiveWeatherWidgetProps {
  liveStatus: LiveWeatherStatus | null;
  stations: LiveWeatherStation[];
  selectedState?: string;
  onOpenDataSources?: () => void;
}

export const LiveWeatherWidget: React.FC<LiveWeatherWidgetProps> = ({
  liveStatus,
  stations,
  selectedState = 'All',
  onOpenDataSources,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeStationIndex, setActiveStationIndex] = useState(0);

  // Filter stations by state if a state is selected
  const filteredStations = selectedState && selectedState !== 'All'
    ? stations.filter(s => s.state.toLowerCase() === selectedState.toLowerCase())
    : stations;

  const currentStation = filteredStations[activeStationIndex % Math.max(1, filteredStations.length)] || stations[0];

  const status = liveStatus?.status || 'LIVE';
  const dataAge = liveStatus?.data_age || (status === 'LIVE' ? 'Real-time sync' : 'Cached feed');

  const warningColor = currentStation?.warning_level === 'RED'
    ? 'text-red-400 bg-red-500/20 border-red-500/40'
    : currentStation?.warning_level === 'ORANGE'
    ? 'text-amber-400 bg-amber-500/20 border-amber-500/40'
    : currentStation?.warning_level === 'YELLOW'
    ? 'text-yellow-400 bg-yellow-500/20 border-yellow-500/40'
    : 'text-emerald-400 bg-emerald-500/20 border-emerald-500/40';

  if (!currentStation) return null;

  return (
    <div className="glass-panel rounded-2xl border border-slate-800 bg-slate-950/90 backdrop-blur-xl shadow-2xl overflow-hidden transition-all duration-300 select-none text-xs w-72 md:w-80">
      {/* Widget Header */}
      <div 
        onClick={() => setIsCollapsed(prev => !prev)}
        className="p-3 border-b border-slate-800 bg-slate-900/80 flex items-center justify-between cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <Radio className={`w-4 h-4 ${status === 'LIVE' ? 'text-emerald-400 animate-pulse' : 'text-amber-400'}`} />
          <div>
            <span className="font-extrabold text-white text-[11px] uppercase tracking-wider block">
              IMD LIVE WEATHER
            </span>
            <span className="text-[9px] text-slate-400">
              National AWS & RMC Guwahati Feed
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border font-mono ${
            status === 'LIVE' 
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' 
              : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
          }`}>
            {status}
          </span>
          {isCollapsed ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronUp className="w-3.5 h-3.5 text-slate-400" />}
        </div>
      </div>

      {!isCollapsed && (
        <div className="p-3 space-y-2.5">
          {/* Station Selector Bar */}
          <div className="flex items-center justify-between bg-slate-900/90 p-1.5 rounded-xl border border-slate-800 text-[10px]">
            <div className="flex items-center gap-1 truncate max-w-[190px]">
              <MapPin className="w-3 h-3 text-brand-400 shrink-0" />
              <span className="font-bold text-slate-200 truncate">{currentStation.station_name}</span>
            </div>
            
            {filteredStations.length > 1 && (
              <div className="flex items-center gap-1 font-mono text-[9px]">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveStationIndex(prev => (prev - 1 + filteredStations.length) % filteredStations.length);
                  }}
                  className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  ◀
                </button>
                <span className="text-slate-400">{activeStationIndex + 1}/{filteredStations.length}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveStationIndex(prev => (prev + 1) % filteredStations.length);
                  }}
                  className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  ▶
                </button>
              </div>
            )}
          </div>

          {/* District & Observation Timestamp */}
          <div className="flex items-center justify-between text-[10px] text-slate-400 px-0.5">
            <span>{currentStation.district}, {currentStation.state}</span>
            <span className="font-mono text-slate-300 flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-400" />
              {currentStation.observation_time 
                ? new Date(currentStation.observation_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : '12m ago'}
            </span>
          </div>

          {/* 4 Core Metrics Grid */}
          <div className="grid grid-cols-2 gap-2">
            {/* 1h / 24h Rainfall */}
            <div className="bg-slate-900/60 p-2 rounded-xl border border-slate-800/80 space-y-0.5">
              <div className="flex items-center gap-1 text-[9px] text-slate-400">
                <CloudRain className="w-3 h-3 text-emerald-400" />
                <span>Precipitation</span>
              </div>
              <div className="flex items-baseline justify-between font-mono">
                <span className="text-sm font-black text-emerald-300">{currentStation.rainfall_1h_mm.toFixed(1)} <span className="text-[9px] font-normal text-slate-400">mm/h</span></span>
                <span className="text-[10px] font-bold text-cyan-300">24h: {currentStation.rainfall_24h_mm.toFixed(1)}</span>
              </div>
            </div>

            {/* Temperature */}
            <div className="bg-slate-900/60 p-2 rounded-xl border border-slate-800/80 space-y-0.5">
              <div className="flex items-center gap-1 text-[9px] text-slate-400">
                <Thermometer className="w-3 h-3 text-rose-400" />
                <span>Temperature</span>
              </div>
              <span className="text-sm font-black text-white font-mono block">
                {currentStation.temperature_c.toFixed(1)}°C
              </span>
            </div>

            {/* Humidity */}
            <div className="bg-slate-900/60 p-2 rounded-xl border border-slate-800/80 space-y-0.5">
              <div className="flex items-center gap-1 text-[9px] text-slate-400">
                <Droplets className="w-3 h-3 text-cyan-400" />
                <span>Humidity</span>
              </div>
              <span className="text-xs font-bold text-cyan-300 font-mono block">
                {currentStation.humidity_pct}% RH
              </span>
            </div>

            {/* Surface Wind */}
            <div className="bg-slate-900/60 p-2 rounded-xl border border-slate-800/80 space-y-0.5">
              <div className="flex items-center gap-1 text-[9px] text-slate-400">
                <Wind className="w-3 h-3 text-indigo-400" />
                <span>Wind Velocity</span>
              </div>
              <span className="text-xs font-bold text-slate-200 font-mono truncate block">
                {currentStation.wind_speed_kmh.toFixed(1)}kph {currentStation.wind_direction}
              </span>
            </div>
          </div>

          {/* Nowcast Warning Bar */}
          {currentStation.warning_level && (
            <div className={`p-2 rounded-xl border text-[10px] space-y-0.5 ${warningColor}`}>
              <div className="flex items-center justify-between font-extrabold">
                <span className="flex items-center gap-1">
                  <CloudLightning className="w-3 h-3" />
                  <span>Nowcast Advisory</span>
                </span>
                <span className="uppercase text-[9px]">{currentStation.warning_level}</span>
              </div>
              <p className="text-[9px] leading-tight text-slate-200">
                {currentStation.warning_message}
              </p>
            </div>
          )}

          {/* Footer Data Freshness & Attribution */}
          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[9px] text-slate-500">
            <span>{dataAge}</span>
            {onOpenDataSources && (
              <button 
                onClick={onOpenDataSources}
                className="text-blue-400 hover:text-blue-300 flex items-center gap-0.5 font-medium"
              >
                <span>Provenance</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
