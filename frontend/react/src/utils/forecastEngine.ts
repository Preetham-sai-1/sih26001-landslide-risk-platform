import { RiskZone, RiskLevel, ResponsePriority, ForecastHorizon, EscalatingCell, RainfallTrendPoint } from '../types';
import { calculateAdminPriority } from './simulation';

// Highway corridor helper
export const getZoneHighwayCorridor = (state: string, district: string): string => {
  if (district.includes('Dima Hasao') || state === 'Assam') return 'NH-27 Highway Corridor';
  if (district.includes('Tawang') || (state === 'Arunachal Pradesh' && district.includes('Tawang'))) return 'NH-13 Trans-Arunachal Pass';
  if (state === 'Mizoram') return 'NH-54 Aizawl Corridor';
  if (state === 'Sikkim') return 'NH-10 Sevoke-Gangtok Highway';
  if (state === 'Nagaland') return 'NH-29 Dimapur-Kohima Road';
  if (state === 'Manipur') return 'NH-2 Imphal Highway';
  if (state === 'Meghalaya') return 'NH-6 Guwahati-Shillong Corridor';
  if (district.includes('Lower Dibang')) return 'NH-115 Dibang River Bridge';
  return 'NH-8 Regional Corridor';
};

// Deterministic forecasted rainfall delta based on zone profile and horizon
export const getForecastRainfallDelta = (zone: RiskZone, horizon: ForecastHorizon): number => {
  if (horizon === 'CURRENT') return 0;
  
  // Base storm surge factor derived from existing 24h & slope saturation
  const baseFactor = zone.slope >= 30 ? 1.25 : zone.slope >= 20 ? 1.0 : 0.75;
  
  switch (horizon) {
    case '+6H':
      // 6-hour localized convective buildup (15mm to 35mm)
      return Math.round((18.0 + (zone.r24 * 0.12)) * baseFactor * 10) / 10;
    case '+12H':
      // 12-hour monsoonal rain band progression (35mm to 70mm)
      return Math.round((42.0 + (zone.r24 * 0.22)) * baseFactor * 10) / 10;
    case '+24H':
      // 24-hour severe active trough scenario (60mm to 125mm)
      return Math.round((75.0 + (zone.r24 * 0.35)) * baseFactor * 10) / 10;
    default:
      return 0;
  }
};

// Evaluate risk tier from score
export const scoreToRiskLevel = (score: number): RiskLevel => {
  if (score >= 85) return 'VERY HIGH';
  if (score >= 70) return 'HIGH';
  if (score >= 50) return 'MODERATE';
  if (score >= 30) return 'LOW';
  return 'SAFE';
};

// Generate rainfall trend timeline for sparkline and charts
export const generateRainfallTrend = (zone: RiskZone, horizon: ForecastHorizon = 'CURRENT'): RainfallTrendPoint[] => {
  const fc6 = getForecastRainfallDelta(zone, '+6H');
  const fc12 = getForecastRainfallDelta(zone, '+12H');
  const fc24 = getForecastRainfallDelta(zone, '+24H');

  return [
    { period: '30-Day Baseline', rainfallMm: zone.r30d, cumulativeMm: zone.r30d, isForecast: false },
    { period: '7-Day Antecedent', rainfallMm: zone.r7d, cumulativeMm: zone.r7d, isForecast: false },
    { period: '3-Day Saturation', rainfallMm: zone.r3d, cumulativeMm: zone.r3d, isForecast: false },
    { period: '24-Hour (Now)', rainfallMm: zone.r24, cumulativeMm: zone.r24, isForecast: false },
    { period: '+6H Forecast', rainfallMm: fc6, cumulativeMm: zone.r24 + fc6, isForecast: true },
    { period: '+12H Forecast', rainfallMm: fc12, cumulativeMm: zone.r24 + fc12, isForecast: true },
    { period: '+24H Forecast', rainfallMm: fc24, cumulativeMm: zone.r24 + fc24, isForecast: true },
  ];
};

