import React, { useState } from 'react';
import { 
  Clock, 
  X, 
  CloudRain, 
  TrendingUp, 
  FileCheck2, 
  CheckCircle2, 
  ClipboardList, 
  Send, 
  Users, 
  ShieldAlert,
  Filter,
  Download
} from 'lucide-react';

export interface AuditEvent {
  id: string;
  timestamp: string;
  timeStr: string;
  title: string;
  category: 'WEATHER' | 'RISK' | 'WORKFLOW' | 'ALERT';
  description: string;
  actor: string;
  icon: React.ElementType;
  badgeColor: string;
}

export const INITIAL_AUDIT_EVENTS: AuditEvent[] = [
  {
    id: "EVT-8807",
    timestamp: new Date(Date.now() - 3 * 60000).toISOString(),
    timeStr: "14:10 IST",
    title: "Public Citizen Warning Active",
    category: "ALERT",
    description: "Public Portal broadcast active for Dima Hasao and East Khasi Hills sectors with nearest shelter routing.",
    actor: "Citizen Portal Broadcast Daemon",
    icon: Users,
    badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
  },
  {
    id: "EVT-8806",
    timestamp: new Date(Date.now() - 5 * 60000).toISOString(),
    timeStr: "14:09 IST",
    title: "Stage-3 Emergency Broadcast Dispatched",
    category: "ALERT",
    description: "Multi-channel broadcast (14,250 SMS + Voice IVR) delivered to registered mobile numbers across Dima Hasao (Haflong sector).",
    actor: "Admin Command Center Dispatcher",
    icon: Send,
    badgeColor: "bg-red-500/20 text-red-300 border-red-500/40"
  },
  {
    id: "EVT-8805",
    timestamp: new Date(Date.now() - 7 * 60000).toISOString(),
    timeStr: "14:08 IST",
    title: "Disaster Response Plan Synthesized",
    category: "WORKFLOW",
    description: "Response Plan FR-2026-PLAN-402 created with NH-27 single-lane restriction directive and SDRF mobilization.",
    actor: "SDMA AI Decision Support Engine",
    icon: ClipboardList,
    badgeColor: "bg-indigo-500/20 text-indigo-300 border-indigo-500/40"
  },
  {
    id: "EVT-8804",
    timestamp: new Date(Date.now() - 9 * 60000).toISOString(),
    timeStr: "14:07 IST",
    title: "Ground Truth Field Incident Verified",
    category: "WORKFLOW",
    description: "Field Officer Roy confirmed 15cm tension cracks and roadbed subsidence on Haflong Hill Pass road with photo evidence.",
    actor: "Field Patrol Unit #4",
    icon: CheckCircle2,
    badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
  },
  {
    id: "EVT-8803",
    timestamp: new Date(Date.now() - 12 * 60000).toISOString(),
    timeStr: "14:05 IST",
    title: "Field Verification Request Dispatched",
    category: "WORKFLOW",
    description: "Automated verification task FR-2026-001 pushed to field mobile app for geo-tagged slope check.",
    actor: "Operations Triage System",
    icon: FileCheck2,
    badgeColor: "bg-amber-500/20 text-amber-300 border-amber-500/40"
  },
  {
    id: "EVT-8802",
    timestamp: new Date(Date.now() - 15 * 60000).toISOString(),
    timeStr: "14:04 IST",
    title: "Risk Escalation Detected (HIGH → VERY HIGH)",
    category: "RISK",
    description: "Haflong Sector 4 (Grid AS_DH_04) escalated from HIGH (74.2%) to VERY HIGH (88.4%) after crossing 100mm 24h rain threshold.",
    actor: "Risk-Fusion Escalation Engine",
    icon: TrendingUp,
    badgeColor: "bg-red-500/20 text-red-300 border-red-500/40"
  },
  {
    id: "EVT-8801",
    timestamp: new Date(Date.now() - 18 * 60000).toISOString(),
    timeStr: "14:02 IST",
    title: "IMD Live Rainfall Telemetry Synchronized",
    category: "WEATHER",
    description: "Haflong AWS recorded 12.5mm 1h surge (104.7mm 24h total). Orange alert nowcast advisory integrated.",
    actor: "IMD Telemetry Fetch Service",
    icon: CloudRain,
    badgeColor: "bg-cyan-500/20 text-cyan-300 border-cyan-500/40"
  }
];

interface AuditTimelineModalProps {
  isOpen: boolean;
  onClose: () => void;
  events?: AuditEvent[];
}

export const AuditTimelineModal: React.FC<AuditTimelineModalProps> = ({
  isOpen,
  onClose,
  events = INITIAL_AUDIT_EVENTS,
}) => {
  const [filter, setFilter] = useState<'ALL' | 'WEATHER' | 'RISK' | 'WORKFLOW' | 'ALERT'>('ALL');

  if (!isOpen) return null;

  const filteredEvents = filter === 'ALL' ? events : events.filter(e => e.category === filter);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn text-slate-100">
      <div 
        className="bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl max-w-2xl w-full flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/90 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-white tracking-wide">
                  Operational Event & Decision Audit Stream
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  REAL-TIME AUDIT LOG
                </span>
              </div>
              <p className="text-xs text-slate-400">Complete chronological audit of rainfall telemetry, escalations & dispatches</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Filter Pills */}
        <div className="p-3 border-b border-slate-800 bg-slate-950/50 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {(['ALL', 'WEATHER', 'RISK', 'WORKFLOW', 'ALERT'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`py-1 px-2.5 rounded-lg text-[10px] font-bold transition ${
                  filter === f
                    ? 'bg-indigo-600 text-white shadow'
                    : 'bg-slate-800/80 text-slate-400 hover:text-white'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          <span className="text-[11px] text-slate-400 font-mono">
            {filteredEvents.length} Recorded Events
          </span>
        </div>

        {/* Timeline Body */}
        <div className="p-5 overflow-y-auto max-h-[65vh] space-y-4 text-xs">
          <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
            {filteredEvents.map((evt) => {
              const Icon = evt.icon;
              return (
                <div key={evt.id} className="relative space-y-1">
                  {/* Dot */}
                  <div className="absolute -left-6 top-1 w-5 h-5 rounded-full bg-slate-900 border-2 border-indigo-400 flex items-center justify-center text-indigo-300">
                    <Icon className="w-2.5 h-2.5" />
                  </div>

                  <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800 space-y-1.5 hover:border-slate-700 transition">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-xs">{evt.title}</span>
                        <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded border ${evt.badgeColor}`}>
                          {evt.category}
                        </span>
                      </div>
                      <span className="font-mono text-slate-400 text-[10px] font-bold">
                        {evt.timeStr}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      {evt.description}
                    </p>

                    <div className="pt-1 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                      <span>Actor: <strong className="text-slate-400">{evt.actor}</strong></span>
                      <span>ID: {evt.id}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-slate-800 bg-slate-950/90 flex items-center justify-between text-xs text-slate-400">
          <span>Immutable Platform Operational Audit Trail</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition"
          >
            Close Viewer
          </button>
        </div>
      </div>
    </div>
  );
};
