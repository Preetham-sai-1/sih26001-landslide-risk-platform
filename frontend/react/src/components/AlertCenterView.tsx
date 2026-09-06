import React, { useState } from 'react';
import { RiskZone, AlertLog, RiskLevel, AutoAlertRecord } from '../types';
import { ALERT_LANGUAGES, AlertLanguage, generateLocalizedAlertMessage } from '../utils/multilingualAlerts';
import { PROTOTYPE_THRESHOLDS } from '../utils/autoAlertEngine';
import { 
  Radio, 
  Send, 
  Smartphone, 
  PhoneCall, 
  Bell, 
  Languages, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldAlert, 
  Clock,
  Search,
  Zap,
  Play,
  Check,
  XCircle,
  FileCheck2
} from 'lucide-react';

interface AlertCenterViewProps {
  zones: RiskZone[];
  alerts: AlertLog[];
  onAlertDispatched: (alert: AlertLog) => void;
  isAutoAlertingEnabled?: boolean;
  onToggleAutoAlerting?: () => void;
  autoAlertRecords?: AutoAlertRecord[];
  onAcknowledgeAutoAlert?: (alertId: string) => void;
  onResolveAutoAlert?: (alertId: string) => void;
  onRunDemoSequence?: (zone: RiskZone) => void;
  onManualOverride?: (zone: RiskZone) => void;
}

