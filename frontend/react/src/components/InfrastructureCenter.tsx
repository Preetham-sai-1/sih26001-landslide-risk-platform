import React, { useState } from 'react';
import { RiskZone } from '../types';
import { 
  Layers, 
  MapPin, 
  Navigation, 
  AlertTriangle, 
  CheckCircle2, 
  ShieldAlert, 
  Activity, 
  Search, 
  Building, 
  Zap, 
  ArrowRight,
  ExternalLink
} from 'lucide-react';

interface InfrastructureCenterProps {
  zones: RiskZone[];
  onSelectZone?: (zone: RiskZone) => void;
}

export interface InfraCorridor {
  id: string;
  name: string;
  code: string;
  state: string;
  length_km: number;
  hazard_status: 'CRITICAL' | 'MONITORED' | 'CLEAR';
  critical_bridges: number;
  culverts: number;
  vulnerable_sectors: string[];
  traffic_status: 'Single Lane Restricted' | 'Monitored Normal' | 'Heavy Vehicle Diversion';
}

export const INFRA_CORRIDORS: InfraCorridor[] = [
  {
    id: "cor-1",
    name: "National Highway 27 (Haflong–Silchar Corridor)",
    code: "NH-27",
    state: "Assam",
    length_km: 184,
    hazard_status: "CRITICAL",
    critical_bridges: 12,
    culverts: 48,
    vulnerable_sectors: ["Haflong Hill Pass", "Jatinga Valley", "Mahur Sector"],
    traffic_status: "Single Lane Restricted"
  },
  {
    id: "cor-2",
    name: "Trans-Arunachal Highway (Tawang–Bomdila Pass)",
    code: "NH-13",
    state: "Arunachal Pradesh",
    length_km: 240,
    hazard_status: "CRITICAL",
    critical_bridges: 18,
    culverts: 62,
    vulnerable_sectors: ["Sela Pass Ridge", "Tawang Cut-Slope", "Dirang Valley"],
    traffic_status: "Heavy Vehicle Diversion"
  },
  {
    id: "cor-3",
    name: "Guwahati–Shillong–Silchar Highway",
    code: "NH-6",
    state: "Meghalaya",
    length_km: 210,
    hazard_status: "MONITORED",
    critical_bridges: 14,
    culverts: 54,
    vulnerable_sectors: ["Umiam Ridge", "East Khasi Escarpment"],
    traffic_status: "Monitored Normal"
  },
  {
    id: "cor-4",
    name: "Sevoke–Gangtok Lifeline Highway",
    code: "NH-10",
    state: "Sikkim",
    length_km: 125,
    hazard_status: "CRITICAL",
    critical_bridges: 8,
    culverts: 36,
    vulnerable_sectors: ["Teesta River Cut-Slope", "Rangpo Sector"],
    traffic_status: "Single Lane Restricted"
  },
  {
    id: "cor-5",
    name: "Aizawl–Lunglei Highway",
    code: "NH-54",
    state: "Mizoram",
    length_km: 165,
    hazard_status: "MONITORED",
    critical_bridges: 6,
    culverts: 32,
    vulnerable_sectors: ["Aizawl West Pass"],
    traffic_status: "Monitored Normal"
  },
  {
    id: "cor-6",
    name: "Dimapur–Kohima Corridor",
    code: "NH-29",
    state: "Nagaland",
    length_km: 74,
    hazard_status: "MONITORED",
    critical_bridges: 5,
    culverts: 28,
    vulnerable_sectors: ["Kohima Ridge Sector"],
    traffic_status: "Monitored Normal"
  }
];

