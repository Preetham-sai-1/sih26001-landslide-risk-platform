import React, { useState } from 'react';
import { 
  Layers, 
  Grid, 
  ShieldAlert, 
  MapPin, 
  Radio, 
  Navigation, 
  Users, 
  Home, 
  CloudLightning, 
  Flame,
  ChevronDown, 
  ChevronUp, 
  Check, 
  Eye, 
  EyeOff 
} from 'lucide-react';

export interface MapLayerState {
  grid: boolean;
  risk: boolean;
  landslides: boolean;
  liveWeather: boolean;
  infrastructure: boolean;
  communityImpact: boolean;
  evacuation: boolean;
  forecast: boolean;
  heatmap: boolean;
}

interface MapLayerControlProps {
  layers: MapLayerState;
  onToggleLayer: (layerKey: keyof MapLayerState) => void;
  onResetLayers?: () => void;
}

export const MapLayerControl: React.FC<MapLayerControlProps> = ({
  layers,
  onToggleLayer,
  onResetLayers,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const layerItems: { key: keyof MapLayerState; label: string; icon: React.ElementType; color: string; desc: string }[] = [
    { key: 'grid', label: '1km Spatial Grid', icon: Grid, color: 'text-brand-400', desc: '1 km × 1 km polygon units' },
    { key: 'risk', label: 'Risk Markers', icon: ShieldAlert, color: 'text-red-400', desc: 'Hazard centroids & halos' },
    { key: 'landslides', label: 'GSI Landslides', icon: MapPin, color: 'text-amber-400', desc: 'Historical ground truth' },
    { key: 'liveWeather', label: 'IMD Live AWS', icon: Radio, color: 'text-emerald-400', desc: 'Real-time telemetry feeds' },
    { key: 'infrastructure', label: 'Infrastructure', icon: Navigation, color: 'text-cyan-400', desc: 'Highways, bridges & power' },
    { key: 'communityImpact', label: 'Community Facilities', icon: Users, color: 'text-purple-400', desc: 'Schools, clinics & villages' },
    { key: 'evacuation', label: 'Evacuation & Shelters', icon: Home, color: 'text-indigo-400', desc: 'Shelter nodes & routes' },
    { key: 'forecast', label: 'Early Warning Forecast', icon: CloudLightning, color: 'text-amber-300', desc: '+6h/+12h/+24h projections' },
    { key: 'heatmap', label: 'Risk & Hazard Heatmap', icon: Flame, color: 'text-rose-400', desc: 'Spatial density surface' },
  ];

  const activeCount = Object.values(layers).filter(Boolean).length;

  return (
    <div className="relative select-none text-xs">
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(prev => !prev)}
        className={`py-2 px-3.5 rounded-xl font-extrabold flex items-center gap-2 shadow-2xl transition-all duration-200 border ${
          isOpen
            ? 'bg-gradient-to-r from-brand-600 to-indigo-600 text-white border-brand-400/50 shadow-brand-500/30 ring-2 ring-brand-500/40'
            : 'bg-slate-900/90 hover:bg-slate-800 text-slate-200 border-slate-700 hover:border-slate-600'
        }`}
      >
        <Layers className="w-4 h-4 text-brand-300" />
        <span>MAP LAYERS</span>
        <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 bg-slate-950/70 text-amber-300 rounded border border-slate-700">
          {activeCount} Active
        </span>
        {isOpen ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 top-12 z-50 w-72 bg-slate-950/95 backdrop-blur-xl border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 text-slate-100">
          <div className="p-3 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
            <div className="flex items-center gap-1.5 font-bold text-white text-[11px] uppercase tracking-wider">
              <Layers className="w-3.5 h-3.5 text-brand-400" />
              <span>Multi-Layer GIS Controls</span>
            </div>
            {onResetLayers && (
              <button 
                onClick={onResetLayers}
                className="text-[10px] text-slate-400 hover:text-white font-medium"
              >
                Reset Default
              </button>
            )}
          </div>

          <div className="p-2 space-y-1 max-h-[380px] overflow-y-auto">
            {layerItems.map((item) => {
              const Icon = item.icon;
              const isActive = layers[item.key];

              return (
                <div
                  key={item.key}
                  onClick={() => onToggleLayer(item.key)}
                  className={`p-2 rounded-xl flex items-center justify-between cursor-pointer transition-all ${
                    isActive 
                      ? 'bg-slate-800/80 border border-slate-700 text-white' 
                      : 'hover:bg-slate-900/60 border border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`p-1.5 rounded-lg ${isActive ? 'bg-slate-700/80' : 'bg-slate-900'} ${item.color}`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="font-semibold text-xs block leading-tight">{item.label}</span>
                      <span className="text-[10px] text-slate-500 leading-none">{item.desc}</span>
                    </div>
                  </div>

                  <div className={`w-5 h-5 rounded-lg flex items-center justify-center border transition-all ${
                    isActive ? 'bg-brand-600 border-brand-400 text-white' : 'border-slate-700 bg-slate-900 text-transparent'
                  }`}>
                    {isActive && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-2.5 border-t border-slate-800 bg-slate-950/80 text-[10px] text-slate-400 flex items-center justify-between">
            <span>Simultaneous Layer Fusion Active</span>
            <span className="font-mono text-emerald-400 font-bold">100% Vector GPU</span>
          </div>
        </div>
      )}
    </div>
  );
};
