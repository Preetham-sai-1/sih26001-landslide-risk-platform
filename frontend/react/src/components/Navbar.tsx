import React, { useState, useEffect } from 'react';
import { ViewMode, LiveWeatherStatus } from '../types';
import { 
  ShieldAlert, 
  Bell, 
  Sun, 
  Moon, 
  Clock, 
  Radio, 
  Search,
  UserCheck
} from 'lucide-react';

export type UserRole = 'ADMIN' | 'FIELD_OFFICER' | 'CITIZEN';

interface NavbarProps {
  currentView: ViewMode;
  onViewChange: (mode: ViewMode) => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  isOnline: boolean;
  pendingSyncCount: number;
  unreadNotifications: number;
  onOpenNotifications: () => void;
  liveStatus?: LiveWeatherStatus | null;
  onOpenCommandPalette?: () => void;
  currentRole?: UserRole;
  onRoleChange?: (role: UserRole) => void;
  isAutoAlertingEnabled?: boolean;
  onToggleAutoAlerting?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onViewChange,
  isDarkMode,
  onToggleDarkMode,
  isOnline,
  pendingSyncCount,
  unreadNotifications,
  onOpenNotifications,
  liveStatus,
  onOpenCommandPalette,
  currentRole = 'ADMIN',
  onRoleChange,
  isAutoAlertingEnabled = true,
  onToggleAutoAlerting,
}) => {
  const [timeStr, setTimeStr] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString('en-US', { hour12: false }) + ' IST');
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const weatherStatus = liveStatus?.status || 'LIVE';

  return (
    <header className="h-12 border-b border-slate-800/80 bg-slate-950 px-3 flex items-center justify-between z-30 shrink-0 select-none text-xs gap-3">
      {/* Title & Scope */}
      <div className="flex items-center gap-2.5 shrink-0">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-red-600 to-amber-600 flex items-center justify-center shadow-sm shrink-0">
          <ShieldAlert className="w-4 h-4 text-white" />
        </div>
        <div className="flex items-baseline gap-2">
          <h1 className="font-extrabold text-sm text-white tracking-wide font-sans">
            SIH Landslide Intelligence
          </h1>
          <span className="text-[10px] font-mono text-slate-400 font-semibold hidden sm:inline">
            • NER (8 States)
          </span>
        </div>
      </div>

      {/* Global Search Bar (Ctrl + K) */}
      <div className="flex-1 max-w-sm hidden md:flex items-center">
        {onOpenCommandPalette && (
          <button
            onClick={onOpenCommandPalette}
            className="w-full flex items-center justify-between px-3 py-1 rounded-xl bg-slate-900/80 hover:bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800 transition text-xs group"
          >
            <div className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-brand-400 group-hover:scale-105 transition-transform" />
              <span className="text-slate-400 text-xs">Search zones, grids, roads, alerts...</span>
            </div>
            <kbd className="text-[9px] font-mono bg-slate-800 px-1.5 py-0.2 rounded border border-slate-700 text-slate-400">
              Ctrl K
            </kbd>
          </button>
        )}
      </div>

      {/* Right Controls: Auto Alert Badge, Telemetry Pill, Clock, Role, Notifications, Theme */}
      <div className="flex items-center gap-2 md:gap-3 shrink-0">
        {/* Auto Alerting Status Badge */}
        {onToggleAutoAlerting && (
          <button
            onClick={onToggleAutoAlerting}
            className={`hidden xl:flex items-center gap-1.5 px-2 py-0.5 rounded-lg border text-[10px] font-bold font-mono transition ${
              isAutoAlertingEnabled
                ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/30'
                : 'bg-slate-900 text-slate-500 border-slate-800'
            }`}
            title="Toggle Automatic Threshold Alerting Mode"
          >
            <span className={`w-2 h-2 rounded-full ${isAutoAlertingEnabled ? 'bg-emerald-400 animate-ping' : 'bg-slate-600'}`} />
            <span>AUTO ALERT: {isAutoAlertingEnabled ? 'ON' : 'OFF'}</span>
          </button>
        )}
        {/* Telemetry Status Pill */}
        <div 
          className={`flex items-center gap-1.5 px-2 py-0.5 rounded-lg border text-[10px] font-bold font-mono transition ${
            weatherStatus === 'LIVE' 
              ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/30' 
              : 'bg-amber-950/40 text-amber-400 border-amber-500/30'
          }`}
        >
          <Radio className={`w-3 h-3 ${weatherStatus === 'LIVE' ? 'animate-pulse text-emerald-400' : 'text-amber-400'}`} />
          <span>{weatherStatus}</span>
        </div>

        {/* Timestamp */}
        <div className="hidden lg:flex items-center gap-1 font-mono text-[10px] text-slate-400">
          <Clock className="w-3 h-3 text-slate-500" />
          <span>{timeStr}</span>
        </div>

        {/* Role Switcher */}
        {onRoleChange && (
          <div className="flex items-center bg-slate-900 px-2 py-0.5 rounded-lg border border-slate-800 text-[11px]">
            <UserCheck className="w-3 h-3 text-brand-400 mr-1 hidden sm:inline" />
            <select
              value={currentRole}
              onChange={(e) => onRoleChange(e.target.value as UserRole)}
              className="bg-transparent text-amber-400 font-extrabold focus:outline-none cursor-pointer text-[10px]"
            >
              <option value="ADMIN" className="bg-slate-900 text-amber-400">ADMIN</option>
              <option value="FIELD_OFFICER" className="bg-slate-900 text-emerald-400">FIELD OFFICER</option>
              <option value="CITIZEN" className="bg-slate-900 text-cyan-400">CITIZEN</option>
            </select>
          </div>
        )}

        {/* Notification Bell */}
        <button
          onClick={onOpenNotifications}
          className="relative w-7 h-7 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors border border-slate-800"
          title="Operational Notifications"
        >
          <Bell className="w-3.5 h-3.5" />
          {unreadNotifications > 0 && (
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-red-500 text-white font-mono text-[8px] font-black flex items-center justify-center border border-slate-950">
              {unreadNotifications > 9 ? '9+' : unreadNotifications}
            </span>
          )}
        </button>

        {/* Theme Toggle */}
        <button
          onClick={onToggleDarkMode}
          className="w-7 h-7 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 flex items-center justify-center transition-colors border border-slate-800"
          title="Toggle Dark/Light Mode"
        >
          {isDarkMode ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-indigo-400" />}
        </button>
      </div>
    </header>
  );
};
