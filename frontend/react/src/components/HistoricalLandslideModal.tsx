import React from 'react';
import { HistoricalLandslidePoint } from '../utils/landslideHistory';
import { 
  MapPin, 
  X, 
  Calendar, 
  FileText, 
  Layers, 
  CloudRain, 
  AlertTriangle, 
  ExternalLink,
  ShieldCheck,
  ChevronRight,
  Database
} from 'lucide-react';
import { RiskZone } from '../types';

interface HistoricalLandslideModalProps {
  event: HistoricalLandslidePoint | null;
  onClose: () => void;
  onSelectNearestZone?: (zone: RiskZone) => void;
  nearbyZone?: RiskZone | null;
}

export const HistoricalLandslideModal: React.FC<HistoricalLandslideModalProps> = ({
  event,
  onClose,
  onSelectNearestZone,
  nearbyZone,
}) => {
  if (!event) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn text-slate-100">
      <div 
        className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-w-lg w-full flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-amber-400">{event.event_id}</span>
                <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  GSI GROUND TRUTH
                </span>
              </div>
              <h3 className="font-extrabold text-sm text-white">{event.location_name}</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* Location & Coordinates Strip */}
          <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800 space-y-1.5 font-sans">
            <div className="flex items-center justify-between text-slate-300 font-semibold">
              <span>{event.district}, {event.state}</span>
              <span className="font-mono text-slate-400">
                {event.lat.toFixed(4)}°N, {event.lon.toFixed(4)}°E
              </span>
            </div>
            <div className="flex items-center gap-4 text-[11px] text-slate-400">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-brand-400" />
                <span>Event Date: <strong>{event.date_str || event.year || 'Historical Record'}</strong></span>
              </span>
              <span className="text-emerald-400 font-semibold">Verified Field Record</span>
            </div>
          </div>

          {/* Geological & Landslide Attributes */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800 space-y-1">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Landslide Classification</span>
              <span className="font-bold text-amber-300 text-[11px] block">{event.landslide_type}</span>
            </div>

            <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800 space-y-1">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Triggering Mechanism</span>
              <span className="font-bold text-cyan-300 text-[11px] block">{event.trigger_cause}</span>
            </div>
          </div>

          {/* Geological Formation */}
          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 space-y-1">
            <div className="flex items-center gap-1.5 text-slate-400 font-semibold text-[10px] uppercase">
              <Layers className="w-3.5 h-3.5 text-purple-400" />
              <span>Bedrock & Lithological Formation</span>
            </div>
            <p className="text-slate-200 font-medium text-xs leading-relaxed">
              {event.geology_formation}
            </p>
          </div>

          {/* Antecedent Rainfall & Historical Impact */}
          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-slate-400 font-semibold text-[10px] uppercase">
                <CloudRain className="w-3.5 h-3.5 text-emerald-400" />
                <span>Historical Meteorological Context</span>
              </div>
              <span className="font-mono text-emerald-400 font-bold">
                {event.antecedent_rainfall_mm ? `${event.antecedent_rainfall_mm.toFixed(1)} mm Cumulative` : 'Archival Data'}
              </span>
            </div>
            {event.historical_fatalities !== undefined && (
              <div className="flex items-center justify-between text-[11px] text-slate-300 pt-1 border-t border-slate-800/80">
                <span className="text-slate-400">Historical Casualties / Fatalities:</span>
                <span className="font-bold text-rose-300">{event.historical_fatalities > 0 ? `${event.historical_fatalities} Recorded` : '0 Reported (Infrastructure Loss Only)'}</span>
              </div>
            )}
          </div>

          {/* Authoritative Source Reference */}
          <div className="bg-blue-950/20 p-2.5 rounded-xl border border-blue-900/40 text-[10px] text-slate-300 space-y-1">
            <div className="flex items-center gap-1 text-blue-400 font-bold">
              <Database className="w-3.5 h-3.5" />
              <span>Authoritative Documentation</span>
            </div>
            <p className="italic text-slate-400">{event.source_reference}</p>
          </div>

          {/* Nearby Live Risk Zone Link */}
          {nearbyZone && (
            <div className="p-3 rounded-xl bg-gradient-to-r from-slate-950 to-brand-950/40 border border-brand-500/30 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 uppercase block">Adjacent Monitored Spatial Grid</span>
                <span className="font-bold text-white text-xs">{nearbyZone.name} ({nearbyZone.risk})</span>
              </div>
              {onSelectNearestZone && (
                <button
                  onClick={() => {
                    onSelectNearestZone(nearbyZone);
                    onClose();
                  }}
                  className="px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs flex items-center gap-1 shadow transition"
                >
                  <span>Inspect</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
