import React from 'react';
import { ViewMode } from '../types';
import {
  LayoutDashboard,
  Map,
  FileCheck2,
  BarChart3,
  Users,
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
      label: 'Overview',
      icon: LayoutDashboard,
      badge: criticalCount > 0 ? `${criticalCount}` : null,
      badgeColor: 'bg-red-500 text-white',
    },
    {
      id: 'risk_map' as ViewMode,
      label: 'Monitoring',
      icon: Map,
      badge: escalatingCount > 0 ? `${escalatingCount}` : null,
      badgeColor: 'bg-amber-500 text-slate-950 font-black',
    },
    {
      id: 'requests' as ViewMode,
      label: 'Response',
      icon: FileCheck2,
      badge: pendingRequestsCount > 0 ? `${pendingRequestsCount}` : null,
      badgeColor: 'bg-cyan-500 text-slate-950 font-black',
    },
    {
      id: 'analytics' as ViewMode,
      label: 'Analytics',
      icon: BarChart3,
      badge: null,
    },
    {
      id: 'citizen_view' as ViewMode,
      label: 'Public',
      icon: Users,
      badge: null,
    },
    {
      id: 'system_health' as ViewMode,
      label: 'System',
      icon: Activity,
      badge: null,
    },
  ];

  return (
    <aside
      className={`h-full border-r border-slate-800/80 bg-slate-950 flex flex-col z-20 transition-all duration-200 shrink-0 select-none ${
        isCollapsed ? 'w-14' : 'w-48'
      }`}
    >
      {/* Icon Rail Header */}
      <div className="h-12 border-b border-slate-800/80 flex items-center justify-between px-3">
        {!isCollapsed && (
          <span className="text-[10px] font-mono font-bold tracking-widest text-slate-500 uppercase">
            RAIL
          </span>
        )}
        <button
          onClick={onToggleCollapse}
          className="w-7 h-7 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors border border-slate-800/80 mx-auto"
          title={isCollapsed ? 'Expand Navigation' : 'Collapse Rail'}
        >
          {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Primary Icon Items */}
      <nav className="flex-1 overflow-y-auto p-2 space-y-1 text-xs">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = 
            currentView === item.id || 
            (item.id === 'overview' && currentView === 'admin_map') ||
            (item.id === 'risk_map' && (currentView === 'early_warning' || currentView === 'live_weather' || currentView === 'infrastructure')) ||
            (item.id === 'requests' && (currentView === 'field_report' || currentView === 'alerts'));

          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`w-full relative flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-all duration-150 group ${
                isActive
                  ? 'bg-slate-800/90 text-white font-extrabold shadow-sm border border-slate-700/80'
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
        <div className="p-3 border-t border-slate-800/80 text-[10px] text-slate-500 flex items-center justify-between font-mono">
          <span>PALANTIR OPS</span>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        </div>
      )}
    </aside>
  );
};
