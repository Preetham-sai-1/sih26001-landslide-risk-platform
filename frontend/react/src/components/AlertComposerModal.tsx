import React, { useState, useEffect } from 'react';
import { RiskZone, AlertLog, RiskLevel } from '../types';
import { ALERT_LANGUAGES, AlertLanguage, generateLocalizedAlertMessage } from '../utils/multilingualAlerts';
import { 
  Radio, 
  Send, 
  X, 
  Smartphone, 
  PhoneCall, 
  Bell, 
  Languages, 
  CheckCircle2, 
  AlertTriangle, 
  Eye, 
  Users, 
  ShieldAlert,
  Clock
} from 'lucide-react';

interface AlertComposerModalProps {
  zone: RiskZone | null;
  zones: RiskZone[];
  onClose: () => void;
  onAlertDispatched: (alert: AlertLog) => void;
}

export const AlertComposerModal: React.FC<AlertComposerModalProps> = ({
  zone,
  zones,
  onClose,
  onAlertDispatched,
}) => {
  const [selectedGridId, setSelectedGridId] = useState<string>(zone?.grid_id || zones[0]?.grid_id || '');
  const activeZone = zones.find(z => z.grid_id === selectedGridId) || zone || zones[0];

  const [selectedSeverity, setSelectedSeverity] = useState<RiskLevel>(activeZone?.risk || 'VERY HIGH');
  const [selectedLang, setSelectedLang] = useState<AlertLanguage>('en');
  const [channels, setChannels] = useState<{ sms: boolean; voice: boolean; inApp: boolean }>({
    sms: true,
    voice: true,
    inApp: true,
  });
  const [targetGroup, setTargetGroup] = useState<string>('All Public & Emergency Responders');
  const [customMessage, setCustomMessage] = useState<string>('');
  const [isSending, setIsSending] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  useEffect(() => {
    if (activeZone) {
      const generated = generateLocalizedAlertMessage(activeZone, selectedSeverity, selectedLang);
      setCustomMessage(generated);
    }
  }, [selectedGridId, selectedSeverity, selectedLang]);

  if (!activeZone) return null;

  const estimatedRecipients = targetGroup.includes('All') 
    ? Math.round(activeZone.population * 1.8) 
    : targetGroup.includes('NDRF') 
    ? 250 
    : 1200;

  const handleSend = () => {
    setIsSending(true);
    setTimeout(() => {
      const newAlert: AlertLog = {
        id: `ALT-2026-${Math.floor(Math.random() * 9000) + 1000}`,
        timestamp: new Date().toISOString(),
        target_state: activeZone.state,
        target_district: activeZone.district,
        hazard_level: selectedSeverity,
        sms_sent: channels.sms ? estimatedRecipients : 0,
        sms_delivered: channels.sms ? Math.floor(estimatedRecipients * 0.98) : 0,
        voice_dispatched: channels.voice ? estimatedRecipients : 0,
        voice_answered_pct: channels.voice ? 86.4 : 0,
        message: customMessage,
        status: "Completed (Broadcast Delivered)"
      };
      setIsSending(false);
      onAlertDispatched(newAlert);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn text-slate-100">
      <div 
        className="bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl max-w-2xl w-full flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/90 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-red-600/20 text-red-400 border border-red-500/40">
              <Radio className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-white tracking-wide">
                  Emergency Mass Broadcast Alert Composer
                </h2>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/40">
                  MULTI-CHANNEL DISPATCH
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Compose, translate & broadcast verified emergency bulletins across Northeast India
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 overflow-y-auto max-h-[70vh] space-y-4 text-xs">
          {/* Target Zone & Severity Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Zone Selector */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase">Target Monitored Sector</label>
              <select
                value={selectedGridId}
                onChange={(e) => setSelectedGridId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white font-semibold focus:outline-none focus:border-brand-500"
              >
                {zones.map(z => (
                  <option key={z.grid_id} value={z.grid_id}>
                    {z.name} ({z.district}, {z.state}) - {z.risk}
                  </option>
                ))}
              </select>
            </div>

            {/* Severity Level */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase">Broadcast Severity Tier</label>
              <div className="grid grid-cols-3 gap-1.5">
                {(['MODERATE', 'HIGH', 'VERY HIGH'] as RiskLevel[]).map(sev => (
                  <button
                    key={sev}
                    type="button"
                    onClick={() => setSelectedSeverity(sev)}
                    className={`py-2 px-2 rounded-xl font-extrabold text-[10px] transition border ${
                      selectedSeverity === sev
                        ? sev === 'VERY HIGH'
                          ? 'bg-red-600 text-white border-red-400 shadow-md'
                          : sev === 'HIGH'
                          ? 'bg-amber-600 text-white border-amber-400 shadow-md'
                          : 'bg-yellow-600 text-white border-yellow-400 shadow-md'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    {sev}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Multilingual Selector */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-slate-400 uppercase flex items-center gap-1.5">
                <Languages className="w-3.5 h-3.5 text-brand-400" />
                <span>Regional Alert Language (7 NER Localizations)</span>
              </label>
              <span className="text-[10px] text-slate-500 italic">Auto-generates localized template</span>
            </div>

            <div className="grid grid-cols-4 md:grid-cols-7 gap-1.5">
              {ALERT_LANGUAGES.map(lang => (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => setSelectedLang(lang.code)}
                  className={`py-1.5 px-2 rounded-xl text-center transition border ${
                    selectedLang === lang.code
                      ? 'bg-gradient-to-r from-brand-600 to-indigo-600 text-white border-brand-400 font-bold shadow'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white hover:bg-slate-800/80'
                  }`}
                >
                  <span className="text-xs block font-bold">{lang.nativeName}</span>
                  <span className="text-[9px] text-slate-400 block">{lang.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Recipient Target Group & Channels */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Recipient Group */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase">Target Recipient Group</label>
              <select
                value={targetGroup}
                onChange={(e) => setTargetGroup(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white font-medium focus:outline-none"
              >
                <option>All Public & Emergency Responders</option>
                <option>District Magistrates & Sub-Divisional Officers</option>
                <option>NDRF / SDRF Search & Rescue Teams</option>
                <option>Village Panchayat Heads & Community Relief Shelters</option>
              </select>
            </div>

            {/* Broadcast Channels */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase">Disaster Broadcast Channels</label>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => setChannels(c => ({ ...c, sms: !c.sms }))}
                  className={`py-2 px-2 rounded-xl font-bold text-[10px] flex items-center justify-center gap-1 border transition ${
                    channels.sms ? 'bg-emerald-600/30 text-emerald-300 border-emerald-500/60' : 'bg-slate-950 text-slate-500 border-slate-800'
                  }`}
                >
                  <Smartphone className="w-3 h-3" /> SMS ({channels.sms ? 'ON' : 'OFF'})
                </button>

                <button
                  type="button"
                  onClick={() => setChannels(c => ({ ...c, voice: !c.voice }))}
                  className={`py-2 px-2 rounded-xl font-bold text-[10px] flex items-center justify-center gap-1 border transition ${
                    channels.voice ? 'bg-indigo-600/30 text-indigo-300 border-indigo-500/60' : 'bg-slate-950 text-slate-500 border-slate-800'
                  }`}
                >
                  <PhoneCall className="w-3 h-3" /> IVR ({channels.voice ? 'ON' : 'OFF'})
                </button>

                <button
                  type="button"
                  onClick={() => setChannels(c => ({ ...c, inApp: !c.inApp }))}
                  className={`py-2 px-2 rounded-xl font-bold text-[10px] flex items-center justify-center gap-1 border transition ${
                    channels.inApp ? 'bg-purple-600/30 text-purple-300 border-purple-500/60' : 'bg-slate-950 text-slate-500 border-slate-800'
                  }`}
                >
                  <Bell className="w-3 h-3" /> In-App ({channels.inApp ? 'ON' : 'OFF'})
                </button>
              </div>
            </div>
          </div>

          {/* Editable Alert Message Box */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-slate-400 uppercase">Broadcast Message Body</label>
              <span className="text-[10px] font-mono text-slate-500">{customMessage.length} characters</span>
            </div>
            <textarea
              rows={4}
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-slate-100 font-sans text-xs focus:outline-none focus:border-brand-500 leading-relaxed"
            />
          </div>

          {/* Broadcast Estimation Stats */}
          <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Estimated Reached Audience:</span>
            <span className="font-extrabold font-mono text-emerald-400">
              ~{estimatedRecipients.toLocaleString()} Target Devices across {activeZone.district}
            </span>
          </div>

          <p className="text-[10px] text-slate-500 italic text-center">
            * Prototype Disaster Alert Simulator. In production, broadcast is sent via NDMA / C-DOT CAP server.
          </p>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/90 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={isSending || (!channels.sms && !channels.voice && !channels.inApp)}
            onClick={handleSend}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-extrabold text-xs shadow-lg shadow-red-500/25 flex items-center gap-2 transition disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            <span>{isSending ? 'DISPATCHING BROADCAST...' : 'CONFIRM & DISPATCH BROADCAST'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
