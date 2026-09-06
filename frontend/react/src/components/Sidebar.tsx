import React from 'react';
import { ViewMode } from '../types';
import {
  LayoutDashboard,
  ShieldAlert,
  Map,
  CloudRain,
  Building2,
  ClipboardCheck,
  Bell,
  FileCheck2,
  BarChart3,
  Users,
  Database,
  Activity,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';

interface SidebarProps {
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  criticalCount: number;
  pendingRequestsCount: number;
  activeAlertsCount: number;
  escalatingCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onViewChange,
  isCollapsed,
  onToggleCollapse,
  criticalCount,
  pendingRequestsCount,
  activeAlertsCount,
  escalatingCount = 0,
}) => {
  const items = [
    {
      id: 'overview' as ViewMode,
      label: 'Command Center',
      icon: LayoutDashboard,
      badge: criticalCount > 0 ? `${criticalCount}` : null,
      badgeColor: 'bg-red-500 text-white',
    },
    {
      id: 'early_warning' as ViewMode,
      label: 'Early Warning',
      icon: ShieldAlert,
      badge: escalatingCount > 0 ? `${escalatingCount}` : null,
      badgeColor: 'bg-amber-500 text-slate-950 font-black',
    },
    {
      id: 'risk_map' as ViewMode,
      label: 'Risk Map',
      icon: Map,
      badge: null,
    },
    {
      id: 'live_weather' as ViewMode,
      label: 'Live Weather',
      icon: CloudRain,
      badge: null,
    },
    {
      id: 'infrastructure' as ViewMode,
      label: 'Infrastructure',
      icon: Building2,
      badge: null,
    },
    {
      id: 'field_report' as ViewMode,
      label: 'Field Reports',
      icon: ClipboardCheck,
      badge: pendingRequestsCount > 0 ? `${pendingRequestsCount}` : null,
      badgeColor: 'bg-cyan-500 text-slate-950 font-black',
    },
    {
      id: 'alerts' as ViewMode,
      label: 'Alerts',
      icon: Bell,
      badge: activeAlertsCount > 0 ? `${activeAlertsCount}` : null,
      badgeColor: 'bg-amber-500 text-slate-950 font-black',
    },
    {
      id: 'requests' as ViewMode,
      label: 'Incidents',
      icon: FileCheck2,
      badge: null,
    },
    {
      id: 'analytics' as ViewMode,
      label: 'Analytics',
      icon: BarChart3,
      badge: null,
    },
    {
      id: 'citizen_view' as ViewMode,
      label: 'Citizen View',
      icon: Users,
      badge: null,
    },
    {
      id: 'data_sources' as ViewMode,
      label: 'Data Sources',
      icon: Database,
      badge: null,
    },
    {
      id: 'system_health' as ViewMode,
      label: 'System Health',
      icon: Activity,
      badge: null,
    },
  ];

  return (
    <aside
      className={`h-full border-r border-slate-800/80 bg-slate-950 flex flex-col z-20 transition-all duration-200 shrink-0 select-none ${
        isCollapsed ? 'w-14' : 'w-52'
      }`}
    >
      {/* Icon Rail Header */}
      <div className="h-10 border-b border-slate-800/80 flex items-center justify-between px-3">
        {!isCollapsed && (
          <span className="text-[10px] font-mono font-bold tracking-widest text-slate-500 uppercase">
            NAVIGATION
          </span>
        )}
        <button
          onClick={onToggleCollapse}
          className="w-6 h-6 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors border border-slate-800/80 mx-auto"
          title={isCollapsed ? 'Expand Rail' : 'Collapse Rail'}
        >
          {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Primary Icon Items */}
      <nav className="flex-1 overflow-y-auto p-1.5 space-y-1 text-xs custom-scrollbar">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id || (item.id === 'overview' && currentView === 'admin_map');

          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`w-full relative flex items-center gap-2.5 px-2.5 py-2 rounded-lg font-medium transition-all duration-150 group ${
                isActive
                  ? 'bg-brand-600/20 text-white font-extrabold shadow-sm border border-brand-500/30'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900/60'
              } ${isCollapsed ? 'justify-center px-0' : ''}`}
              title={isCollapsed ? item.label : undefined}
            >
              <div className="relative">
                <Icon className={`w-4 h-4 shrink-0 transition-transform duration-150 ${isActive ? 'text-brand-400 scale-110' : 'text-slate-400 group-hover:scale-105'}`} />
                {isCollapsed && item.badge && (
                  <span className="absolute -top-1.5 -right-2 w-3.5 h-3.5 rounded-full bg-red-500 text-white font-mono text-[8px] font-black flex items-center justify-center border border-slate-950">
                    {item.badge}
                  </span>
                )}
              </div>

              {!isCollapsed && (
                <span className="flex-1 text-left truncate text-xs tracking-wide">
                  {item.label}
                </span>
              )}

              {!isCollapsed && item.badge && (
                <span className={`text-[9px] font-mono font-black px-1.5 py-0.2 rounded ${item.badgeColor || 'bg-slate-800 text-slate-300'}`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Status Footer */}
      {!isCollapsed && (
        <div className="p-2.5 border-t border-slate-800/80 text-[10px] text-slate-500 flex items-center justify-between font-mono">
          <span>SIH26001 COMMAND</span>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        </div>
      )}
    </aside>
  );
};
