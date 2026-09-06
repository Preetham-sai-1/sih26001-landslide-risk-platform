import React from 'react';
import { 
  Bell, 
  X, 
  CheckCheck, 
  Trash2, 
  CloudLightning, 
  ShieldAlert, 
  FileText, 
  Radio, 
  Navigation, 
  Activity,
  ChevronRight,
  Clock
} from 'lucide-react';
import { ViewMode } from '../types';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  type: 'ESCALATION' | 'FIELD_REPORT' | 'WEATHER_WARNING' | 'ALERT_DISPATCH' | 'SYSTEM';
  read: boolean;
  actionView?: ViewMode;
}

interface NotificationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: AppNotification[];
  onMarkAllAsRead: () => void;
  onClearAll: () => void;
  onNotificationClick: (notification: AppNotification) => void;
}

export const NotificationCenterModal: React.FC<NotificationCenterModalProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkAllAsRead,
  onClearAll,
  onNotificationClick,
}) => {
  if (!isOpen) return null;

  const unreadCount = notifications.filter(n => !n.read).length;

  const getTypeIcon = (type: AppNotification['type']) => {
    switch (type) {
      case 'ESCALATION': return <CloudLightning className="w-4 h-4 text-amber-400" />;
      case 'FIELD_REPORT': return <FileText className="w-4 h-4 text-emerald-400" />;
      case 'WEATHER_WARNING': return <Radio className="w-4 h-4 text-rose-400 animate-pulse" />;
      case 'ALERT_DISPATCH': return <ShieldAlert className="w-4 h-4 text-red-400" />;
      case 'SYSTEM': default: return <Activity className="w-4 h-4 text-blue-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end p-4 pt-16 bg-black/60 backdrop-blur-sm animate-fadeIn text-slate-100">
      <div 
        className="bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl max-w-md w-full flex flex-col overflow-hidden animate-in slide-in-from-right duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/90 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-slate-800 text-brand-400">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm text-white">Operational Notifications</h3>
                {unreadCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-red-500 text-white font-mono text-[10px] font-bold animate-pulse">
                    {unreadCount} New
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400">Real-time alerts, field updates & escalations</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action Bar */}
        <div className="px-4 py-2 border-b border-slate-800 bg-slate-950/50 flex items-center justify-between text-xs text-slate-400">
          <span>{notifications.length} Total Events</span>
          <div className="flex items-center gap-3">
            {unreadCount > 0 && (
              <button
                onClick={onMarkAllAsRead}
                className="hover:text-white flex items-center gap-1 text-[11px] font-medium text-brand-400 hover:underline"
              >
                <CheckCheck className="w-3.5 h-3.5" /> Mark All Read
              </button>
            )}
            {notifications.length > 0 && (
              <button
                onClick={onClearAll}
                className="hover:text-rose-400 flex items-center gap-1 text-[11px] font-medium"
              >
                <Trash2 className="w-3.5 h-3.5" /> Clear
              </button>
            )}
          </div>
        </div>

        {/* Notification List */}
        <div className="p-3 overflow-y-auto max-h-[480px] space-y-2 text-xs">
          {notifications.length === 0 ? (
            <div className="py-12 text-center text-slate-500 space-y-1">
              <Bell className="w-8 h-8 mx-auto text-slate-700" />
              <p className="font-semibold text-slate-400">No Notifications</p>
              <p className="text-[11px]">Command center is operating normally.</p>
            </div>
          ) : (
            notifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => {
                  onNotificationClick(notif);
                  onClose();
                }}
                className={`p-3 rounded-2xl border transition cursor-pointer space-y-1.5 ${
                  notif.read 
                    ? 'bg-slate-950/40 border-slate-800 text-slate-400 hover:bg-slate-800/60' 
                    : 'bg-slate-950/90 border-slate-700 text-slate-200 hover:bg-slate-800 shadow-md ring-1 ring-brand-500/30'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-800">
                      {getTypeIcon(notif.type)}
                    </div>
                    <h4 className="font-bold text-xs text-white">{notif.title}</h4>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <p className="text-[11px] text-slate-300 leading-snug pl-8">
                  {notif.message}
                </p>

                {notif.actionView && (
                  <div className="pl-8 pt-1 flex items-center justify-between text-[10px] text-brand-400 font-semibold">
                    <span>Open in {notif.actionView.replace('_', ' ').toUpperCase()}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/80 text-[10px] text-slate-500 text-center">
          SIH Landslide Decision-Support Notification Stream
        </div>
      </div>
    </div>
  );
};