export const InfrastructureCenter: React.FC<InfrastructureCenterProps> = ({
  zones,
  onSelectZone,
}) => {
  const [selectedCorridorId, setSelectedCorridorId] = useState<string>(INFRA_CORRIDORS[0].id);
  const [searchQuery, setSearchQuery] = useState('');

  const activeCorridor = INFRA_CORRIDORS.find(c => c.id === selectedCorridorId) || INFRA_CORRIDORS[0];

  const filteredCorridors = INFRA_CORRIDORS.filter(c =>
    !searchQuery ||
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.state.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-full h-full flex flex-col bg-slate-950 text-slate-100 overflow-hidden select-none">
      {/* Top Header */}
      <div className="p-4 bg-slate-900/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-brand-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Layers className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold text-white font-sans">
                INFRASTRUCTURE & LIFELINE CORRIDOR MONITORING
              </h2>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-brand-500/20 text-brand-300 border border-brand-500/40">
                8 NER STATES • HIGHWAY CUT-SLOPES
              </span>
            </div>
            <p className="text-xs text-slate-400">
              National Highways, Critical Mountain Bridges, Power Transmission Grids & Slope Subsidence
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-slate-400">Monitored Corridors:</span>
          <span className="font-bold text-white bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
            {INFRA_CORRIDORS.length} Arterial Routes
          </span>
        </div>
      </div>

      {/* Main 2-Column Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Column: Corridor List */}
        <div className="w-full lg:w-[380px] border-r border-slate-800 bg-slate-950/60 flex flex-col shrink-0">
          <div className="p-3 border-b border-slate-800 bg-slate-900/40">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search NH corridor, state..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {filteredCorridors.map(c => {
              const isSelected = activeCorridor.id === c.id;
              return (
                <div
                  key={c.id}
                  onClick={() => setSelectedCorridorId(c.id)}
                  className={`p-3 rounded-xl border transition cursor-pointer space-y-1.5 ${
                    isSelected
                      ? 'bg-slate-900 border-indigo-500/80 shadow-md ring-1 ring-indigo-500/40'
                      : 'bg-slate-950/80 hover:bg-slate-900/60 border-slate-800/80'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Navigation className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span className="font-bold text-white text-xs">{c.code}</span>
                      <span className="text-[10px] text-slate-400">({c.state})</span>
                    </div>
                    <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded border font-mono ${
                      c.hazard_status === 'CRITICAL' ? 'bg-red-500/20 text-red-300 border-red-500/40 animate-pulse' :
                      'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    }`}>
                      {c.hazard_status}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-300 truncate">{c.name}</p>

                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800/80 font-mono">
                    <span>{c.length_km} km</span>
                    <span className="text-cyan-300">{c.traffic_status}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Active Corridor Details */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-slate-950">
          <div className="max-w-3xl space-y-5">
            {/* Hero Card */}
            <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 space-y-3 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <span className="text-[10px] font-mono font-bold text-indigo-400 uppercase tracking-widest block">
                    NATIONAL ARTERIAL HIGHWAY CORRIDOR • {activeCorridor.state.toUpperCase()}
                  </span>
                  <h3 className="text-xl font-black text-white font-sans">{activeCorridor.name}</h3>
                  <p className="text-xs text-slate-400">Total Route Span: {activeCorridor.length_km} km • Strategic Lifeline Corridor</p>
                </div>
                <span className={`text-xs font-extrabold px-3 py-1 rounded-xl border font-mono ${
                  activeCorridor.hazard_status === 'CRITICAL' ? 'bg-red-500/20 text-red-300 border-red-500/40 animate-pulse' :
                  'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                }`}>
                  {activeCorridor.hazard_status} HAZARD
                </span>
              </div>

              {/* Traffic Directive */}
              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-400">Current Traffic & Movement Status:</span>
                <span className="font-extrabold text-amber-400 font-mono">{activeCorridor.traffic_status}</span>
              </div>
            </div>

            {/* Asset Vulnerability Counts */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800/80 space-y-1">
                <span className="text-xs text-slate-400 font-semibold block">Critical Bridges</span>
                <span className="text-2xl font-black text-white font-mono">{activeCorridor.critical_bridges}</span>
                <span className="text-[10px] text-slate-500 block">Single-span mountain crossings</span>
              </div>

              <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800/80 space-y-1">
                <span className="text-xs text-slate-400 font-semibold block">Drainage Culverts</span>
                <span className="text-2xl font-black text-cyan-300 font-mono">{activeCorridor.culverts}</span>
                <span className="text-[10px] text-slate-500 block">Monitored debris channels</span>
              </div>

              <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800/80 space-y-1">
                <span className="text-xs text-slate-400 font-semibold block">Vulnerable Sectors</span>
                <span className="text-2xl font-black text-amber-400 font-mono">{activeCorridor.vulnerable_sectors.length}</span>
                <span className="text-[10px] text-slate-500 block">High risk cut-slopes</span>
              </div>
            </div>

            {/* Vulnerable Hill Cut Sectors List */}
            <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800/80 space-y-3">
              <h4 className="font-bold text-white text-xs uppercase tracking-wider">
                Intercepting Spatial Monitoring Sectors
              </h4>

              <div className="space-y-2">
                {activeCorridor.vulnerable_sectors.map((sec, idx) => {
                  const matchingZone = zones.find(z => z.name.toLowerCase().includes(sec.toLowerCase()) || sec.toLowerCase().includes(z.name.toLowerCase()));

                  return (
                    <div
                      key={idx}
                      className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-brand-400" />
                        <div>
                          <span className="font-bold text-white block">{sec}</span>
                          <span className="text-[10px] text-slate-400">Slope Gradient: 38–44° • Active Weather Front</span>
                        </div>
                      </div>

                      {matchingZone && onSelectZone && (
                        <button
                          onClick={() => onSelectZone(matchingZone)}
                          className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] flex items-center gap-1 shadow transition"
                        >
                          <span>Inspect Zone</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