// Evaluate a single cell's forecast state under given horizon
export const evaluateCellForecast = (zone: RiskZone, horizon: ForecastHorizon): EscalatingCell => {
  const addedRainMm = getForecastRainfallDelta(zone, horizon);
  const forecast24hRain = zone.r24 + addedRainMm;
  
  // Forecast score progression
  const addedScore = addedRainMm * 0.28;
  const forecastScore = Math.min(100.0, Math.max(0.0, Math.round((zone.score + addedScore) * 10) / 10));
  const scoreDelta = Math.round((forecastScore - zone.score) * 10) / 10;
  const forecastRisk = scoreToRiskLevel(forecastScore);
  
  // Escalation detection: Risk tier increase or score jump > 8 pts
  const riskTiers: Record<RiskLevel, number> = { 'SAFE': 0, 'LOW': 1, 'MODERATE': 2, 'HIGH': 3, 'VERY HIGH': 4 };
  const isEscalating = riskTiers[forecastRisk] > riskTiers[zone.risk] || (horizon !== 'CURRENT' && scoreDelta >= 8.0);
  
  const transition = `${zone.risk} → ${forecastRisk}`;
  const priority = calculateAdminPriority(forecastScore, forecastRisk);
  const highwayCorridor = getZoneHighwayCorridor(zone.state, zone.district);

  // Trigger factors
  const triggerFactors: string[] = [];
  if (addedRainMm > 0) triggerFactors.push(`+${addedRainMm.toFixed(1)}mm Projected Storm Inflow (${horizon})`);
  if (zone.slope >= 28) triggerFactors.push(`${zone.slope.toFixed(1)}° Steep Cut-Slope Gradient`);
  if (zone.r7d >= 150) triggerFactors.push(`${zone.r7d.toFixed(1)}mm 7-Day Antecedent Saturation`);
  if (zone.pos_count > 0) triggerFactors.push(`${zone.pos_count} Historical Cluster Records (GSI)`);
  triggerFactors.push(`${highwayCorridor} Exposure`);

  // Recommended Action based on forecasted severity
  let recommendedAction = 'Routine automated telemetry monitoring.';
  if (forecastRisk === 'VERY HIGH') {
    recommendedAction = `CRITICAL ACTION: Deploy SDRF patrol with crack gauges to ${zone.name}. Restrict nighttime traffic on ${highwayCorridor}. Pre-alert ${zone.district} evacuation shelters (${zone.villages} villages, ${zone.population.toLocaleString()} residents).`;
  } else if (forecastRisk === 'HIGH') {
    recommendedAction = `HIGH ALERT: Dispatch drone inspection team to monitor upper ridge tension cracks. Erect warning signage on ${highwayCorridor}. Place QRT on 30-minute standby.`;
  } else if (forecastRisk === 'MODERATE') {
    recommendedAction = `ADVISORY MONITORING: Inspect highway drainage culvert siltation. Issue localized weather advisory for ${zone.district}.`;
  }

  // Multi-criteria Escalation Ranking formula
  const r24Norm = Math.min(100, (forecast24hRain / 150) * 100);
  const slopeNorm = Math.min(100, (zone.slope / 45) * 100);
  const histBoost = (zone.pos_count || 0) * 3.0;
  const escalationBonus = isEscalating ? 15.0 : 0.0;
  
  const escalationRank = Math.round(
    ((forecastScore * 0.40) + (scoreDelta * 0.25) + (r24Norm * 0.15) + (slopeNorm * 0.10) + histBoost + escalationBonus) * 10
  ) / 10;

  const rainfallTrend = generateRainfallTrend(zone, horizon);

  return {
    zone,
    horizon,
    currentRisk: zone.risk,
    currentScore: zone.score,
    forecastRisk,
    forecastScore,
    scoreDelta,
    addedRainMm,
    forecast24hRain,
    isEscalating,
    transition,
    priority,
    triggerFactors,
    recommendedAction,
    highwayCorridor,
    escalationRank,
    rainfallTrend,
  };
};

// Evaluate all zones for a given forecast horizon and return sorted escalation list
export const evaluateAllZonesForecast = (zones: RiskZone[], horizon: ForecastHorizon): EscalatingCell[] => {
  return zones
    .map(z => evaluateCellForecast(z, horizon))
    .sort((a, b) => b.escalationRank - a.escalationRank);
};

// Filter only escalating cells
export const getEscalatingCellsOnly = (zones: RiskZone[], horizon: ForecastHorizon): EscalatingCell[] => {
  return evaluateAllZonesForecast(zones, horizon).filter(c => c.isEscalating);
};
