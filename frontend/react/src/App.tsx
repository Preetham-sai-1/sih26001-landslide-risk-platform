import React, { useState, useEffect } from 'react';
import { 
  ViewMode, 
  RiskZone, 
  ZoneDetailsResponse, 
  FieldReport, 
  AlertLog, 
  ForecastHorizon, 
  LiveWeatherStation, 
  LiveWeatherStatus,
  AutoAlertRecord 
} from './types';
import { 
  fetchRiskZones, 
  fetchZoneDetails, 
  submitFieldReport, 
  dispatchBroadcastAlert, 
  fetchLiveWeather, 
  fetchLiveStatus, 
  DEMO_FIELD_REPORTS, 
  DEMO_ALERTS 
} from './services/api';
import { calculateAdminPriority } from './utils/simulation';
import { getEscalatingCellsOnly } from './utils/forecastEngine';
import { HistoricalLandslidePoint } from './utils/landslideHistory';
import { 
  PROTOTYPE_THRESHOLDS, 
  evaluateZoneAutoAlert, 
  runDemoAutoAlertSequence, 
  createManualOverrideAlert 
} from './utils/autoAlertEngine';

// Clean Modular Components
import { Navbar, UserRole } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { StatsOverview } from './components/StatsOverview';
import { RiskMap } from './components/RiskMap';
import { ZoneInspector } from './components/ZoneInspector';
import { ErrorBoundary } from './components/ErrorBoundary';
import { RightOperationsPanel } from './components/RightOperationsPanel';
import { EarlyWarningCenter } from './components/EarlyWarningCenter';
import { LiveWeatherCenter } from './components/LiveWeatherCenter';
import { InfrastructureCenter } from './components/InfrastructureCenter';
import { RequestsCenter } from './components/RequestsCenter';
import { AlertCenterView } from './components/AlertCenterView';
import { AnalyticsCenter } from './components/AnalyticsCenter';
import { CitizenView } from './components/CitizenView';

// Modals
import { FieldReportModal } from './components/FieldReportModal';
import { DataSourcesModal } from './components/DataSourcesModal';
import { CommandPalette } from './components/CommandPalette';
import { HistoricalLandslideModal } from './components/HistoricalLandslideModal';
import { DisasterDrillModal } from './components/DisasterDrillModal';
import { NotificationCenterModal, AppNotification } from './components/NotificationCenterModal';
import { SystemHealthModal } from './components/SystemHealthModal';
import { AuditTimelineModal, AuditEvent, INITIAL_AUDIT_EVENTS } from './components/AuditTimelineModal';

import { X, CheckCircle2, AlertTriangle, Radio, ShieldAlert } from 'lucide-react';

const INITIAL_NOTIFICATIONS: AppNotification[] = [
  {
    id: "notif-auto-init-1",
    title: "🚨 AUTOMATIC ALERT TRIGGERED",
    message: "Haflong Sector (AS_04) crossed prototype threshold (88.4% >= 85.0%). Delivery state: DEMO / QUEUED (External delivery unavailable).",
    timestamp: new Date(Date.now() - 5 * 60000).toISOString(),
    type: "ESCALATION",
    read: false,
    actionView: "alerts"
  },
  {
    id: "notif-2",
    title: "IMD Orange Nowcast Advisory",
    message: "East Khasi Hills (Cherrapunji & Mawsynram) AWS recorded 18.4mm/h precipitation surge.",
    timestamp: new Date(Date.now() - 15 * 60000).toISOString(),
    type: "WEATHER_WARNING",
    read: false,
    actionView: "early_warning"
  },
  {
    id: "notif-3",
    title: "Field Verification Request Dispatched",
    message: "Task FR-2026-001 pushed to Mobile Patrol #4 for geo-tagged tension crack check.",
    timestamp: new Date(Date.now() - 25 * 60000).toISOString(),
    type: "FIELD_REPORT",
    read: true,
    actionView: "requests"
  }
];