export const AlertCenterView: React.FC<AlertCenterViewProps> = ({
  zones,
  alerts,
  onAlertDispatched,
  isAutoAlertingEnabled = true,
  onToggleAutoAlerting,
  autoAlertRecords = [],
  onAcknowledgeAutoAlert,
  onResolveAutoAlert,
  onRunDemoSequence,
  onManualOverride
}) => {
  const [selectedGridId, setSelectedGridId] = useState<string>(zones[0]?.grid_id || '');
  const activeZone = zones.find(z => z.grid_id === selectedGridId) || zones[0];

  const [selectedSeverity, setSelectedSeverity] = useState<RiskLevel>(activeZone?.risk || 'VERY HIGH');
  const [selectedLang, setSelectedLang] = useState<AlertLanguage>('en');
  const [channels, setChannels] = useState<{ sms: boolean; voice: boolean; inApp: boolean }>({
    sms: true,
    voice: true,
    inApp: true,
  });
  const [stage, setStage] = useState<'DRAFT' | 'APPROVE' | 'DISPATCH'>('DRAFT');
  const [customMessage, setCustomMessage] = useState<string>('');
  const [isSending, setIsSending] = useState(false);
  const [searchHistory, setSearchHistory] = useState('');

  // Update message when zone, severity, or language changes
  React.useEffect(() => {
    if (activeZone) {
      const generated = generateLocalizedAlertMessage(activeZone, selectedSeverity, selectedLang);
      setCustomMessage(generated);
      setStage('DRAFT');
    }
  }, [selectedGridId, selectedSeverity, selectedLang]);

  if (!activeZone) return null;

  const estimatedRecipients = Math.round(activeZone.population * 1.8);

  const handleDispatch = () => {
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
      setStage('DRAFT');
    }, 1000);
  };

  const filteredAlerts = alerts.filter(a =>
    !searchHistory ||
    a.id.toLowerCase().includes(searchHistory.toLowerCase()) ||
    a.target_district.toLowerCase().includes(searchHistory.toLowerCase()) ||
    a.target_state.toLowerCase().includes(searchHistory.toLowerCase()) ||
    a.message.toLowerCase().includes(searchHistory.toLowerCase())
  );

  return (
    <div className="w-full h-full flex flex-col bg-slate-950 text-slate-100 overflow-hidden select-none">
      {/* Header */}
      <div className="p-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between shrink-0 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-600 via-rose-600 to-amber-600 flex items-center justify-center shadow-lg shadow-red-500/25">
            <Radio className="w-5 h-5 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold text-white font-sans">
                EMERGENCY ALERT & DISPATCH CENTER
              </h2>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                THRESHOLD AUTOMATIC ALERTING
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Automated threshold evaluation, persistence protection, cooldown deduplication & emergency admin manual override
            </p>
          </div>
        </div>

        {/* Global Auto Alerting Control Switch */}
        <div className="flex items-center gap-2">
          {onToggleAutoAlerting && (
            <button
              onClick={onToggleAutoAlerting}
              className={`py-1.5 px-3 rounded-xl font-bold text-xs flex items-center gap-1.5 border transition shadow-md ${
                isAutoAlertingEnabled
                  ? 'bg-emerald-600 text-white border-emerald-400 shadow-emerald-500/20'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >
              <Zap className={`w-3.5 h-3.5 ${isAutoAlertingEnabled ? 'text-white animate-pulse' : 'text-slate-500'}`} />
              <span>AUTO ALERTING: {isAutoAlertingEnabled ? 'ON' : 'OFF'}</span>
            </button>
          )}

          {onManualOverride && (
            <button
              onClick={() => onManualOverride(activeZone)}
              className="py-1.5 px-3 rounded-xl font-bold text-xs bg-red-600 hover:bg-red-500 text-white border border-red-400 flex items-center gap-1.5 shadow-md transition"
              title="Emergency Admin Manual Dispatch Override"
            >
              <Send className="w-3.5 h-3.5" />
              <span>MANUAL OVERRIDE</span>
            </button>
          )}
        </div>
      </div>

      {/* Prototype Alert Threshold Banner */}
      <div className="bg-slate-900/60 px-4 py-2 border-b border-slate-800/80 flex items-center justify-between text-xs font-mono shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-amber-400 font-bold uppercase flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span>{PROTOTYPE_THRESHOLDS.DISPLAY_LABEL}:</span>
          </span>
          <span className="text-slate-300">Watch: <strong>60%</strong></span>
          <span className="text-slate-300">High: <strong>75%</strong></span>
          <span className="text-slate-300">Auto Alert: <strong className="text-red-400">85%</strong></span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-slate-400 italic">Delivery State:</span>
          <span className="text-amber-300 font-bold bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
            DEMO / QUEUED (External delivery unavailable)
          </span>
          {onRunDemoSequence && (
            <button
              onClick={() => onRunDemoSequence(activeZone)}
              className="py-1 px-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-[10px] rounded-lg shadow flex items-center gap-1 transition"
            >
              <Play className="w-3 h-3" />
              <span>TEST DEMO AUTO-ALERT (72% → 79% → 88% → 92%)</span>
            </button>
          )}
        </div>
      </div>

      {/* Main 2-Column Layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-800 overflow-hidden">
        {/* LEFT COLUMN: Automatic Alerts Queue & State Management */}
        <div className="h-full overflow-y-auto p-5 space-y-4 bg-slate-950">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-red-400" />
              <h3 className="font-extrabold text-white text-sm uppercase tracking-wider">
                Automatic Alert Queue ({autoAlertRecords.length})
              </h3>
            </div>
            <span className="text-[10px] text-emerald-400 font-mono font-bold">LIVE THRESHOLD ENGINE</span>
          </div>

          <div className="space-y-3">
            {autoAlertRecords.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-xs bg-slate-900/40 rounded-2xl border border-slate-800/60 space-y-2">
                <Radio className="w-6 h-6 text-slate-600 mx-auto" />
                <p className="font-bold text-slate-400">No active automatic alerts generated yet</p>
                <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                  Automatic alerts will trigger when risk score crosses 85% threshold for 2 consecutive cycles or on a major risk jump.
                </p>
                {onRunDemoSequence && (
                  <button
                    onClick={() => onRunDemoSequence(activeZone)}
                    className="mt-2 py-1.5 px-3 bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs rounded-xl shadow inline-flex items-center gap-1.5"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Run Demo Auto-Alert Sequence (72% → 79% → 88% → 92%)</span>
                  </button>
                )}
              </div>
            ) : (
              autoAlertRecords.map(rec => {
                const isAck = rec.alert_state === 'ACKNOWLEDGED';
                const isRes = rec.alert_state === 'RESOLVED';

                return (
                  <div
                    key={rec.id}
                    className={`p-4 rounded-2xl border transition space-y-2.5 shadow-lg ${
                      isRes
                        ? 'bg-slate-900/40 border-slate-800/80 opacity-70'
                        : isAck
                        ? 'bg-slate-900/80 border-emerald-500/40'
                        : 'bg-slate-900 border-red-500/50 shadow-red-500/10'
                    }`}
                  >
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-amber-400">{rec.id}</span>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black border ${
                          isRes
                            ? 'bg-slate-800 text-slate-400 border-slate-700'
                            : isAck
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : 'bg-red-500/20 text-red-300 border-red-500/40'
                        }`}>
                          {rec.alert_state}
                        </span>
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                          {rec.is_auto ? 'AUTO' : 'MANUAL'}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(rec.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} IST
                      </span>
                    </div>

                    <div>
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-white text-xs">{rec.zone_name} ({rec.district}, {rec.target_state})</h4>
                        <span className="font-mono text-xs font-bold text-red-400">
                          {rec.previous_probability}% → {rec.current_probability}%
                        </span>
                      </div>
                      <p className="text-[11px] text-amber-300 italic font-medium mt-1">
                        "{rec.trigger_reason}"
                      </p>
                    </div>

                    <div className="p-2 bg-slate-950 rounded-xl border border-slate-800 text-[10px] text-slate-300 space-y-1">
                      <div><strong className="text-slate-400">Trigger Factors:</strong> {rec.trigger_factors.join(' • ')}</div>
                      <div><strong className="text-slate-400">Impacted Infrastructure:</strong> {rec.affected_infrastructure.join(', ')}</div>
                      <div><strong className="text-slate-400">Delivery Channels:</strong> {rec.delivery_channels.join(', ')} ({rec.delivery_status})</div>
                    </div>

                    {/* Action Buttons: Acknowledge & Resolve */}
                    <div className="flex items-center justify-end gap-2 pt-1">
                      {!isAck && !isRes && onAcknowledgeAutoAlert && (
                        <button
                          onClick={() => onAcknowledgeAutoAlert(rec.id)}
                          className="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] rounded-xl flex items-center gap-1 shadow transition"
                        >
                          <Check className="w-3 h-3" />
                          <span>ACKNOWLEDGE</span>
                        </button>
                      )}

                      {!isRes && onResolveAutoAlert && (
                        <button
                          onClick={() => onResolveAutoAlert(rec.id)}
                          className="py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-[10px] rounded-xl flex items-center gap-1 transition"
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          <span>MARK RESOLVED</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Emergency Manual Override & Broadcast History */}
        <div className="h-full overflow-y-auto p-5 space-y-4 bg-slate-950/60">
          {/* Manual Broadcast Composer */}
          <div className="space-y-3 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="font-extrabold text-white text-xs uppercase tracking-wider flex items-center gap-2">
                <Send className="w-3.5 h-3.5 text-amber-400" />
                <span>Manual Emergency Broadcast Override</span>
              </h3>
              <span className="text-[10px] text-amber-400 font-mono font-bold">ADMIN OVERRIDE</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase">Target Sector</label>
                <select
                  value={selectedGridId}
                  onChange={(e) => setSelectedGridId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-white font-semibold focus:outline-none text-xs"
                >
                  {zones.map(z => (
                    <option key={z.grid_id} value={z.grid_id}>
                      {z.name} ({z.district}) - {z.risk}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase">Language</label>
                <select
                  value={selectedLang}
                  onChange={(e) => setSelectedLang(e.target.value as AlertLanguage)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-white font-semibold focus:outline-none text-xs"
                >
                  {ALERT_LANGUAGES.map(l => (
                    <option key={l.code} value={l.code}>{l.name} ({l.nativeName})</option>
                  ))}
                </select>
              </div>
            </div>

            <textarea
              rows={2}
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100 text-xs focus:outline-none"
            />

            <button
              disabled={isSending}
              onClick={handleDispatch}
              className="w-full py-2 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 text-white font-bold text-xs rounded-xl shadow flex items-center justify-center gap-1.5 transition"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSending ? 'TRANSMITTING MANUAL OVERRIDE...' : 'DISPATCH EMERGENCY MANUAL OVERRIDE'}</span>
            </button>
          </div>

          {/* Broadcast Log History */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="font-extrabold text-white text-xs uppercase tracking-wider flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-emerald-400" />
                <span>Broadcast Log History ({alerts.length})</span>
              </h3>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
              <input
                type="text"
                value={searchHistory}
                onChange={(e) => setSearchHistory(e.target.value)}
                placeholder="Filter by district, state, ID..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-3 py-1 text-xs text-white placeholder-slate-500 focus:outline-none"
              />
            </div>

            <div className="space-y-2.5">
              {filteredAlerts.map(log => (
                <div key={log.id} className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 space-y-2 text-xs">
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-amber-400">{log.id}</span>
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-red-500/20 text-red-400 border border-red-500/40">
                        {log.hazard_level}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} IST
                    </span>
                  </div>

                  <div>
                    <h4 className="font-bold text-white text-xs">{log.target_district}, {log.target_state}</h4>
                    <p className="text-[11px] text-slate-300 italic bg-slate-950 p-2 rounded-lg border border-slate-800 mt-1">
                      "{log.message}"
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
