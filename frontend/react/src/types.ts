export type RiskLevel = 'SAFE' | 'LOW' | 'MODERATE' | 'HIGH' | 'VERY HIGH';

export type ResponsePriority = 'P1 CRITICAL' | 'P2 HIGH' | 'P3 MODERATE' | 'P4 MONITOR';

export interface RiskZone {
  grid_id: string;
  name: string;
  state: string;
  district: string;
  villages: number;
  population: number;
  lat: number;
  lon: number;
  target: number;
  pos_count: number;
  elev: number;
  slope: number;
  aspect: number;
  curv: number;
  r24: number;
  r3d: number;
  r7d: number;
  r30d: number;
  risk: RiskLevel;
  score: number;
  priority?: ResponsePriority;
}

export interface TerrainMetrics {
  elevation_m: number;
  slope_deg: number;
  aspect_deg: number;
  curvature: number;
  source: string;
}

export interface RainfallMetrics {
  rainfall_24h_mm: number;
  rainfall_3d_mm: number;
  rainfall_7d_mm: number;
  rainfall_30d_mm: number;
  source: string;
}

export interface ExplainabilityFactor {
  factor: string;
  weight: number;
  detail: string;
}

export interface AffectedInfrastructure {
  type: string;
  name: string;
  status: string;
  dist_m: number;
  impact_severity?: string;
  connectivity_status?: string;
  lat?: number;
  lon?: number;
}

export interface RiskEvolutionStage {
  stage: string;
  period: string;
  score: number;
  risk: RiskLevel;
  rainfallMm: number;
  rainfallPeriod: string;
  description: string;
  isProjected?: boolean;
}

export interface ResponseRecommendation {
  priority: ResponsePriority;
  level: RiskLevel;
  verificationAction: string;
  escalationAction: string;
  infrastructureMonitoring: string;
  publicAlertAction: string;
  evacuationPrep: string;
}

export interface ZoneDetailsResponse {
  zone_info: RiskZone;
  terrain_metrics: TerrainMetrics;
  rainfall_metrics: RainfallMetrics;
  explainability: {
    risk_score_pct: number;
    top_contributing_factors: ExplainabilityFactor[];
  };
  affected_infrastructure: AffectedInfrastructure[];
  action_plan: string[];
}

export interface FieldReport {
  id: string;
  timestamp: string;
  latitude: number;
  longitude: number;
  location_name: string;
  state: string;
  district: string;
  incident_type: string;
  severity: string;
  status: string;
  notes: string;
  reporter_name: string;
  photo_url: string;
}

export interface AlertLog {
  id: string;
  timestamp: string;
  target_state: string;
  target_district: string;
  hazard_level: string;
  sms_sent: number;
  sms_delivered: number;
  voice_dispatched: number;
  voice_answered_pct: number;
  message: string;
  status: string;
}

export type AutoAlertState = 
  | 'NORMAL' 
  | 'WATCH' 
  | 'ESCALATING' 
  | 'ALERT_PENDING' 
  | 'AUTO_ALERTED' 
  | 'ACKNOWLEDGED' 
  | 'RESOLVED';

export interface AutoAlertRecord {
  id: string;
  grid_id: string;
  zone_name: string;
  target_state: string;
  district: string;
  previous_probability: number;
  current_probability: number;
  risk_level: RiskLevel;
  trigger_factors: string[];
  timestamp: string;
  data_freshness: string;
  affected_infrastructure: string[];
  affected_population: number;
  recommended_action: string;
  delivery_channels: ('SMS' | 'VOICE' | 'IN_APP')[];
  delivery_status: string;
  alert_state: AutoAlertState;
  is_auto: boolean;
  is_demo: boolean;
  trigger_reason: string;
  disclaimer: string;
}

export type ForecastHorizon = 'CURRENT' | '+6H' | '+12H' | '+24H';

export interface RainfallTrendPoint {
  period: string;
  rainfallMm: number;
  cumulativeMm: number;
  isForecast?: boolean;
}

export interface EscalatingCell {
  zone: RiskZone;
  horizon: ForecastHorizon;
  currentRisk: RiskLevel;
  currentScore: number;
  forecastRisk: RiskLevel;
  forecastScore: number;
  scoreDelta: number;
  addedRainMm: number;
  forecast24hRain: number;
  isEscalating: boolean;
  transition: string; // e.g. "HIGH → VERY HIGH"
  priority: ResponsePriority;
  triggerFactors: string[];
  recommendedAction: string;
  highwayCorridor: string;
  escalationRank: number;
  rainfallTrend: RainfallTrendPoint[];
}

export interface LiveWeatherStation {
  station_id: string;
  station_name: string;
  district: string;
  state: string;
  lat: number;
  lon: number;
  elevation_m: number;
  temperature_c: number;
  humidity_pct: number;
  wind_speed_kmh: number;
  wind_direction: string;
  rainfall_1h_mm: number;
  rainfall_24h_mm: number;
  warning_level: 'GREEN' | 'YELLOW' | 'ORANGE' | 'RED';
  warning_message: string;
  source_granularity: string;
  source_name: string;
  observation_time: string;
  fetch_time: string;
}

export interface LiveWeatherStatus {
  status: 'LIVE' | 'STALE' | 'OFFLINE';
  source: string;
  source_granularity: string;
  observation_time: string;
  fetch_time: string;
  data_age?: string;
  station_count: number;
  stations?: LiveWeatherStation[];
  data_sources?: Record<string, string>;
  disclaimer?: string;
}

export interface IMDWarning {
  district: string;
  state: string;
  warning_level: 'GREEN' | 'YELLOW' | 'ORANGE' | 'RED';
  warning_message: string;
  rainfall_24h_mm: number;
  station_name: string;
}

export type ViewMode = 
  | 'overview'
  | 'admin_map' 
  | 'early_warning'
  | 'risk_map'
  | 'live_weather'
  | 'infrastructure'
  | 'requests' 
  | 'field_report' 
  | 'alerts' 
  | 'analytics'
  | 'citizen_view'
  | 'data_sources'
  | 'system_health';

export interface MLScenarioProjection {
  horizon: string;
  surge_mm: number;
  projected_probability: number;
  projected_risk_level: RiskLevel;
}

export interface MLPredictionResponse {
  grid_id: string;
  calibrated_probability: number;
  probability_pct: number;
  risk_level: RiskLevel;
  model_version: string;
  semantics_badge: string;
  features_used: Record<string, number>;
  scenario_projections: MLScenarioProjection[];
  model_explainability: {
    base_value: number;
    top_contributing_factors: ExplainabilityFactor[];
  };
  telemetry_status: 'LIVE' | 'STALE' | 'OFFLINE';
  timestamp: string;
}

export interface MLModelInfo {
  is_loaded: boolean;
  model_version: string;
  feature_cols: string[];
  evaluation_metrics: {
    'ROC-AUC': number;
    'PR-AUC': number;
    'Brier-Score': number;
    Recall: number;
    Precision: number;
    'F1-Score': number;
    'False-Negative-Rate': number;
  };
  disclaimer: string;
}




