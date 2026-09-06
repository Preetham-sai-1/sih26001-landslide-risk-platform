import React from 'react';
import { RiskZone, FieldReport, AlertLog, ResponsePriority } from '../types';
import { calculateAdminPriority } from '../utils/simulation';
import {
  ShieldAlert,
  AlertTriangle,
  FileCheck2,
  Radio,
  ChevronRight,
  Send,
  CheckCircle2,
  Clock,
  TrendingUp,
  MapPin,
  ExternalLink,
  ArrowRight
} from 'lucide-react';

interface RightOperationsPanelProps {
  zones: RiskZone[];
  onSelectZone: (zone: RiskZone) => void;
  reports: FieldReport[];
  alerts: AlertLog[];
  onViewAllRequests?: () => void;
  onViewAllAlerts?: () => void;
}

export const RightOperationsPanel: React.FC<RightOperationsPanelProps> = ({
  zones,
  onSelectZone,
  reports,
  alerts,
  onViewAllRequests,
  onViewAllAlerts,
}) => {
  // Sort and pick Top 3 critical/escalating zones
  const topCriticalZones = [...zones]
    .map(z => ({
      ...z,
      priority: calculateAdminPriority(z.score, z.risk),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  const pendingRequests = reports.filter(r => r.status !== 'Completed' && r.status !== 'Rejected').slice(0, 3);
  const latestAlert = alerts[0];

  return (
    <div className="w-80 xl:w-88 h-full bg-slate-950/95 backdrop-blur-xl border-l border-slate-800 flex flex-col z-20 shadow-xl overflow-hidden select-none animate-in slide-in-from-right duration-200 shrink-0">
      {/* Panel Header */}
      <div className="p-3.5 border-b border-slate-800 bg-slate-900/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-red-400" />
          <h3 className="font-extrabold text-xs text-white uppercase tracking-wider font-sans">
            OPERATIONAL PRIORITY
          </h3>
        </div>
        <span className="text-[10px] font-mono text-emerald-400 font-bold">LIVE QUEUE</span>
      </div>

      {/* Panel Body */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4 text-xs">
        {/* 1. Top Critical / Escalating Zones */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <span>Top Critical Sectors</span>
              <span className="text-red-400">({topCriticalZones.length})</span>
            </span>
          </div>

          <div className="space-y-1.5">
            {topCriticalZones.map((zone, idx) => {
              const priorityColor = zone.priority === 'P1 CRITICAL'
                ? 'bg-red-500/20 text-red-300 border-red-500/40'
                : 'bg-amber-500/20 text-amber-300 border-amber-500/40';

              return (
                <div
                  key={zone.grid_id}
                  onClick={() => onSelectZone(zone)}
                  className="p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 transition cursor-pointer space-y-1.5 group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded border font-mono ${priorityColor}`}>
                        {zone.priority === 'P1 CRITICAL' ? 'P1' : 'P2'}
                      </span>
                      <h4 className="font-bold text-white text-xs truncate max-w-[130px]">{zone.name}</h4>
                    </div>
                    <span className="font-mono font-bold text-amber-400 text-xs">{zone.score.toFixed(0)}%</span>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span>{zone.district}, {zone.state}</span>
                    <span className="text-cyan-400 font-mono font-semibold">24h: {zone.r24.toFixed(0)}mm</span>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-[10px]">
                    <span className="text-slate-500 font-mono text-[9px]">{zone.grid_id}</span>
                    <button className="text-brand-400 hover:text-brand-300 font-bold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                      <span>OPEN</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 2. Pending Verification Requests */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <FileCheck2 className="w-3.5 h-3.5 text-amber-400" />
              <span>Pending Requests</span>
              <span className="text-amber-400 font-mono font-bold">({pendingRequests.length})</span>
            </span>
            {onViewAllRequests && (
              <button 
                onClick={onViewAllRequests}
                className="text-[10px] text-brand-400 hover:underline"
              >
                View All
              </button>
            )}
          </div>

          <div className="space-y-1.5">
            {pendingRequests.length === 0 ? (
              <div className="p-3 text-center text-slate-500 text-[11px] bg-slate-900/40 rounded-xl border border-slate-800/60">
                No pending verification tickets
              </div>
            ) : (
              pendingRequests.map(r => (
                <div
                  key={r.id}
                  className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1 text-[11px]"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-amber-400 text-[10px]">{r.id}</span>
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-red-500/20 text-red-300 border border-red-500/30">
                      {r.severity}
                    </span>
                  </div>
                  <p className="font-bold text-slate-200 truncate">{r.location_name}</p>
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span>{r.district}</span>
                    <span className="text-slate-500">{new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 3. Most Recent Emergency Broadcast */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Radio className="w-3.5 h-3.5 text-purple-400" />
              <span>Latest Broadcast</span>
            </span>
            {onViewAllAlerts && (
              <button 
                onClick={onViewAllAlerts}
                className="text-[10px] text-brand-400 hover:underline"
              >
                Alert History
              </button>
            )}
          </div>

          {latestAlert ? (
            <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5 text-[11px]">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-amber-400 text-[10px]">{latestAlert.id}</span>
                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  {latestAlert.hazard_level}
                </span>
              </div>
              <p className="font-bold text-white truncate">{latestAlert.target_district}, {latestAlert.target_state}</p>
              <p className="text-[10px] text-slate-300 italic line-clamp-2">"{latestAlert.message}"</p>
              <div className="flex items-center justify-between text-[9px] text-slate-400 pt-1 border-t border-slate-800/80 font-mono">
                <span className="text-emerald-400">{latestAlert.sms_delivered.toLocaleString()} SMS Sent</span>
                <span>{new Date(latestAlert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>
          ) : (
            <div className="p-3 text-center text-slate-500 text-[11px] bg-slate-900/40 rounded-xl border border-slate-800/60">
              No active broadcast records
            </div>
          )}
        </div>
      </div>

      {/* Footer Info */}
      <div className="p-2.5 border-t border-slate-800 bg-slate-900/60 text-[10px] text-slate-500 text-center">
        Click any sector or grid polygon to inspect
      </div>
    </div>
  );
};
