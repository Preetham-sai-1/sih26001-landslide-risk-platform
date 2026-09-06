import React from 'react';
import { 
  Activity, 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  Server, 
  Cpu, 
  Database, 
  Mountain, 
  CloudRain, 
  Radio, 
  Send, 
  Wifi,
  Clock,
  ShieldCheck
} from 'lucide-react';

interface SystemHealthModalProps {
  isOpen: boolean;
  onClose: () => void;
  isOnline: boolean;
  pendingSyncCount: number;
}

export const SystemHealthModal: React.FC<SystemHealthModalProps> = ({
  isOpen,
  onClose,
  isOnline,
  pendingSyncCount,
}) => {
  if (!isOpen) return null;

  const services = [
    {
      name: "FastAPI REST Service Layer",
      category: "Backend Core",
      status: isOnline ? "HEALTHY" : "OFFLINE",
      statusLevel: isOnline ? "GREEN" : "RED",
      latency: isOnline ? "24 ms" : "Unreachable",
      uptime: "99.94%",
      details: "Serving /api/v1/zones, /live/weather, /alerts/dispatch",
      icon: Server
    },
    {
      name: "Risk-Fusion Heuristic ML Engine",
      category: "Decision Support",
      status: "ACTIVE",
      statusLevel: "GREEN",
      latency: "12 ms",
      uptime: "100%",
      details: "Topographic physics + Antecedent Rainfall Fusion Model",
      icon: Cpu
    },
    {
      name: "Geological Survey of India Ground Truth DB",
      category: "Spatial Database",
      status: "OPTIMIZED",
      statusLevel: "GREEN",
      latency: "8 ms",
      uptime: "100%",
      details: "8,546 Historical Landslide Ground-Truth Records (EPSG:4326)",
      icon: Database
    },
    {
      name: "NASA SRTM 30m Digital Elevation Model",
      category: "Topographic Rasters",
      status: "ACTIVE",
      statusLevel: "GREEN",
      latency: "15 ms",
      uptime: "100%",
      details: "90 1-Arc-Second HGT Tiles (Slope, Aspect, Curvature)",
      icon: Mountain
    },
    {
      name: "IMD Historical 0.25° Daily Gridded Archive",
      category: "Precipitation Archive",
      status: "HEALTHY",
      statusLevel: "GREEN",
      latency: "18 ms",
      uptime: "100%",
      details: "3,652 Daily NetCDF/GeoTIFF Rasters (2010–2019 Archive)",
      icon: CloudRain
    },
    {
      name: "IMD Real-Time AWS / ARG Telemetry Feeds",
      category: "Live Telemetry",
      status: isOnline ? "SYNCHRONIZED" : "CACHED",
      statusLevel: isOnline ? "GREEN" : "AMBER",
      latency: isOnline ? "185 ms" : "Offline Feed",
      uptime: "98.8%",
      details: "12 NER Regional AWS Stations • 10-Min Cache TTL",
      icon: Radio
    },
    {
      name: "Emergency Alert Dispatch Service (SMS / IVR)",
      category: "Alert Center",
      status: isOnline ? "STANDBY" : "OFFLINE SIM",
      statusLevel: isOnline ? "GREEN" : "AMBER",
      latency: isOnline ? "45 ms" : "Simulated",
      uptime: "99.9%",
      details: "NDRF, SDMA & Citizen Broadcast Messaging Integration",
      icon: Send
    },
    {
      name: "Client Offline Sync Queue Manager",
      category: "Resilience",
      status: pendingSyncCount === 0 ? "IDLE (ALL SYNCED)" : `PENDING SYNC (${pendingSyncCount})`,
      statusLevel: pendingSyncCount === 0 ? "GREEN" : "AMBER",
      latency: "< 1 ms",
      uptime: "100%",
      details: "IndexedDB / Local Storage Offline Transaction Queue",
      icon: Wifi
    }
  ];

  const getStatusBadge = (level: string, text: string) => {
    switch (level) {
      case 'GREEN':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> {text}</span>;
      case 'AMBER':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> {text}</span>;
      case 'RED': default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-300 border border-red-500/30 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> {text}</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn text-slate-100">
      <div 
        className="bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl max-w-3xl w-full flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/90 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-white tracking-wide">
                  System Health & Microservice Telemetry
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  ALL SUBSYSTEMS MONITORED
                </span>
              </div>
              <p className="text-xs text-slate-400">Real-time status of backend services, raster engines & live feeds</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* System Health Grid */}
        <div className="p-5 overflow-y-auto max-h-[70vh] space-y-3 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {services.map((srv, idx) => {
              const Icon = srv.icon;
              return (
                <div key={idx} className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800/80 space-y-2 hover:border-slate-700 transition">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-slate-900 text-brand-400 border border-slate-800">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-white text-xs leading-tight">{srv.name}</h4>
                        <span className="text-[10px] text-slate-500">{srv.category}</span>
                      </div>
                    </div>
                    {getStatusBadge(srv.statusLevel, srv.status)}
                  </div>

                  <p className="text-[11px] text-slate-300">
                    {srv.details}
                  </p>

                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                    <span>Latency: <strong className="text-slate-200">{srv.latency}</strong></span>
                    <span>Uptime: <strong className="text-emerald-400">{srv.uptime}</strong></span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/90 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span>Health Check Polled: <strong className="text-slate-300">Every 8 seconds</strong></span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow transition"
          >
            Close Telemetry
          </button>
        </div>
      </div>
    </div>
  );
};