export const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewMode>('overview');
  const [currentRole, setCurrentRole] = useState<UserRole>('ADMIN');
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [zones, setZones] = useState<RiskZone[]>([]);
  const [selectedZone, setSelectedZone] = useState<RiskZone | null>(null);
  const [selectedDetails, setSelectedDetails] = useState<ZoneDetailsResponse | null>(null);
  const [selectedState, setSelectedState] = useState<string>('All');
  const [selectedRisk, setSelectedRisk] = useState<string>('All');
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [simulatedMm, setSimulatedMm] = useState<number>(0);
  const [forecastHorizon, setForecastHorizon] = useState<ForecastHorizon>('+12H');
  
  // Automatic Threshold Engine State
  const [isAutoAlertingEnabled, setIsAutoAlertingEnabled] = useState(true);
  const [autoAlertRecords, setAutoAlertRecords] = useState<AutoAlertRecord[]>([]);

  // Modals state
  const [isFieldModalOpen, setIsFieldModalOpen] = useState(false);
  const [isDataSourcesModalOpen, setIsDataSourcesModalOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isDrillModalOpen, setIsDrillModalOpen] = useState(false);
  const [isHealthModalOpen, setIsHealthModalOpen] = useState(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const [selectedLandslidePoint, setSelectedLandslidePoint] = useState<HistoricalLandslidePoint | null>(null);

  // Data streams
  const [liveStatus, setLiveStatus] = useState<LiveWeatherStatus | null>(null);
  const [liveWeatherStations, setLiveWeatherStations] = useState<LiveWeatherStation[]>([]);
  const [reports, setReports] = useState<FieldReport[]>(DEMO_FIELD_REPORTS);
  const [alerts, setAlerts] = useState<AlertLog[]>(DEMO_ALERTS);
  const [notifications, setNotifications] = useState<AppNotification[]>(INITIAL_NOTIFICATIONS);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>(INITIAL_AUDIT_EVENTS);
  const [showNotificationToast, setShowNotificationToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Global Ctrl + K Keyboard Shortcut listener for Command Palette
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Backend Health Ping & Offline Check
  useEffect(() => {
    let isMounted = true;
    const checkHealth = async () => {
      try {
        const res = await fetch('/api/v1/health');
        if (res.ok) {
          if (isMounted) {
            setIsOnline(true);
            if (pendingSyncCount > 0) {
              setPendingSyncCount(0);
              showToast("Connection Restored: Offline pending queue synchronized with backend.");
            }
          }
        } else {
          if (isMounted) {
            setIsOnline(false);
            setIsDemoMode(true);
          }
        }
      } catch (err) {
        if (isMounted) {
          setIsOnline(false);
          setIsDemoMode(true);
        }
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 8000);
    return () => { isMounted = false; clearInterval(interval); };
  }, [pendingSyncCount]);

  // Polling Live IMD Weather & Telemetry (Every 30s)
  useEffect(() => {
    let isMounted = true;
    const fetchWeather = async () => {
      try {
        const weatherData = await fetchLiveWeather();
        if (isMounted && weatherData) {
          setLiveStatus(weatherData);
          if (weatherData.stations) {
            setLiveWeatherStations(weatherData.stations);
          }
        }
      } catch (err) {
        console.warn("Live weather poll failed", err);
      }
    };

    fetchWeather();
    const interval = setInterval(fetchWeather, 30000);
    return () => { isMounted = false; clearInterval(interval); };
  }, []);

  // Load Risk Zones on mount & when state/risk filters change
  useEffect(() => {
    let isMounted = true;
    fetchRiskZones(selectedState, selectedRisk).then(({ zones: fetchedZones, isDemo }) => {
      if (isMounted) {
        setZones(fetchedZones);
        setIsDemoMode(isDemo);
      }
    });
    return () => { isMounted = false; };
  }, [selectedState, selectedRisk]);

  const handleSelectZone = async (zone: RiskZone) => {
    setSelectedZone(zone);
    setSimulatedMm(0);
    const { details } = await fetchZoneDetails(zone.grid_id);
    setSelectedDetails(details);
  };

  const toggleDarkMode = () => {
    setIsDarkMode(prev => {
      const next = !prev;
      if (next) document.documentElement.classList.add('dark');
      else document.documentElement.classList.remove('dark');
      return next;
    });
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setShowNotificationToast(true);
    setTimeout(() => setShowNotificationToast(false), 5500);
  };

  const handleRoleChange = (role: UserRole) => {
    setCurrentRole(role);
    if (role === 'ADMIN') {
      setCurrentView('overview');
      showToast("Switched to SDMA Admin Command Center View");
    } else if (role === 'AUTHORITY') {
      setCurrentView('requests');
      showToast("Switched to State Disaster Management Authority (SDMA) Verification & Confirmation Mode");
    } else if (role === 'FIELD_OFFICER') {
      setCurrentView('field_report');
      showToast("Switched to Field Patrol & Ground Verification Mode");
    } else if (role === 'VIEWER') {
      setCurrentView('overview');
      showToast("Switched to Read-Only Viewer Mode (Operational Actions Disabled)");
    } else if (role === 'CITIZEN') {
      setCurrentView('citizen_view');
      showToast("Switched to Public Citizen Emergency Advisory View");
    }
  };

  const handleNavChange = (view: ViewMode) => {
    if (view === 'data_sources') {
      setIsDataSourcesModalOpen(true);
      return;
    }
    if (view === 'system_health') {
      setIsHealthModalOpen(true);
      return;
    }
    setCurrentView(view);
  };

  // --- AUTOMATIC THRESHOLD ALERTING HANDLERS ---
  const handleToggleAutoAlerting = () => {
    setIsAutoAlertingEnabled(prev => {
      const next = !prev;
      showToast(`Automatic Alerting Mode ${next ? 'ENABLED (ON)' : 'DISABLED (OFF)'}`);
      return next;
    });
  };

  const handleAcknowledgeAutoAlert = (alertIdOrGridId: string) => {
    setAutoAlertRecords(prev => prev.map(a => 
      (a.id === alertIdOrGridId || a.grid_id === alertIdOrGridId) ? { ...a, state: 'ACKNOWLEDGED' } : a
    ));
    showToast(`Alert acknowledged by Administrator. State set to ACKNOWLEDGED.`);

    const newAudit: AuditEvent = {
      id: `EVT-${Math.floor(Math.random() * 9000) + 1000}`,
      timestamp: new Date().toISOString(),
      timeStr: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' IST',
      title: `Alert Acknowledged: ${alertIdOrGridId}`,
      category: 'ALERT',
      description: `Threshold auto-alert acknowledged by Admin Command Center. State: ACKNOWLEDGED.`,
      actor: 'SDMA Admin',
      icon: CheckCircle2,
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
    };
    setAuditEvents(prev => [newAudit, ...prev]);
  };

  const handleResolveAutoAlert = (alertId: string) => {
    setAutoAlertRecords(prev => prev.map(a => a.id === alertId ? { ...a, state: 'RESOLVED' } : a));
    showToast(`Alert ${alertId} marked as RESOLVED.`);

    const newAudit: AuditEvent = {
      id: `EVT-${Math.floor(Math.random() * 9000) + 1000}`,
      timestamp: new Date().toISOString(),
      timeStr: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' IST',
      title: `Alert Resolved: ${alertId}`,
      category: 'ALERT',
      description: `Hazard risk stabilized. Marked RESOLVED by Administrator.`,
      actor: 'SDMA Admin',
      icon: CheckCircle2,
      badgeColor: 'bg-slate-800 text-slate-300 border-slate-700'
    };
    setAuditEvents(prev => [newAudit, ...prev]);
  };

  const handleManualOverride = (targetZone: RiskZone) => {
    const overrideRecord = createManualOverrideAlert(targetZone);
    setAutoAlertRecords(prev => [overrideRecord, ...prev]);
    showToast(`Emergency Admin Manual Dispatch Override executed for ${targetZone.name}.`);

    const newNotif: AppNotification = {
      id: `notif-manual-${Date.now()}`,
      title: `EMERGENCY MANUAL OVERRIDE DISPATCH`,
      message: `Manual dispatch override triggered by Admin for ${targetZone.name} (${targetZone.district}). Delivery state: DEMO / QUEUED.`,
      timestamp: new Date().toISOString(),
      type: "ALERT_DISPATCH",
      read: false,
      actionView: "alerts"
    };
    setNotifications(prev => [newNotif, ...prev]);

    const newAudit: AuditEvent = {
      id: `EVT-${Math.floor(Math.random() * 9000) + 1000}`,
      timestamp: new Date().toISOString(),
      timeStr: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' IST',
      title: `Manual Alert Override: ${targetZone.name}`,
      category: 'ALERT',
      description: `Emergency admin override executed. Bypassed auto thresholds. Delivery state: DEMO / QUEUED.`,
      actor: 'SDMA Administrator',
      icon: Radio,
      badgeColor: 'bg-red-500/20 text-red-300 border-red-500/40'
    };
    setAuditEvents(prev => [newAudit, ...prev]);
  };

  const handleRunDemoSequence = (targetZone: RiskZone) => {
    showToast(`Executing Demo Auto-Alert Sequence (72% → 79% → 88% → 92%) for ${targetZone.name}...`);
    
    const results = runDemoAutoAlertSequence(targetZone);
    const triggeredResult = results.find(r => r.triggered && r.alert);

    if (triggeredResult && triggeredResult.alert) {
      const alertRec = triggeredResult.alert;
      setAutoAlertRecords(prev => [alertRec, ...prev]);

      const newNotif: AppNotification = {
        id: `notif-auto-${Date.now()}`,
        title: `🚨 AUTOMATIC ALERT TRIGGERED`,
        message: `${targetZone.name} crossed prototype threshold (${alertRec.current_probability}% >= 85%). Delivery state: DEMO / QUEUED (External delivery unavailable).`,
        timestamp: new Date().toISOString(),
        type: "ESCALATION",
        read: false,
        actionView: "alerts"
      };
      setNotifications(prev => [newNotif, ...prev]);

      const newAudit: AuditEvent = {
        id: `EVT-${Math.floor(Math.random() * 9000) + 1000}`,
        timestamp: new Date().toISOString(),
        timeStr: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' IST',
        title: `🚨 AUTOMATIC ALERT TRIGGERED: ${targetZone.name}`,
        category: 'ALERT',
        description: `Deterministic demo sequence crossed 85% prototype threshold (${alertRec.previous_probability}% → ${alertRec.current_probability}%). Trigger: ${alertRec.trigger_reason}`,
        actor: 'Threshold Engine',
        icon: ShieldAlert,
        badgeColor: 'bg-red-500/20 text-red-300 border-red-500/40'
      };
      setAuditEvents(prev => [newAudit, ...prev]);

      setTimeout(() => {
        showToast(`🚨 AUTOMATIC ALERT TRIGGERED: ${targetZone.name} (${alertRec.current_probability}%). Added to Notification Center & Alert Queue.`);
      }, 600);
    }
  };

  const handleCreateResponsePlan = (zone: RiskZone, rec: any) => {
    const planId = `FR-2026-PLAN-${Math.floor(Math.random() * 900) + 100}`;
    const newPlanReport: FieldReport = {
      id: planId,
      timestamp: new Date().toISOString(),
      latitude: zone.lat,
      longitude: zone.lon,
      location_name: `${zone.name} Sector (${zone.district})`,
      state: zone.state,
      district: zone.district,
      incident_type: `Disaster Response Plan (${rec.priority})`,
      severity: zone.risk === 'VERY HIGH' ? 'Critical' : zone.risk === 'HIGH' ? 'High' : 'Moderate',
      status: 'Pending Verification',
      notes: `[ACTION PLAN DIRECTIVES]\n• Verification: ${rec.verificationAction}\n• Escalation: ${rec.escalationAction}\n• Highway/Traffic: ${rec.infrastructureMonitoring}\n• Public Alert: ${rec.publicAlertAction}\n• Community Shelter: ${rec.evacuationPrep}`,
      reporter_name: 'SDMA / SIH AI Command Center',
      photo_url: 'https://images.unsplash.com/photo-1541888946425-d0fbb186a5b7?auto=format&fit=crop&w=600&q=80'
    };

    setReports(prev => [newPlanReport, ...prev]);
    showToast(`Response Plan ${planId} generated for ${zone.name}. Transitioned to Verification Workflow.`);
    
    const newAudit: AuditEvent = {
      id: `EVT-${Math.floor(Math.random() * 9000) + 1000}`,
      timestamp: new Date().toISOString(),
      timeStr: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' IST',
      title: `Response Plan Created: ${zone.name}`,
      category: 'WORKFLOW',
      description: `Action plan synthesized for ${zone.district}, ${zone.state} with road monitoring directives.`,
      actor: 'Admin Command Center',
      icon: ShieldAlert,
      badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
    };
    setAuditEvents(prev => [newAudit, ...prev]);

    if (!isOnline) setPendingSyncCount(c => c + 1);
  };

  const handleUpdateReportStatus = (id: string, newStatus: string) => {
    setReports(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r));
    showToast(`Request ${id} updated to status: ${newStatus}`);
    if (!isOnline) setPendingSyncCount(c => c + 1);
  };

  const handleExportCSV = () => {
    const headers = [
      "Grid ID", "Zone Name", "State", "District", "Risk Level", "Risk Score (%)",
      "Elevation (m)", "Slope (deg)", "Aspect (deg)", "Curvature",
      "Rainfall 24h (mm)", "Rainfall 3d (mm)", "Rainfall 7d (mm)", "Rainfall 30d (mm)",
      "Population", "Villages"
    ];

    const rows = zones.map(z => [
      `"${z.grid_id}"`, `"${z.name}"`, `"${z.state}"`, `"${z.district}"`, `"${z.risk}"`,
      z.score.toFixed(1), z.elev.toFixed(0), z.slope.toFixed(1), z.aspect.toFixed(1), z.curv.toFixed(3),
      z.r24.toFixed(1), z.r3d.toFixed(1), z.r7d.toFixed(1), z.r30d.toFixed(1),
      z.population, z.villages
    ]);

    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `ner_landslide_risk_analytics_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("CSV Export downloaded successfully.");
  };

  // KPI Calculations
  const criticalCount = zones.filter(z => calculateAdminPriority(z.score, z.risk) === 'P1 CRITICAL').length;
  const highRiskCount = zones.filter(z => calculateAdminPriority(z.score, z.risk) === 'P2 HIGH').length;
  const pendingRequestsCount = reports.filter(r => r.status !== 'Completed' && r.status !== 'Rejected').length;
  const escalatingCellsCount = getEscalatingCellsOnly(zones, forecastHorizon).length;
  const alertsCount = alerts.length + autoAlertRecords.length;
  const unreadNotifCount = notifications.filter(n => !n.read).length;

  const handleKpiClick = (kpi: 'critical' | 'high' | 'escalating' | 'requests' | 'alerts') => {
    if (kpi === 'critical') {
      setSelectedRisk('VERY HIGH');
      setCurrentView('overview');
    } else if (kpi === 'high') {
      setSelectedRisk('HIGH');
      setCurrentView('overview');
    } else if (kpi === 'escalating') {
      setCurrentView('early_warning');
    } else if (kpi === 'requests') {
      setCurrentView('requests');
    } else if (kpi === 'alerts') {
      setCurrentView('alerts');
    }
  };

  return (
    <div className={`w-screen h-screen flex flex-col ${isDarkMode ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-900'} overflow-hidden`}>
      {/* Compact Clean Header */}
      <Navbar
        currentView={currentView}
        onViewChange={handleNavChange}
        isDarkMode={isDarkMode}
        onToggleDarkMode={toggleDarkMode}
        isOnline={isOnline}
        pendingSyncCount={pendingSyncCount}
        unreadNotifications={unreadNotifCount}
        onOpenNotifications={() => setIsNotificationModalOpen(true)}
        liveStatus={liveStatus}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        currentRole={currentRole}
        onRoleChange={handleRoleChange}
        isAutoAlertingEnabled={isAutoAlertingEnabled}
        onToggleAutoAlerting={handleToggleAutoAlerting}
      />

      {/* Main Container */}
      <div className="flex-1 relative flex overflow-hidden">
        {/* Categorized Left Sidebar */}
        <Sidebar
          currentView={currentView}
          onViewChange={handleNavChange}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(prev => !prev)}
          criticalCount={criticalCount}
          pendingRequestsCount={pendingRequestsCount}
          activeAlertsCount={alertsCount}
          escalatingCount={escalatingCellsCount}
        />

        {/* Central Operations View */}
        <main className="flex-1 relative flex flex-col overflow-hidden">
          {/* VIEW 1 & 2: OVERVIEW / RISK MAP */}
          {(currentView === 'overview' || currentView === 'admin_map' || currentView === 'risk_map') && (
            <div className="w-full h-full relative flex flex-col">
              {/* Top 5-KPI Compact Clickable Bar */}
              <div className="w-full border-b border-slate-800/80 bg-slate-950/80 z-10 shrink-0">
                <StatsOverview
                  criticalCount={criticalCount}
                  highRiskCount={highRiskCount}
                  escalatingCount={escalatingCellsCount}
                  pendingRequestsCount={pendingRequestsCount}
                  alertsCount={alertsCount}
                  onSelectKpi={handleKpiClick}
                />
              </div>

              {/* Map & Contextual Panel Row */}
              <div className="flex-1 relative flex overflow-hidden">
                <div className="flex-1 h-full relative">
                  <RiskMap
                    zones={zones}
                    selectedZone={selectedZone}
                    onSelectZone={handleSelectZone}
                    isDarkMode={isDarkMode}
                    simulatedMm={simulatedMm}
                    forecastHorizon={forecastHorizon}
                    onForecastHorizonChange={setForecastHorizon}
                    liveWeatherStations={liveWeatherStations}
                    onSelectLandslidePoint={(pt) => setSelectedLandslidePoint(pt)}
                  />
                </div>

                <RightOperationsPanel
                  zones={zones}
                  onSelectZone={handleSelectZone}
                  reports={reports}
                  alerts={alerts}
                  onViewAllRequests={() => setCurrentView('requests')}
                  onViewAllAlerts={() => setCurrentView('alerts')}
                />

                {selectedZone && (
                  <ErrorBoundary>
                    <ZoneInspector
                      zone={selectedZone}
                      details={selectedDetails}
                      onClose={() => setSelectedZone(null)}
                      onDispatchAlert={(z) => {
                        setSelectedZone(z);
                        setCurrentView('alerts');
                      }}
                      onOpenFieldReport={(z) => {
                        setSelectedZone(z);
                        setIsFieldModalOpen(true);
                      }}
                      onCreateResponsePlan={handleCreateResponsePlan}
                      isDemoMode={isDemoMode}
                      simulatedMm={simulatedMm}
                      onSimulateRainfall={setSimulatedMm}
                      forecastHorizon={forecastHorizon}
                      liveWeatherStations={liveWeatherStations}
                      liveStatus={liveStatus}
                      isAutoAlertingEnabled={isAutoAlertingEnabled}
                      onToggleAutoAlerting={handleToggleAutoAlerting}
                      onAcknowledgeAlert={handleAcknowledgeAutoAlert}
                      onManualOverride={handleManualOverride}
                      onRunDemoSequence={handleRunDemoSequence}
                      activeAutoAlerts={autoAlertRecords}
                    />
                  </ErrorBoundary>
                )}
              </div>
            </div>
          )}

          {/* VIEW 3: EARLY WARNING FORECAST CENTER */}
          {currentView === 'early_warning' && (
            <EarlyWarningCenter
              zones={zones}
              selectedZone={selectedZone}
              onSelectZone={(z) => {
                handleSelectZone(z);
                setCurrentView('overview');
              }}
              isDarkMode={isDarkMode}
              onOpenAlertModal={(z) => {
                if (z) setSelectedZone(z);
                setCurrentView('alerts');
              }}
              onOpenFieldReport={(z) => {
                setSelectedZone(z);
                setIsFieldModalOpen(true);
              }}
              onCreateResponsePlan={handleCreateResponsePlan}
              isDemoMode={isDemoMode}
              liveWeatherStations={liveWeatherStations}
            />
          )}

          {/* VIEW 4: LIVE WEATHER & AWS TELEMETRY CENTER */}
          {currentView === 'live_weather' && (
            <LiveWeatherCenter
              liveStatus={liveStatus}
              stations={liveWeatherStations}
              onOpenDataSources={() => setIsDataSourcesModalOpen(true)}
            />
          )}

          {/* VIEW 5: INFRASTRUCTURE & LIFELINE CORRIDORS */}
          {currentView === 'infrastructure' && (
            <InfrastructureCenter
              zones={zones}
              onSelectZone={(z) => {
                handleSelectZone(z);
                setCurrentView('overview');
              }}
            />
          )}

          {/* VIEW 6 & 7: REQUESTS & GROUND TRUTH FIELD VERIFICATION */}
          {(currentView === 'requests' || currentView === 'field_report') && (
            <RequestsCenter
              reports={reports}
              onUpdateReportStatus={handleUpdateReportStatus}
              onOpenFieldModal={() => setIsFieldModalOpen(true)}
            />
          )}

          {/* VIEW 8: EMERGENCY BROADCAST ALERT CENTER */}
          {currentView === 'alerts' && (
            <AlertCenterView
              zones={zones}
              alerts={alerts}
              onAlertDispatched={(newAlert) => {
                setAlerts(prev => [newAlert, ...prev]);
                showToast(`Broadcast Alert dispatched to ${newAlert.target_district}, ${newAlert.target_state}`);
                
                const newAudit: AuditEvent = {
                  id: `EVT-${Math.floor(Math.random() * 9000) + 1000}`,
                  timestamp: new Date().toISOString(),
                  timeStr: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' IST',
                  title: `Mass Alert Broadcast Dispatched: ${newAlert.target_district}`,
                  category: 'ALERT',
                  description: `Delivered to ${newAlert.sms_sent.toLocaleString()} recipients with ${newAlert.hazard_level} warning severity.`,
                  actor: 'Emergency Broadcast Dispatcher',
                  icon: Radio,
                  badgeColor: 'bg-red-500/20 text-red-300 border-red-500/40'
                };
                setAuditEvents(prev => [newAudit, ...prev]);

                if (!isOnline) setPendingSyncCount(c => c + 1);
              }}
              isAutoAlertingEnabled={isAutoAlertingEnabled}
              onToggleAutoAlerting={handleToggleAutoAlerting}
              autoAlertRecords={autoAlertRecords}
              onAcknowledgeAutoAlert={handleAcknowledgeAutoAlert}
              onResolveAutoAlert={handleResolveAutoAlert}
              onRunDemoSequence={handleRunDemoSequence}
              onManualOverride={handleManualOverride}
            />
          )}

          {/* VIEW 9: REGIONAL ANALYTICS & EXPOSURE SUMMARY */}
          {currentView === 'analytics' && (
            <AnalyticsCenter
              zones={zones}
              reports={reports}
              alerts={alerts}
              stations={liveWeatherStations}
              onSelectZone={(z) => {
                handleSelectZone(z);
                setCurrentView('overview');
              }}
              onExportCSV={handleExportCSV}
            />
          )}

          {/* VIEW 10: PUBLIC CITIZEN VIEW */}
          {currentView === 'citizen_view' && (
            <CitizenView
              zones={zones}
              isDarkMode={isDarkMode}
              onSelectZone={handleSelectZone}
            />
          )}

          {/* VIEW 11: DATA SOURCES & PROVENANCE */}
          {currentView === 'data_sources' && (
            <DataSourcesModal
              isOpen={true}
              onClose={() => setCurrentView('overview')}
              liveStatus={liveStatus}
            />
          )}

          {/* VIEW 12: SYSTEM HEALTH & TELEMETRY */}
          {currentView === 'system_health' && (
            <SystemHealthModal
              isOpen={true}
              onClose={() => setCurrentView('overview')}
              isOnline={isOnline}
              pendingSyncCount={pendingSyncCount}
            />
          )}
        </main>
      </div>

      {/* Global Notification Toast */}
      {showNotificationToast && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 border border-brand-500/50 text-white p-3.5 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="text-xs font-semibold">{toastMessage}</span>
          <button onClick={() => setShowNotificationToast(false)} className="text-slate-400 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Global Command Palette (Ctrl + K) */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        zones={zones}
        reports={reports}
        alerts={alerts}
        onSelectZone={(z) => {
          handleSelectZone(z);
          setCurrentView('overview');
        }}
        onSelectReport={() => setCurrentView('requests')}
        onViewChange={(v) => setCurrentView(v)}
        onStartDrill={() => setIsDrillModalOpen(true)}
        onOpenDataSources={() => setIsDataSourcesModalOpen(true)}
      />

      {/* Historical Landslide Inspector Modal (GSI Ground Truth) */}
      <HistoricalLandslideModal
        event={selectedLandslidePoint}
        onClose={() => setSelectedLandslidePoint(null)}
        nearbyZone={selectedZone}
        onSelectNearestZone={handleSelectZone}
      />

      {/* Disaster Operations Drill / Training Player */}
      <DisasterDrillModal
        isOpen={isDrillModalOpen}
        onClose={() => setIsDrillModalOpen(false)}
        targetZone={selectedZone}
        onExecuteDrillStep={(stepIndex) => {
          if (stepIndex === 1) setSimulatedMm(50);
          else if (stepIndex === 2) setSimulatedMm(100);
          else if (stepIndex === 4 && selectedZone) {
            handleCreateResponsePlan(selectedZone, {
              priority: 'P1 CRITICAL',
              verificationAction: 'Inspect tension cracks on slope',
              escalationAction: 'Elevate response tier',
              infrastructureMonitoring: 'NH Corridor restriction',
              publicAlertAction: 'Disaster broadcast',
              evacuationPrep: 'Shelter readiness'
            });
          }
        }}
      />

      {/* Operational Notification Center Drawer */}
      <NotificationCenterModal
        isOpen={isNotificationModalOpen}
        onClose={() => setIsNotificationModalOpen(false)}
        notifications={notifications}
        onMarkAllAsRead={() => setNotifications(prev => prev.map(n => ({ ...n, read: true })))}
        onClearAll={() => setNotifications([])}
        onNotificationClick={(notif) => {
          if (notif.actionView) setCurrentView(notif.actionView);
          showToast(`Opening: ${notif.title}`);
        }}
      />

      {/* Microservice & System Health Modal */}
      <SystemHealthModal
        isOpen={isHealthModalOpen}
        onClose={() => setIsHealthModalOpen(false)}
        isOnline={isOnline}
        pendingSyncCount={pendingSyncCount}
      />

      {/* Operational Event & Decision Audit Stream Modal */}
      <AuditTimelineModal
        isOpen={isAuditModalOpen}
        onClose={() => setIsAuditModalOpen(false)}
        events={auditEvents}
      />

      {/* Ground Field Report Submission Form Modal */}
      {isFieldModalOpen && (
        <FieldReportModal
          zone={selectedZone}
          onClose={() => setIsFieldModalOpen(false)}
          onReportSubmitted={(newReport) => {
            setReports(prev => [newReport, ...prev]);
            showToast(`Field inspection report ${newReport.id} logged for ${newReport.location_name}`);
            if (!isOnline) setPendingSyncCount(c => c + 1);
          }}
        />
      )}

      {/* Data Architecture & Provenance Center Modal */}
      <DataSourcesModal
        isOpen={isDataSourcesModalOpen}
        onClose={() => setIsDataSourcesModalOpen(false)}
        liveStatus={liveStatus}
      />
    </div>
  );
};
