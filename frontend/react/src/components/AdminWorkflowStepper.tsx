import React, { useState } from 'react';
import { FieldReport } from '../types';
import { Activity, CheckCircle2, AlertTriangle, ShieldCheck, Send, RefreshCw, ChevronRight } from 'lucide-react';

interface AdminWorkflowStepperProps {
  reports: FieldReport[];
  onOpenAlertModal: () => void;
}

const STAGES = [
  { id: 'REQUEST', name: '1. Request Received', desc: 'Ground verification field log submitted' },
  { id: 'VERIFY', name: '2. Spatial Verification', desc: 'Cross-check against SRTM terrain & IMD rain' },
  { id: 'ASSESS', name: '3. Hazard Assessment', desc: 'ML susceptibility score & impact estimate' },
  { id: 'ESCALATE', name: '4. Executive Escalation', desc: 'Disaster cell notification & NDRF alert' },
  { id: 'ALERT', name: '5. Broadcast Alert', desc: 'SMS & Automated Voice Dispatch' },
  { id: 'MONITOR', name: '6. Post-Alert Monitor', desc: 'Continuous satellite & sensor tracking' },
];

export const AdminWorkflowStepper: React.FC<AdminWorkflowStepperProps> = ({
  reports,
  onOpenAlertModal
}) => {
  const [currentStageIdx, setCurrentStageIdx] = useState(1);
  const selectedReport = reports[0] || null;

  const handleNextStage = () => {
    if (currentStageIdx < STAGES.length - 1) {
      setCurrentStageIdx(prev => prev + 1);
    }
  };

  return (
    <div className="w-full h-full p-6 bg-slate-950 overflow-y-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <span className="text-xs font-bold text-brand-400 uppercase tracking-widest">End-to-End Operational Lifecycle</span>
          <h2 className="text-2xl font-black text-white mt-1">Admin Disaster Response Stepper</h2>
          <p className="text-xs text-slate-400">Structured workflow: Incident Verification to Mass Broadcast Alerting</p>
        </div>
        <button
          onClick={() => setCurrentStageIdx(0)}
          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-slate-700"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Reset Stepper
        </button>
      </div>

      {/* Stepper Pipeline Visual Bar */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
        {STAGES.map((stage, idx) => {
          const isActive = idx === currentStageIdx;
          const isCompleted = idx < currentStageIdx;
          return (
            <div
              key={stage.id}
              onClick={() => setCurrentStageIdx(idx)}
              className={`p-3 rounded-xl border transition-all cursor-pointer select-none ${
                isActive
                  ? 'bg-brand-600/20 border-brand-500 text-white shadow-lg shadow-brand-500/10'
                  : isCompleted
                  ? 'bg-slate-900 border-slate-700 text-slate-300'
                  : 'bg-slate-950/60 border-slate-800/80 text-slate-500'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-mono font-bold uppercase">{stage.id}</span>
                {isCompleted ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : isActive ? (
                  <Activity className="w-4 h-4 text-brand-400 animate-pulse" />
                ) : (
                  <span className="w-2 h-2 rounded-full bg-slate-700" />
                )}
              </div>
              <h3 className="text-xs font-bold truncate">{stage.name}</h3>
              <p className="text-[10px] text-slate-400 truncate mt-0.5">{stage.desc}</p>
            </div>
          );
        })}
      </div>

      {/* Active Stage Detail & Action Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Stage Status & Action */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <span className="text-xs font-bold text-brand-400">STAGE {currentStageIdx + 1} OF 6</span>
              <h3 className="text-xl font-extrabold text-white mt-0.5">{STAGES[currentStageIdx].name}</h3>
            </div>
            <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 rounded-full text-xs font-extrabold">
              Active Phase
            </span>
          </div>

          <p className="text-sm text-slate-300">{STAGES[currentStageIdx].desc}</p>

          {/* Active Stage Specific Details */}
          {currentStageIdx === 0 && (
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 text-xs">
              <span className="text-slate-400 font-bold block uppercase">Submitted Field Verification Log</span>
              <div className="grid grid-cols-2 gap-2 text-slate-200">
                <div><span className="text-slate-400">Location:</span> {selectedReport?.location_name || 'Haflong Hill Road'}</div>
                <div><span className="text-slate-400">District:</span> {selectedReport?.district || 'Dima Hasao'}</div>
                <div><span className="text-slate-400">Severity:</span> <span className="text-red-400 font-bold">{selectedReport?.severity || 'Critical'}</span></div>
                <div><span className="text-slate-400">Reporter:</span> {selectedReport?.reporter_name || 'Field Patrol'}</div>
              </div>
            </div>
          )}

          {currentStageIdx === 1 && (
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 text-xs">
              <span className="text-slate-400 font-bold block uppercase">Spatial Feature Cross-Check Result</span>
              <p className="text-slate-300">Slope angle calculated at <strong className="text-amber-400">34.2°</strong> from 90 SRTM DEM tiles. 7-day rainfall accumulation verified at <strong className="text-cyan-400">362.5 mm</strong> from IMD daily rasters.</p>
            </div>
          )}

          {currentStageIdx === 2 && (
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 text-xs">
              <span className="text-slate-400 font-bold block uppercase">Machine Learning Risk Score Output</span>
              <div className="flex items-center gap-4">
                <span className="text-3xl font-black text-red-500">92.4%</span>
                <div>
                  <span className="font-extrabold text-white block">VERY HIGH SUSCEPTIBILITY</span>
                  <span className="text-slate-400 text-[11px]">Primary Driver: Antecedent rainfall exceeding 300mm threshold + 34° slope</span>
                </div>
              </div>
            </div>
          )}

          {currentStageIdx === 3 && (
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 text-xs">
              <span className="text-slate-400 font-bold block uppercase">Executive Escalation Status</span>
              <p className="text-slate-300">State Disaster Management Authority (SDMA) Assam & NDRF 1st Battalion notified. Emergency protocol activated for Dima Hasao sector.</p>
            </div>
          )}

          {currentStageIdx === 4 && (
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3 text-xs">
              <span className="text-slate-400 font-bold block uppercase">Mass Alert Broadcast Ready</span>
              <p className="text-slate-300">Ready to dispatch Stage-3 emergency SMS and automated voice calls to 14,250 registered residents in Dima Hasao.</p>
              <button
                onClick={onOpenAlertModal}
                className="py-2.5 px-4 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white rounded-xl font-bold text-xs shadow-lg shadow-red-500/20 flex items-center gap-2"
              >
                <Send className="w-4 h-4" /> Open Broadcast Alert Dispatch Panel
              </button>
            </div>
          )}

          {currentStageIdx === 5 && (
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 text-xs">
              <span className="text-slate-400 font-bold block uppercase">Post-Alert Continuous Monitoring</span>
              <p className="text-emerald-400 font-semibold">Active Monitoring engaged. 13,980 SMS alerts delivered. Radar & IMD daily rainfall rasters stream every 24h.</p>
            </div>
          )}

          {/* Stepper Advancement Button */}
          <div className="pt-3 border-t border-slate-800 flex justify-end">
            {currentStageIdx < STAGES.length - 1 ? (
              <button
                onClick={handleNextStage}
                className="py-2.5 px-5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl font-bold text-xs shadow-lg shadow-brand-500/25 flex items-center gap-2 transition-all"
              >
                Advance to Next Stage ({STAGES[currentStageIdx + 1].id}) <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> Lifecycle Complete — Continuous Monitoring Active
              </span>
            )}
          </div>
        </div>

        {/* Audit Log Sidebar */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-3 text-xs">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="font-extrabold text-white">Live Audit Log</span>
            <span className="text-[10px] text-slate-400 font-mono">UTC Timestamp</span>
          </div>
          <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
            {[
              { time: "12:15:00", text: "Incident verification report submitted for Haflong Hill", status: "VERIFIED" },
              { time: "12:15:04", text: "SRTM DEM & IMD rainfall zonal feature extraction matched", status: "SUCCESS" },
              { time: "12:15:10", text: "ML susceptibility model evaluated zone at 92.4% score", status: "HIGH_RISK" },
              { time: "12:15:22", text: "Executive escalation sent to SDMA Assam cells", status: "ESCALATED" },
              { time: "12:15:35", text: "Broadcast SMS & Voice alert dispatched to Dima Hasao", status: "DISPATCHED" },
            ].map((log, i) => (
              <div key={i} className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 space-y-1">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="font-mono text-slate-400">{log.time}</span>
                  <span className="font-bold text-brand-400">{log.status}</span>
                </div>
                <p className="text-[11px] text-slate-300">{log.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
