import React from 'react';
import { RiskZone } from '../types';
import { RiskMap } from './RiskMap';
import { ShieldCheck, AlertCircle, Phone, MapPin, Navigation, Info, ArrowRight } from 'lucide-react';

interface CitizenViewProps {
  zones: RiskZone[];
  isDarkMode: boolean;
  onSelectZone: (zone: RiskZone) => void;
}

export const CitizenView: React.FC<CitizenViewProps> = ({
  zones,
  isDarkMode,
  onSelectZone
}) => {
  // Citizen's current location zone (Haflong Hill Sector, Dima Hasao)
  const ownZone = zones.find(z => z.grid_id === "ner_grid_056061") || zones[0];
  const isHighRisk = ownZone.risk === "VERY HIGH" || ownZone.risk === "HIGH";

  return (
    <div className="w-full h-full relative flex flex-col lg:flex-row overflow-hidden">
      {/* Citizen Safety Advice Sidebar */}
      <div className="w-full lg:w-96 p-5 bg-slate-900/95 backdrop-blur-xl border-r border-slate-800 flex flex-col justify-between space-y-4 z-10 overflow-y-auto">
        <div className="space-y-4">
          {/* Header Badge */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/40 flex items-center gap-1">
              <Navigation className="w-3 h-3" /> Citizen Local Safety Dashboard
            </span>
          </div>

          {/* Citizen Location Card */}
          <div className="glass-panel p-4 rounded-xl border border-slate-800 space-y-3 relative overflow-hidden">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Your Current Sector</span>
                <h2 className="text-xl font-extrabold text-white mt-0.5">{ownZone.name}</h2>
                <p className="text-xs text-slate-300 font-medium">{ownZone.district}, {ownZone.state}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-black border ${
                isHighRisk ? 'bg-red-500/20 text-red-400 border-red-500/40 animate-pulse' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
              }`}>
                {ownZone.risk}
              </span>
            </div>

            {/* Risk Explanation */}
            <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800/80 text-xs space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-amber-400">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Current Safety Advisory</span>
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                {isHighRisk
                  ? `Heavy 7-day cumulative rainfall (${ownZone.r7d}mm) on steep slopes (${ownZone.slope}°) has created VERY HIGH landslide susceptibility in your sector.`
                  : `Slopes in your sector are currently stable. Monitor rainfall updates during monsoonal events.`
                }
              </p>
            </div>
          </div>

          {/* Action Guidelines */}
          <div className="glass-panel p-4 rounded-xl border border-slate-800 space-y-2.5 text-xs">
            <h3 className="font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" /> Immediate Safety Action Plan
            </h3>
            <ul className="space-y-2 text-slate-300 text-[11px]">
              <li className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-slate-800 text-brand-400 font-bold flex items-center justify-center text-[10px] shrink-0">1</span>
                <span>Stay clear of steep hill cuts, unlined slopes, and natural stream channels.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-slate-800 text-brand-400 font-bold flex items-center justify-center text-[10px] shrink-0">2</span>
                <span>If tension cracks or ground bulging appear, evacuate immediately to designated relief shelters.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-slate-800 text-brand-400 font-bold flex items-center justify-center text-[10px] shrink-0">3</span>
                <span>Keep emergency broadcast SMS notifications active on your mobile phone.</span>
              </li>
            </ul>
          </div>

          {/* Nearest Emergency Shelter & Helpline */}
          <div className="glass-panel p-4 rounded-xl border border-slate-800 space-y-2 text-xs">
            <h3 className="font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
              <MapPin className="w-4 h-4 text-red-400" /> Designated Evacuation Shelter
            </h3>
            <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 space-y-1">
              <span className="font-bold text-white block">Haflong Government High School Complex</span>
              <span className="text-[11px] text-slate-400 block">Distance: 1.2 km (8 mins walk via Main Road)</span>
              <span className="text-[10px] text-emerald-400 font-semibold">Capacity: 1,500 people • Active NDRF Post</span>
            </div>
          </div>
        </div>

        {/* Emergency Toll-Free Number */}
        <div className="bg-gradient-to-r from-red-950/80 to-slate-900 border border-red-800/60 p-3.5 rounded-xl flex items-center justify-between text-xs">
          <div className="flex items-center gap-2.5">
            <Phone className="w-5 h-5 text-red-400 animate-pulse" />
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Disaster Toll-Free Helpline</span>
              <span className="text-sm font-extrabold text-white">1070 / 1077 (Assam SDMA)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Map View with Own Zone Highlight */}
      <div className="flex-1 h-full relative">
        <RiskMap
          zones={zones}
          selectedZone={ownZone}
          onSelectZone={onSelectZone}
          isDarkMode={isDarkMode}
          highlightZoneId={ownZone.grid_id}
          isCitizenView={true}
        />
      </div>
    </div>
  );
};
