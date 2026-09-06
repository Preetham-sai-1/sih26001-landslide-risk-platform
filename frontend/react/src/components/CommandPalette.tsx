import React, { useState, useEffect, useRef } from 'react';
import { RiskZone, FieldReport, AlertLog, ViewMode } from '../types';
import { 
  Search, 
  MapPin, 
  Grid, 
  ShieldAlert, 
  FileText, 
  Radio, 
  Navigation, 
  Zap, 
  CloudLightning, 
  Database, 
  Activity, 
  Layers, 
  X,
  CornerDownLeft,
  Flame
} from 'lucide-react';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  zones: RiskZone[];
  reports: FieldReport[];
  alerts: AlertLog[];
  onSelectZone: (zone: RiskZone) => void;
  onSelectReport?: (report: FieldReport) => void;
  onViewChange: (view: ViewMode) => void;
  onStartDrill?: () => void;
  onOpenDataSources?: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  zones,
  reports,
  alerts,
  onSelectZone,
  onSelectReport,
  onViewChange,
  onStartDrill,
  onOpenDataSources,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Filter items based on query
  const q = query.toLowerCase().trim();

  const matchedZones = q ? zones.filter(z => 
    z.name.toLowerCase().includes(q) ||
    z.district.toLowerCase().includes(q) ||
    z.state.toLowerCase().includes(q) ||
    z.grid_id.toLowerCase().includes(q) ||
    z.risk.toLowerCase().includes(q)
  ).slice(0, 5) : zones.filter(z => z.risk === 'VERY HIGH' || z.risk === 'HIGH').slice(0, 3);

  const matchedReports = q ? reports.filter(r =>
    r.location_name.toLowerCase().includes(q) ||
    r.incident_type.toLowerCase().includes(q) ||
    r.district.toLowerCase().includes(q) ||
    r.id.toLowerCase().includes(q)
  ).slice(0, 3) : reports.slice(0, 2);

  const quickActions = [
    {
      id: 'cmd_drill',
      title: 'Start Disaster Simulation Drill',
      category: 'Simulations',
      icon: Zap,
      action: () => { onStartDrill?.(); onClose(); }
    },
    {
      id: 'cmd_early_warning',
      title: 'Open Early Warning Forecast Center',
      category: 'Navigation',
      icon: CloudLightning,
      action: () => { onViewChange('early_warning'); onClose(); }
    },
    {
      id: 'cmd_critical',
      title: 'View Critical Risk Queue (P1 Sectors)',
      category: 'Navigation',
      icon: ShieldAlert,
      action: () => { onViewChange('overview'); onClose(); }
    },

    {
      id: 'cmd_field_reports',
      title: 'Open Ground Truth Field Reporter',
      category: 'Navigation',
      icon: FileText,
      action: () => { onViewChange('field_report'); onClose(); }
    },
    {
      id: 'cmd_data_sources',
      title: 'View Scientific Data Architecture & Provenance',
      category: 'System',
      icon: Database,
      action: () => { onOpenDataSources?.(); onClose(); }
    }
  ].filter(a => !q || a.title.toLowerCase().includes(q) || a.category.toLowerCase().includes(q));

  const allResultsCount = matchedZones.length + matchedReports.length + quickActions.length;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-black/75 backdrop-blur-md animate-fadeIn text-slate-100">
      <div 
        className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-w-2xl w-full flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="p-3.5 border-b border-slate-800 flex items-center gap-3 bg-slate-950/90">
          <Search className="w-5 h-5 text-brand-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search state, district, zone name, grid ID (e.g. 'Haflong', 'Dima Hasao', 'AS_04')..."
            className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none font-medium"
          />
          {query && (
            <button onClick={() => setQuery('')} className="p-1 text-slate-500 hover:text-slate-300">
              <X className="w-4 h-4" />
            </button>
          )}
          <span className="text-[10px] font-mono text-slate-500 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
            ESC
          </span>
        </div>

        {/* Results Body */}
        <div className="max-h-[420px] overflow-y-auto p-3 space-y-3 text-xs">
          {/* Spatial Grid & Risk Zones */}
          {matchedZones.length > 0 && (
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-2 block">
                Spatial Monitoring Zones ({matchedZones.length})
              </span>
              {matchedZones.map((zone) => (
                <div
                  key={zone.grid_id}
                  onClick={() => {
                    onSelectZone(zone);
                    onClose();
                  }}
                  className="p-2.5 rounded-xl flex items-center justify-between hover:bg-slate-800/80 cursor-pointer transition border border-transparent hover:border-slate-700"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-slate-800 text-brand-400">
                      <Grid className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-xs">{zone.name}</span>
                        <span className="font-mono text-[10px] text-amber-300 bg-slate-950 px-1 rounded">
                          {zone.grid_id}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400">{zone.district}, {zone.state} • Elev: {zone.elev.toFixed(0)}m • Slope: {zone.slope.toFixed(0)}°</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 font-mono">
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded ${
                      zone.risk === 'VERY HIGH' ? 'bg-red-500/20 text-red-300 border border-red-500/40' :
                      zone.risk === 'HIGH' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                      'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    }`}>
                      {zone.risk} ({zone.score.toFixed(1)}%)
                    </span>
                    <CornerDownLeft className="w-3.5 h-3.5 text-slate-500" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Field Incident Reports */}
          {matchedReports.length > 0 && (
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-2 block">
                Ground Field Incident Reports ({matchedReports.length})
              </span>
              {matchedReports.map((report) => (
                <div
                  key={report.id}
                  onClick={() => {
                    onSelectReport?.(report);
                    onViewChange('field_report');
                    onClose();
                  }}
                  className="p-2.5 rounded-xl flex items-center justify-between hover:bg-slate-800/80 cursor-pointer transition border border-transparent hover:border-slate-700"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-slate-800 text-emerald-400">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-xs">{report.location_name}</span>
                        <span className="font-mono text-[10px] text-slate-400">{report.id}</span>
                      </div>
                      <span className="text-[11px] text-slate-400">{report.incident_type} • Status: {report.status}</span>
                    </div>
                  </div>
                  <CornerDownLeft className="w-3.5 h-3.5 text-slate-500" />
                </div>
              ))}
            </div>
          )}

          {/* Quick Actions */}
          {quickActions.length > 0 && (
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-2 block">
                Quick Command Actions
              </span>
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <div
                    key={action.id}
                    onClick={action.action}
                    className="p-2.5 rounded-xl flex items-center justify-between hover:bg-slate-800/80 cursor-pointer transition border border-transparent hover:border-slate-700"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-300">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-bold text-white text-xs block">{action.title}</span>
                        <span className="text-[10px] text-slate-400">{action.category}</span>
                      </div>
                    </div>
                    <CornerDownLeft className="w-3.5 h-3.5 text-slate-500" />
                  </div>
                );
              })}
            </div>
          )}

          {allResultsCount === 0 && (
            <div className="py-8 text-center text-slate-500">
              <p className="text-sm font-semibold">No results found for "{query}"</p>
              <p className="text-xs mt-1">Try searching by state (Assam, Sikkim), district, or grid code.</p>
            </div>
          )}
        </div>

        {/* Footer Shortcut Tips */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center gap-3">
            <span><strong>↑↓</strong> to navigate</span>
            <span><strong>ESC</strong> to close</span>
          </div>
          <span>SIH Command Center Quick Navigation</span>
        </div>
      </div>
    </div>
  );
};
