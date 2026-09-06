import React, { useState, useEffect } from 'react';
import { 
  Zap, 
  Play, 
  Pause, 
  RotateCcw, 
  ChevronRight, 
  ChevronLeft, 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  CloudRain, 
  TrendingUp, 
  Grid, 
  FileCheck2, 
  ShieldAlert, 
  ClipboardList, 
  Radio, 
  Users,
  Clock,
  Sparkles
} from 'lucide-react';
import { RiskZone } from '../types';

interface DisasterDrillModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExecuteDrillStep?: (stepIndex: number) => void;
  targetZone?: RiskZone | null;
}

export const DRILL_STEPS = [
  {
    step: 1,
    title: "1. Cloudburst Rainfall Surge Detected",
    phase: "TRIGGER",
    icon: CloudRain,
    color: "text-cyan-400 bg-cyan-500/20 border-cyan-500/40",
    description: "IMD Automated Weather Station (AWS) records sudden cloudburst precipitation (+75mm in 3h) across vulnerable valley cut-slopes.",
    telemetry: "Rainfall: 185.0 mm/24h • Soil Saturation: 94% • Warning: RED NOWCAST"
  },
  {
    step: 2,
    title: "2. Real-Time Terrain Saturation & Risk Recalculation",
    phase: "ANALYSIS",
    icon: TrendingUp,
    color: "text-amber-400 bg-amber-500/20 border-amber-500/40",
    description: "Risk-Fusion Decision Engine dynamically recalculates slope stability. Dynamic operational hazard trigger spikes terrain vulnerability.",
    telemetry: "Risk Score: 52.4% → 89.6% • Factor Driver: 7-Day Antecedent Moisture"
  },
  {
    step: 3,
    title: "3. Spatial Grid Cell Escalation (LOW → VERY HIGH)",
    phase: "ESCALATION",
    icon: Grid,
    color: "text-red-400 bg-red-500/20 border-red-500/40",
    description: "Monitored 1 km spatial grid cells breach critical safety thresholds. Visual polygon styling updates with red pulsating glow.",
    telemetry: "Transition: HIGH → VERY HIGH • Escalation Rank: #1 Critical Sector"
  },
  {
    step: 4,
    title: "4. Command Center P1 Priority Queue Reprioritization",
    phase: "TRIAGE",
    icon: ShieldAlert,
    color: "text-rose-400 bg-rose-500/20 border-rose-500/40",
    description: "The Operations Center automatically elevates the affected hill sector to P1 CRITICAL priority with emergency badge triggers.",
    telemetry: "Priority: P1 CRITICAL • Estimated Impact: 4 Villages, 12,400 Population"
  },
  {
    step: 5,
    title: "5. Ground Field Verification Request Auto-Dispatched",
    phase: "FIELD ACTION",
    icon: FileCheck2,
    color: "text-indigo-400 bg-indigo-500/20 border-indigo-500/40",
    description: "Field request dispatched to nearby SDMA / Patrol units with GPS coordinates to inspect tension cracks along upper highway cut-slopes.",
    telemetry: "Task: FR-2026-DRILL-01 • Assigned Unit: Inspector Tenzing (Patrol #4)"
  },
  {
    step: 6,
    title: "6. Field Ground Truth Verification & Photo Confirmed",
    phase: "VERIFICATION",
    icon: CheckCircle2,
    color: "text-emerald-400 bg-emerald-500/20 border-emerald-500/40",
    description: "Field officer submits geo-tagged verification with photo confirmation of 15cm tension cracks and active debris movement.",
    telemetry: "Verification: CONFIRMED SEVERE • Road Movement: 12cm displacement"
  },
  {
    step: 7,
    title: "7. Disaster Response Plan Synthesis Generated",
    phase: "DECISION",
    icon: ClipboardList,
    color: "text-purple-400 bg-purple-500/20 border-purple-500/40",
    description: "Multi-department operational directive populated: Traffic diversion on NH corridor, NDRF standby, relief center mobilization.",
    telemetry: "Directives: 5 Actions • Evacuation Route: Bypass Open • Shelter: Ready"
  },
  {
    step: 8,
    title: "8. Multilingual Emergency Broadcast Dispatched",
    phase: "ALERTING",
    icon: Radio,
    color: "text-red-500 bg-red-500/20 border-red-500/40",
    description: "Multilingual emergency broadcast (SMS, Voice IVR, In-App) pushed to 14,250 registered mobile numbers across affected district cells.",
    telemetry: "Dispatch: 14,250 SMS Sent • Voice IVR: 86.4% Answered • Lang: EN/HI/AS"
  },
  {
    step: 9,
    title: "9. Public Citizen View & Shelter Routing Activated",
    phase: "COMPLETION",
    icon: Users,
    color: "text-emerald-400 bg-emerald-500/20 border-emerald-500/40",
    description: "Public Citizen Portal displays high-contrast emergency warning with turn-by-turn guidance to the nearest designated relief shelter.",
    telemetry: "Public Status: WARNING ACTIVE • Designated Shelter: District Indoor Stadium"
  }
];

