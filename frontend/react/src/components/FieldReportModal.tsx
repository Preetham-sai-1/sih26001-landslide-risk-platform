import React, { useState } from 'react';
import { RiskZone, FieldReport } from '../types';
import { submitFieldReport } from '../services/api';
import { X, Upload, MapPin, Camera, CheckCircle2, AlertCircle } from 'lucide-react';

interface FieldReportModalProps {
  zone: RiskZone | null;
  onClose: () => void;
  onReportSubmitted: (report: FieldReport) => void;
}

export const FieldReportModal: React.FC<FieldReportModalProps> = ({
  zone,
  onClose,
  onReportSubmitted
}) => {
  const [locationName, setLocationName] = useState(zone ? `${zone.name}, ${zone.district}` : 'Haflong Sector NH-27');
  const [state, setState] = useState(zone ? zone.state : 'Assam');
  const [district, setDistrict] = useState(zone ? zone.district : 'Dima Hasao');
  const [lat, setLat] = useState<number>(zone ? zone.lat : 25.188);
  const [lon, setLon] = useState<number>(zone ? zone.lon : 93.019);
  const [incidentType, setIncidentType] = useState('Debris Flow / Slope Crack');
  const [severity, setSeverity] = useState('Critical');
  const [notes, setNotes] = useState('Active slope deformation observed following 7-day heavy rainfall.');
  const [reporterName, setReporterName] = useState('Field Officer - R. Sharma');
  const [photoPreview, setPhotoPreview] = useState('https://images.unsplash.com/photo-1541888946425-d0fbb186a5b7?auto=format&fit=crop&w=600&q=80');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const reportData: Partial<FieldReport> = {
      location_name: locationName,
      state,
      district,
      latitude: Number(lat),
      longitude: Number(lon),
      incident_type: incidentType,
      severity,
      notes,
      reporter_name: reporterName,
      photo_url: photoPreview
    };

    const res = await submitFieldReport(reportData);
    setIsSubmitting(false);

    if (res.success) {
      setIsSuccess(true);
      onReportSubmitted(res.report);
      setTimeout(() => {
        onClose();
      }, 1200);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-brand-400" />
            <h2 className="font-extrabold text-white text-base font-sans">Ground Truth Field Verification</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {isSuccess ? (
          <div className="p-8 text-center space-y-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto animate-bounce" />
            <h3 className="text-lg font-bold text-white">Verification Report Submitted</h3>
            <p className="text-xs text-slate-400">Report added to Admin Verification Queue for immediate risk assessment.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
            {/* Location & GPS */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="col-span-2">
                <label className="text-slate-300 font-semibold block mb-1">Location Name</label>
                <input
                  type="text"
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white font-medium focus:border-brand-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">State</label>
                <input
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white font-medium focus:border-brand-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">District</label>
                <input
                  type="text"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white font-medium focus:border-brand-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Latitude (°N)</label>
                <input
                  type="number"
                  step="0.0001"
                  value={lat}
                  onChange={(e) => setLat(parseFloat(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white font-mono text-xs focus:border-brand-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Longitude (°E)</label>
                <input
                  type="number"
                  step="0.0001"
                  value={lon}
                  onChange={(e) => setLon(parseFloat(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white font-mono text-xs focus:border-brand-500 focus:outline-none"
                  required
                />
              </div>
            </div>

            {/* Classification & Severity */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Incident Type</label>
                <select
                  value={incidentType}
                  onChange={(e) => setIncidentType(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white font-medium focus:border-brand-500 focus:outline-none"
                >
                  <option value="Debris Flow / Slope Crack">Debris Flow / Slope Crack</option>
                  <option value="Rockfall Hazard">Rockfall Hazard</option>
                  <option value="Mudslide Movement">Mudslide Movement</option>
                  <option value="Road Subsidence">Road Subsidence</option>
                </select>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Severity Level</label>
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white font-medium focus:border-brand-500 focus:outline-none"
                >
                  <option value="Critical">Critical (Immediate Hazard)</option>
                  <option value="High">High</option>
                  <option value="Moderate">Moderate</option>
                  <option value="Low">Low</option>
                </select>
              </div>
            </div>

            {/* Photo Preview Container */}
            <div className="space-y-1 text-xs">
              <label className="text-slate-300 font-semibold block">Field Incident Photo</label>
              <div className="relative h-32 rounded-xl overflow-hidden border border-slate-700 bg-slate-950 group">
                <img src={photoPreview} alt="Field Preview" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-slate-950/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-white text-xs font-bold bg-slate-900/80 px-3 py-1.5 rounded-lg border border-slate-700">Photo Attached</span>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="text-xs">
              <label className="text-slate-300 font-semibold block mb-1">Field Observations / Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white font-medium focus:border-brand-500 focus:outline-none"
              />
            </div>

            {/* Reporter Name */}
            <div className="text-xs">
              <label className="text-slate-300 font-semibold block mb-1">Field User / Reporter Name</label>
              <input
                type="text"
                value={reporterName}
                onChange={(e) => setReporterName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white font-medium focus:border-brand-500 focus:outline-none"
                required
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white rounded-xl font-bold text-xs shadow-lg shadow-brand-500/25 transition-all flex items-center justify-center gap-2"
            >
              {isSubmitting ? 'Submitting Report...' : 'Submit Verification Request'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
