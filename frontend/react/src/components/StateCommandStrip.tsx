import React from 'react';
import { RiskZone, LiveWeatherStation } from '../types';
import { MapPin, ShieldAlert, CloudRain, Users, Navigation, Radio, Activity } from 'lucide-react';

interface StateCommandStripProps {
  selectedState: string;
  onStateSelect: (state: string) => void;
  zones: RiskZone[];
  stations: LiveWeatherStation[];
}

export const NER_STATES = [
  { id: 'All', name: 'All NER (8 States)', code: 'NER', center: [25.8, 92.5], zoom: 7 },
  { id: 'Assam', name: 'Assam', code: 'AS', center: [26.18, 92.8], zoom: 8 },
  { id: 'Arunachal Pradesh', name: 'Arunachal Pradesh', code: 'AR', center: [27.5, 93.6], zoom: 8 },
  { id: 'Meghalaya', name: 'Meghalaya', code: 'ML', center: [25.5, 91.8], zoom: 9 },
  { id: 'Mizoram', name: 'Mizoram', code: 'MZ', center: [23.7, 92.8], zoom: 9 },
  { id: 'Nagaland', name: 'Nagaland', code: 'NL', center: [25.8, 94.2], zoom: 9 },
  { id: 'Manipur', name: 'Manipur', code: 'MN', center: [24.8, 93.9], zoom: 9 },
  { id: 'Sikkim', name: 'Sikkim', code: 'SK', center: [27.5, 88.6], zoom: 9 },
  { id: 'Tripura', name: 'Tripura', code: 'TR', center: [23.8, 91.5], zoom: 9 },
];

export const StateCommandStrip: React.FC<StateCommandStripProps> = ({
  selectedState,
  onStateSelect,
  zones,
  stations,
}) => {
  return (
    <div className="w-full bg-slate-950/90 border-b border-slate-800/80 px-4 py-2 flex items-center gap-1.5 overflow-x-auto select-none shrink-0 scrollbar-none z-20 shadow-md">
      <div className="flex items-center gap-1.5 pr-2 border-r border-slate-800 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 shrink-0">
        <MapPin className="w-3.5 h-3.5 text-brand-400" />
        <span className="hidden sm:inline">NER STATE JUMP:</span>
      </div>

      <div className="flex items-center gap-1.5">
        {NER_STATES.map((st) => {
          const isActive = selectedState.toLowerCase() === st.id.toLowerCase() || (st.id === 'All' && selectedState === 'All');
          
          // Calculate state counts
          const stateZones = st.id === 'All' ? zones : zones.filter(z => z.state.toLowerCase() === st.id.toLowerCase());
          const stateCritical = stateZones.filter(z => z.risk === 'VERY HIGH').length;
          const stateHigh = stateZones.filter(z => z.risk === 'HIGH').length;
          const stateStation = stations.find(s => s.state.toLowerCase() === st.id.toLowerCase());
          const isSevereWeather = stateStation && (stateStation.warning_level === 'RED' || stateStation.warning_level === 'ORANGE');

          return (
            <button
              key={st.id}
              onClick={() => onStateSelect(st.id)}
              className={`py-1 px-2.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0 border ${
                isActive
                  ? 'bg-brand-600 text-white border-brand-400/50 shadow-md font-extrabold scale-[1.02]'
                  : 'bg-slate-900/90 hover:bg-slate-800 text-slate-300 border-slate-800 hover:border-slate-700'
              }`}
            >
              <span>{st.code}</span>
              <span className="hidden md:inline font-normal text-[11px]">{st.name.replace(' (8 States)', '')}</span>
              
              {/* Badges for state severe counts */}
              {stateCritical > 0 && (
                <span className="w-2 h-2 rounded-full bg-red-400 shrink-0" title={`${stateCritical} Very High Risk Sectors`} />
              )}
              {isSevereWeather && (
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" title={`IMD ${stateStation?.warning_level} Alert Active`} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
