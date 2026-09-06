import React from 'react';
import { ShieldAlert, AlertCircle, CloudLightning, FileCheck2, Send } from 'lucide-react';

interface StatsOverviewProps {
  criticalCount: number;
  highRiskCount: number;
  escalatingCount: number;
  pendingRequestsCount: number;
  alertsCount: number;
  onSelectKpi?: (kpi: 'critical' | 'high' | 'escalating' | 'requests' | 'alerts') => void;
}

export const StatsOverview: React.FC<StatsOverviewProps> = ({
  criticalCount,
  highRiskCount,
  escalatingCount,
  pendingRequestsCount,
  alertsCount,
  onSelectKpi,
}) => {
  return (
    <div className="flex items-center gap-2 p-2 select-none pointer-events-auto">
      {/* 1. CRITICAL */}
      <div 
        onClick={() => onSelectKpi?.('critical')}
        className="flex-1 bg-slate-950/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-red-500/30 hover:border-red-500/60 transition cursor-pointer flex items-center justify-between shadow-md group"
        title="View P1 Critical Sectors"
      >
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-red-500/20 text-red-400 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-3.5 h-3.5" />
          </div>
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Critical</span>
        </div>
        <div className="flex items-baseline gap-1 font-mono">
          <span className="text-sm font-black text-red-400">{criticalCount}</span>
          <span className="text-[9px] font-bold text-red-500/80">P1</span>
        </div>
      </div>

      {/* 2. HIGH */}
      <div 
        onClick={() => onSelectKpi?.('high')}
        className="flex-1 bg-slate-950/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-amber-500/30 hover:border-amber-500/60 transition cursor-pointer flex items-center justify-between shadow-md group"
        title="View P2 High Risk Sectors"
      >
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
            <AlertCircle className="w-3.5 h-3.5" />
          </div>
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">High</span>
        </div>
        <div className="flex items-baseline gap-1 font-mono">
          <span className="text-sm font-black text-amber-400">{highRiskCount}</span>
          <span className="text-[9px] font-bold text-amber-500/80">P2</span>
        </div>
      </div>

      {/* 3. ESCALATING */}
      <div 
        onClick={() => onSelectKpi?.('escalating')}
        className="flex-1 bg-slate-950/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-orange-500/30 hover:border-orange-500/60 transition cursor-pointer flex items-center justify-between shadow-md group"
        title="Open Early Warning Forecast Center"
      >
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-orange-500/20 text-orange-400 flex items-center justify-center shrink-0">
            <CloudLightning className="w-3.5 h-3.5" />
          </div>
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Escalating</span>
        </div>
        <span className="text-sm font-black text-orange-400 font-mono">{escalatingCount}</span>
      </div>

      {/* 4. VERIFY (Pending Field Verification) */}
      <div 
        onClick={() => onSelectKpi?.('requests')}
        className="flex-1 bg-slate-950/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-cyan-500/30 hover:border-cyan-500/60 transition cursor-pointer flex items-center justify-between shadow-md group"
        title="Open Field Verification Queue"
      >
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">
            <FileCheck2 className="w-3.5 h-3.5" />
          </div>
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Verify</span>
        </div>
        <span className="text-sm font-black text-cyan-400 font-mono">{pendingRequestsCount}</span>
      </div>

      {/* 5. ACTIVE ALERTS */}
      <div 
        onClick={() => onSelectKpi?.('alerts')}
        className="flex-1 bg-slate-950/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-purple-500/30 hover:border-purple-500/60 transition cursor-pointer flex items-center justify-between shadow-md group"
        title="Open Active Emergency Broadcast Alerts"
      >
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
            <Send className="w-3.5 h-3.5" />
          </div>
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Active Alerts</span>
        </div>
        <span className="text-sm font-black text-purple-300 font-mono">{alertsCount}</span>
      </div>
    </div>
  );
};