export const DisasterDrillModal: React.FC<DisasterDrillModalProps> = ({
  isOpen,
  onClose,
  onExecuteDrillStep,
  targetZone,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeedMs, setPlaybackSpeedMs] = useState(3000);

  useEffect(() => {
    let timer: any;
    if (isPlaying) {
      timer = setInterval(() => {
        setCurrentStepIndex((prev) => {
          if (prev >= DRILL_STEPS.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          const next = prev + 1;
          onExecuteDrillStep?.(next);
          return next;
        });
      }, playbackSpeedMs);
    }
    return () => clearInterval(timer);
  }, [isPlaying, playbackSpeedMs, onExecuteDrillStep]);

  if (!isOpen) return null;

  const currentStep = DRILL_STEPS[currentStepIndex];
  const StepIcon = currentStep.icon;

  const handleNext = () => {
    if (currentStepIndex < DRILL_STEPS.length - 1) {
      const next = currentStepIndex + 1;
      setCurrentStepIndex(next);
      onExecuteDrillStep?.(next);
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      const prev = currentStepIndex - 1;
      setCurrentStepIndex(prev);
      onExecuteDrillStep?.(prev);
    }
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentStepIndex(0);
    onExecuteDrillStep?.(0);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn text-slate-100">
      <div 
        className="bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl max-w-3xl w-full flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/90 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-amber-500 to-rose-600 text-white shadow-lg shadow-amber-500/20">
              <Zap className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-white tracking-wide">
                  Disaster Operations Simulation Drill
                </h2>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                  TRAINING MODE
                </span>
              </div>
              <p className="text-xs text-slate-400">
                End-to-End Operational Workflow Simulation: Rain Surge → Risk Escalation → Alert Dispatch → Shelter
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

        {/* Drill Player Body */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[75vh]">
          {/* Step Progress Tracker */}
          <div className="grid grid-cols-9 gap-1.5">
            {DRILL_STEPS.map((s, idx) => {
              const isPast = idx < currentStepIndex;
              const isCurrent = idx === currentStepIndex;
              return (
                <div
                  key={s.step}
                  onClick={() => {
                    setCurrentStepIndex(idx);
                    onExecuteDrillStep?.(idx);
                  }}
                  className={`h-2 rounded-full cursor-pointer transition-all ${
                    isCurrent
                      ? 'bg-amber-400 ring-2 ring-amber-400/50 scale-y-125'
                      : isPast
                      ? 'bg-brand-500'
                      : 'bg-slate-800 hover:bg-slate-700'
                  }`}
                  title={s.title}
                />
              );
            })}
          </div>

          {/* Active Step Card */}
          <div className="bg-slate-950/90 border border-slate-800 p-6 rounded-2xl space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-2xl border ${currentStep.color}`}>
                  <StepIcon className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-widest block">
                    PHASE {currentStepIndex + 1} OF 9 • {currentStep.phase}
                  </span>
                  <h3 className="text-lg font-black text-white font-sans">{currentStep.title}</h3>
                </div>
              </div>
              <span className="text-xs font-mono font-extrabold px-2.5 py-1 rounded bg-slate-900 text-slate-300 border border-slate-800">
                Step {currentStepIndex + 1}/9
              </span>
            </div>

            <p className="text-sm text-slate-300 leading-relaxed font-medium">
              {currentStep.description}
            </p>

            {/* Live Drill Telemetry Feed Box */}
            <div className="bg-slate-900/90 p-3.5 rounded-xl border border-slate-800/80 font-mono text-xs space-y-1">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-sans font-bold">
                Simulation Telemetry Signal:
              </span>
              <span className="text-amber-300 font-bold block">
                {currentStep.telemetry}
              </span>
            </div>
          </div>

          {/* Target Zone Reference */}
          {targetZone && (
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-400">Active Sector Under Drill:</span>
              <span className="font-extrabold text-white">{targetZone.name} ({targetZone.district}, {targetZone.state})</span>
            </div>
          )}
        </div>

        {/* Player Controls Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPlaying(prev => !prev)}
              className={`py-2 px-4 rounded-xl font-bold text-xs flex items-center gap-2 shadow-lg transition ${
                isPlaying
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                  : 'bg-brand-600 hover:bg-brand-500 text-white'
              }`}
            >
              {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
              <span>{isPlaying ? 'PAUSE DRILL' : 'PLAY DRILL'}</span>
            </button>

            <button
              onClick={handleReset}
              className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs flex items-center gap-1.5 transition border border-slate-700"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>

            {/* Speed Selector */}
            <select
              value={playbackSpeedMs}
              onChange={(e) => setPlaybackSpeedMs(Number(e.target.value))}
              className="bg-slate-800 text-slate-300 text-xs px-2.5 py-2 rounded-xl border border-slate-700 focus:outline-none cursor-pointer font-mono"
            >
              <option value={4000}>1x Speed (4s)</option>
              <option value={2500}>1.5x Speed (2.5s)</option>
              <option value={1500}>2.5x Speed (1.5s)</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrev}
              disabled={currentStepIndex === 0}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed border border-slate-700"
              title="Previous Step"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <button
              onClick={handleNext}
              disabled={currentStepIndex === DRILL_STEPS.length - 1}
              className="py-2 px-4 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span>Next Phase</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
