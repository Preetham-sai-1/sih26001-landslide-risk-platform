import React, { useState } from 'react';
import { RiskZone, AlertLog } from '../types';
import { dispatchBroadcastAlert } from '../services/api';
import { X, Send, PhoneCall, MessageSquare, CheckCircle2, ShieldAlert, Users, Radio } from 'lucide-react';

interface AlertDispatchModalProps {
  zone: RiskZone | null;
  onClose: () => void;
  onAlertDispatched: (log: AlertLog) => void;
}

export const AlertDispatchModal: React.FC<AlertDispatchModalProps> = ({
  zone,
  onClose,
  onAlertDispatched
}) => {
  const [targetState, setTargetState] = useState(zone ? zone.state : 'Assam');
  const [targetDistrict, setTargetDistrict] = useState(zone ? zone.district : 'Dima Hasao');
  const [hazardLevel, setHazardLevel] = useState(zone ? zone.risk : 'VERY HIGH');
  const [message, setMessage] = useState(
    `EMERGENCY LANDSLIDE ALERT: Very High Risk in ${zone ? zone.district : 'Dima Hasao'} (${zone ? zone.name : 'Haflong Sector'}). Move to designated shelters away from cut-slopes.`
  );
  const [isSending, setIsSending] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);
  const [dispatchLog, setDispatchLog] = useState<AlertLog | null>(null);

  const handleDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSending(true);

    const res = await dispatchBroadcastAlert({
      target_state: targetState,
      target_district: targetDistrict,
      hazard_level: hazardLevel,
      message
    });

    setIsSending(false);
    if (res.success) {
      setSentSuccess(true);
      setDispatchLog(res.dispatchLog);
      onAlertDispatched(res.dispatchLog);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl space-y-0">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-500/20 text-red-400 border border-red-500/40 flex items-center justify-center">
              <Radio className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <h2 className="font-extrabold text-white text-base font-sans">Multi-Channel Emergency Alert Dispatch</h2>
              <p className="text-[11px] text-slate-400">Integrated SMS Broadcast & Automated Voice Call Network</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {sentSuccess && dispatchLog ? (
          <div className="p-6 space-y-4">
            <div className="bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-xl flex items-center gap-3">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 shrink-0" />
              <div>
                <h3 className="text-sm font-bold text-white">Broadcast Alert Dispatched Successfully</h3>
                <p className="text-xs text-slate-300">Message delivered to emergency subscribers in {dispatchLog.target_district}, {dispatchLog.target_state}.</p>
              </div>
            </div>

            {/* Delivery Stats Cards */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                <div className="flex items-center gap-1.5 text-blue-400 font-bold">
                  <MessageSquare className="w-4 h-4" />
                  <span>SMS Broadcast</span>
                </div>
                <div className="text-lg font-black text-white">{dispatchLog.sms_delivered.toLocaleString()} / {dispatchLog.sms_sent.toLocaleString()}</div>
                <span className="text-[10px] text-emerald-400 font-semibold">98.1% Delivery Rate</span>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                <div className="flex items-center gap-1.5 text-purple-400 font-bold">
                  <PhoneCall className="w-4 h-4" />
                  <span>Automated Voice Calls</span>
                </div>
                <div className="text-lg font-black text-white">{dispatchLog.voice_dispatched.toLocaleString()} Dispatched</div>
                <span className="text-[10px] text-purple-300 font-semibold">{dispatchLog.voice_answered_pct}% Call Answer Rate</span>
              </div>
            </div>

            {/* Message Details */}
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs space-y-1">
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Broadcast Message Content</span>
              <p className="text-slate-200 italic font-mono text-[11px]">{dispatchLog.message}</p>
            </div>

            <button
              onClick={onClose}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold text-xs border border-slate-700 transition-colors"
            >
              Close Dispatch Center
            </button>
          </div>
        ) : (
          <form onSubmit={handleDispatch} className="p-5 space-y-4 text-xs">
            {/* Target Selection */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Target State</label>
                <input
                  type="text"
                  value={targetState}
                  onChange={(e) => setTargetState(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white font-medium focus:border-brand-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Target District</label>
                <input
                  type="text"
                  value={targetDistrict}
                  onChange={(e) => setTargetDistrict(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white font-medium focus:border-brand-500 focus:outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-slate-300 font-semibold block mb-1">Hazard Level Classification</label>
              <select
                value={hazardLevel}
                onChange={(e) => setHazardLevel(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white font-medium focus:border-brand-500 focus:outline-none"
              >
                <option value="VERY HIGH">VERY HIGH HAZARD (Stage 3 Red Alert)</option>
                <option value="HIGH">HIGH HAZARD (Stage 2 Orange Alert)</option>
                <option value="MODERATE">MODERATE HAZARD (Stage 1 Yellow Warning)</option>
              </select>
            </div>

            {/* Message Input */}
            <div>
              <label className="text-slate-300 font-semibold block mb-1">Alert Broadcast Text</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white font-mono text-xs focus:border-brand-500 focus:outline-none"
                required
              />
            </div>

            {/* Subscribed Reach Estimate */}
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-300">
                <Users className="w-4 h-4 text-brand-400" />
                <span>Estimated Target Population Reach:</span>
              </div>
              <span className="font-extrabold text-white text-sm">
                {targetDistrict === "Dima Hasao" ? "14,250 Registered Residents" : "9,500 Registered Residents"}
              </span>
            </div>

            {/* Dispatch Action */}
            <button
              type="submit"
              disabled={isSending}
              className="w-full py-3 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white rounded-xl font-bold text-xs shadow-lg shadow-red-500/25 flex items-center justify-center gap-2 transition-all"
            >
              <Send className="w-4 h-4" /> {isSending ? "Dispatching Broadcast Alert..." : "Dispatch Emergency Alert Now"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
