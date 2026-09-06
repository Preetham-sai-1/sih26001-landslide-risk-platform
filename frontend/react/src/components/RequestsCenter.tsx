import React, { useState } from 'react';
import { FieldReport, RiskZone } from '../types';
import { 
  FileCheck2, 
  Search, 
  Filter, 
  CheckCircle2, 
  AlertTriangle, 
  TrendingUp, 
  FileText, 
  X, 
  MapPin, 
  Clock, 
  Image as ImageIcon,
  ExternalLink,
  ChevronRight
} from 'lucide-react';

interface RequestsCenterProps {
  reports: FieldReport[];
  onUpdateReportStatus: (id: string, newStatus: string) => void;
  onOpenFieldModal?: () => void;
}

export const RequestsCenter: React.FC<RequestsCenterProps> = ({
  reports,
  onUpdateReportStatus,
  onOpenFieldModal,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Pending' | 'Verified' | 'Escalated'>('ALL');
  const [selectedReport, setSelectedReport] = useState<FieldReport | null>(null);

  const filteredReports = reports.filter(r => {
    const matchesSearch = !searchQuery || 
      r.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.location_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.district.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.state.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || r.status.toLowerCase().includes(statusFilter.toLowerCase());
    return matchesSearch && matchesStatus;
  });

  const getSeverityBadge = (sev: string) => {
    switch (sev.toLowerCase()) {
      case 'critical': case 'severe': return 'bg-red-500/20 text-red-300 border-red-500/40';
      case 'high': return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'moderate': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40';
      default: return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  const getStatusBadge = (st: string) => {
    switch (st.toLowerCase()) {
      case 'verified': case 'completed': return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      case 'escalated': return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
      case 'assessed': return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40';
      default: return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-slate-950 text-slate-100 overflow-hidden select-none">
      {/* Top Header */}
      <div className="p-4 bg-slate-900/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-brand-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
            <FileCheck2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold text-white font-sans">
                FIELD VERIFICATION & INCIDENT REQUESTS
              </h2>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                SDMA WORKFLOW TRIAGE
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Ground truth inspection reports, slope crack observations & response plan escalation
            </p>
          </div>
        </div>

        {/* Action Button */}
        {onOpenFieldModal && (
          <button
            onClick={onOpenFieldModal}
            className="py-2 px-3.5 bg-gradient-to-r from-brand-600 to-indigo-600 text-white font-bold text-xs rounded-xl shadow-lg flex items-center gap-2 hover:scale-[1.02] transition"
          >
            <FileText className="w-4 h-4 text-brand-300" />
            <span>New Ground Inspection Form</span>
          </button>
        )}
      </div>

      {/* Incident Lifecycle Timeline Banner */}
      <div className="bg-slate-900/90 px-4 py-2 border-b border-slate-800 flex flex-wrap items-center justify-between text-xs shrink-0 font-mono gap-2">
        <div className="flex items-center gap-1.5 overflow-x-auto py-1">
          <span className="text-[10px] text-slate-400 font-bold uppercase mr-1">Lifecycle:</span>
          {['NORMAL', 'WATCH', 'HIGH', 'CRITICAL', 'VERIFICATION', 'CONFIRMED', 'RESOLVED'].map((stg, i) => (
            <React.Fragment key={stg}>
              <span className={`px-2 py-0.5 rounded text-[9px] font-black border ${
                stg === 'CONFIRMED' ? 'bg-red-500/20 text-red-300 border-red-500/40' :
                stg === 'VERIFICATION' ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' :
                stg === 'RESOLVED' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' :
                'bg-slate-950 text-slate-400 border-slate-800'
              }`}>
                {stg}
              </span>
              {i < 6 && <span className="text-slate-600">→</span>}
            </React.Fragment>
          ))}
        </div>

        <div className="text-[10px] text-amber-400 font-bold bg-amber-950/40 px-2.5 py-1 rounded-lg border border-amber-500/30 flex items-center gap-1">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>RULE: ML Risk Prediction ≠ Incident Confirmation (Physical Ground Inspection Required)</span>
        </div>
      </div>

      {/* Filter & Search Strip */}
      <div className="p-3 bg-slate-900/40 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0 text-xs">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search request ID, location, district..."
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-1.5 font-semibold">
          <span className="text-slate-500 text-[11px]">Filter Status:</span>
          {(['ALL', 'Pending', 'Verified', 'Escalated'] as const).map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`py-1 px-2.5 rounded-lg text-xs transition ${
                statusFilter === st ? 'bg-brand-600 text-white shadow' : 'bg-slate-900 text-slate-400 hover:text-white'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Clean Table List */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="bg-slate-900/60 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/90 text-[10px] uppercase text-slate-400 font-mono">
                  <th className="p-3">ID</th>
                  <th className="p-3">Location & District</th>
                  <th className="p-3">Severity</th>
                  <th className="p-3">Logged Time</th>
                  <th className="p-3">Photo Evidence</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Triage Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredReports.map((report) => (
                  <tr 
                    key={report.id}
                    onClick={() => setSelectedReport(report)}
                    className="hover:bg-slate-800/40 transition cursor-pointer"
                  >
                    <td className="p-3 font-mono font-bold text-amber-400">
                      {report.id}
                    </td>
                    <td className="p-3">
                      <div className="font-bold text-white text-xs">{report.location_name}</div>
                      <div className="text-[10px] text-slate-400">{report.district}, {report.state} • {report.incident_type}</div>
                    </td>
                    <td className="p-3">
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded border font-mono ${getSeverityBadge(report.severity)}`}>
                        {report.severity}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-[11px] text-slate-400">
                      {new Date(report.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} IST
                    </td>
                    <td className="p-3">
                      {report.photo_url ? (
                        <div className="flex items-center gap-1.5 text-emerald-400 font-semibold text-[11px]">
                          <ImageIcon className="w-3.5 h-3.5" />
                          <span>Photo Attached</span>
                        </div>
                      ) : (
                        <span className="text-slate-500 italic text-[11px]">No Media</span>
                      )}
                    </td>
                    <td className="p-3">
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded border font-mono ${getStatusBadge(report.status)}`}>
                        {report.status}
                      </span>
                    </td>
                    <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onUpdateReportStatus(report.id, 'Verified')}
                          className="py-1 px-2.5 text-[10px] font-bold bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/40 rounded-lg transition flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-3 h-3" /> VERIFY
                        </button>
                        <button
                          onClick={() => onUpdateReportStatus(report.id, 'Assessed')}
                          className="py-1 px-2.5 text-[10px] font-bold bg-cyan-600/20 hover:bg-cyan-600/40 text-cyan-300 border border-cyan-500/40 rounded-lg transition flex items-center gap-1"
                        >
                          <FileCheck2 className="w-3 h-3" /> ASSESS
                        </button>
                        <button
                          onClick={() => onUpdateReportStatus(report.id, 'Escalated')}
                          className="py-1 px-2.5 text-[10px] font-bold bg-rose-600/20 hover:bg-rose-600/40 text-rose-300 border border-rose-500/40 rounded-lg transition flex items-center gap-1"
                        >
                          <TrendingUp className="w-3 h-3" /> ESCALATE
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Drawer: Selected Report Deep Details */}
        {selectedReport && (
          <div className="w-96 border-l border-slate-800 bg-slate-900/95 p-5 space-y-4 flex flex-col shrink-0 animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="font-mono text-xs font-bold text-amber-400">{selectedReport.id}</span>
                <h3 className="font-bold text-white text-sm">{selectedReport.location_name}</h3>
              </div>
              <button
                onClick={() => setSelectedReport(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 flex-1 overflow-y-auto text-xs">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                <span className="text-[10px] uppercase text-slate-400 font-bold">Location Coordinates</span>
                <p className="font-mono text-slate-200">{selectedReport.latitude.toFixed(4)}°N, {selectedReport.longitude.toFixed(4)}°E</p>
                <p className="text-slate-400">{selectedReport.district}, {selectedReport.state}</p>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                <span className="text-[10px] uppercase text-slate-400 font-bold">Reporter & Unit</span>
                <p className="font-bold text-white">{selectedReport.reporter_name}</p>
                <p className="text-slate-400 font-mono text-[10px]">Logged: {new Date(selectedReport.timestamp).toLocaleString()}</p>
              </div>

              {selectedReport.notes && (
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-[10px] uppercase text-slate-400 font-bold">Field Notes & Directives</span>
                  <p className="text-slate-200 leading-relaxed font-mono whitespace-pre-line text-[11px]">{selectedReport.notes}</p>
                </div>
              )}

              {selectedReport.photo_url && (
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                  <span className="text-[10px] uppercase text-slate-400 font-bold">Field Verification Evidence</span>
                  <img
                    src={selectedReport.photo_url}
                    alt="Field Inspection Evidence"
                    className="w-full h-36 object-cover rounded-lg border border-slate-700"
                  />
                </div>
              )}
            </div>

            {/* Quick Actions Footer */}
            <div className="pt-3 border-t border-slate-800 grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  onUpdateReportStatus(selectedReport.id, 'Verified');
                  setSelectedReport(prev => prev ? { ...prev, status: 'Verified' } : null);
                }}
                className="py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow transition"
              >
                Mark Verified
              </button>
              <button
                onClick={() => {
                  onUpdateReportStatus(selectedReport.id, 'Escalated');
                  setSelectedReport(prev => prev ? { ...prev, status: 'Escalated' } : null);
                }}
                className="py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow transition"
              >
                Escalate Tier
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
