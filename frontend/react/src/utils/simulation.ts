import { RiskZone, RiskLevel, ResponsePriority, RiskEvolutionStage, ResponseRecommendation } from '../types';

export interface RankedFactor {
  key: string;
  name: string;
  weight: number;
  valStr: string;
  category: 'terrain' | 'rainfall';
  isTrigger: boolean;
}

export interface SimulationResult {
  simulatedMm: number;
  new24h: number;
  new3d: number;
  new7d: number;
  new30d: number;
  simulatedScore: number;
  simulatedRisk: RiskLevel;
  scoreDelta: number;
  isSimulated: boolean;
  explanation: string;
  naturalExplanation: string;
  responsePriority: string;
  adminPriority: ResponsePriority;
  rankedFactors: RankedFactor[];
  isDemoWeights: boolean;
}

export function calculateAdminPriority(score: number, risk: RiskLevel): ResponsePriority {
  if (score >= 85 || risk === 'VERY HIGH') return 'P1 CRITICAL';
  if (score >= 70 || risk === 'HIGH') return 'P2 HIGH';
  if (score >= 50 || risk === 'MODERATE') return 'P3 MODERATE';
  return 'P4 MONITOR';
}

export function calculateSimulatedRisk(zone: RiskZone, addedMm: number): SimulationResult {
  const isSimulated = addedMm > 0;
  const new24h = zone.r24 + addedMm;
  const new3d = zone.r3d + addedMm;
  const new7d = zone.r7d + addedMm;
  const new30d = zone.r30d + addedMm;
  
  // Dynamic Risk Fusion calculation
  const addedScore = addedMm * 0.28;
  const simulatedScore = Math.min(100.0, Math.max(0.0, zone.score + addedScore));
  const scoreDelta = simulatedScore - zone.score;
  
  let simulatedRisk: RiskLevel = 'SAFE';
  if (simulatedScore >= 85) simulatedRisk = 'VERY HIGH';
  else if (simulatedScore >= 70) simulatedRisk = 'HIGH';
  else if (simulatedScore >= 50) simulatedRisk = 'MODERATE';
  else if (simulatedScore >= 30) simulatedRisk = 'LOW';
  else simulatedRisk = 'SAFE';

  const adminPriority = calculateAdminPriority(simulatedScore, simulatedRisk);

  let responsePriority = 'Standard Monitoring';
  let explanation = `Baseline 24h rainfall ${zone.r24.toFixed(1)}mm on ${zone.slope}° slope.`;

  if (isSimulated) {
    if (simulatedRisk === 'VERY HIGH') {
      responsePriority = 'Stage-3 Emergency Evacuation & Red Alert';
      explanation = `SIMULATION (+${addedMm}mm): 24h rain increases to ${new24h.toFixed(1)}mm (${new7d.toFixed(1)}mm 7-day total), pushing hazard score to ${simulatedScore.toFixed(1)}% (${simulatedRisk}). Extreme cut-slope saturation expected.`;
    } else if (simulatedRisk === 'HIGH') {
      responsePriority = 'Stage-2 High Alert & Traffic Restrictions';
      explanation = `SIMULATION (+${addedMm}mm): 24h rain increases to ${new24h.toFixed(1)}mm, causing score jump to ${simulatedScore.toFixed(1)}% (${simulatedRisk}). Road cut-slope monitoring advised.`;
    } else {
      responsePriority = 'Stage-1 Advisory Monitoring';
      explanation = `SIMULATION (+${addedMm}mm): Added rainfall raises score to ${simulatedScore.toFixed(1)}% (${simulatedRisk}). Elevated runoff expected.`;
    }
  }

  // --- Calculate Ranked 8-Feature Contributions ---
  const slope_raw = Math.min(100, (zone.slope / 45) * 100);
  const r24_raw = Math.min(100, (new24h / 150) * 100);
  const r3d_raw = Math.min(100, (new3d / 250) * 100);
  const r7d_raw = Math.min(100, (new7d / 400) * 100);
  const r30d_raw = Math.min(100, (new30d / 800) * 100);
  const elev_raw = Math.min(100, (zone.elev / 3000) * 100);
  const curv_raw = Math.min(100, (Math.abs(zone.curv) / 400) * 100);
  const aspect_raw = Math.min(100, (Math.abs(zone.aspect - 180) / 180) * 50 + 20);

  // Raw weighted contribution
  const w_slope = slope_raw * 0.35;
  const w_r24 = r24_raw * (0.18 + (addedMm > 0 ? (addedMm / 100) * 0.16 : 0));
  const w_r3d = r3d_raw * 0.12;
  const w_r7d = r7d_raw * 0.15;
  const w_r30d = r30d_raw * 0.08;
  const w_elev = elev_raw * 0.04;
  const w_curv = curv_raw * 0.05;
  const w_aspect = aspect_raw * 0.03;

  const totalW = w_slope + w_r24 + w_r3d + w_r7d + w_r30d + w_elev + w_curv + w_aspect || 1;

  const unnormFactors: RankedFactor[] = [
    { key: 'slope', name: 'Terrain Slope Angle', weight: (w_slope / totalW) * 100, valStr: `${zone.slope.toFixed(1)}°`, category: 'terrain', isTrigger: false },
    { key: 'rainfall_24h', name: '24h Rainfall Intensity', weight: (w_r24 / totalW) * 100, valStr: `${new24h.toFixed(1)} mm`, category: 'rainfall', isTrigger: true },
    { key: 'rainfall_3d', name: '3-Day Rainfall Saturation', weight: (w_r3d / totalW) * 100, valStr: `${new3d.toFixed(1)} mm`, category: 'rainfall', isTrigger: true },
    { key: 'rainfall_7d', name: '7-Day Antecedent Rainfall', weight: (w_r7d / totalW) * 100, valStr: `${new7d.toFixed(1)} mm`, category: 'rainfall', isTrigger: true },
    { key: 'rainfall_30d', name: '30-Day Seasonal Moisture', weight: (w_r30d / totalW) * 100, valStr: `${new30d.toFixed(1)} mm`, category: 'rainfall', isTrigger: true },
    { key: 'elevation', name: 'SRTM Elevation Height', weight: (w_elev / totalW) * 100, valStr: `${zone.elev.toFixed(1)} m`, category: 'terrain', isTrigger: false },
    { key: 'curvature', name: 'Surface Curvature', weight: (w_curv / totalW) * 100, valStr: `${zone.curv.toFixed(1)}`, category: 'terrain', isTrigger: false },
    { key: 'aspect', name: 'Slope Aspect Orientation', weight: (w_aspect / totalW) * 100, valStr: `${zone.aspect.toFixed(1)}°`, category: 'terrain', isTrigger: false },
  ];

  // Round weights cleanly
  const rankedFactors = unnormFactors.map(f => ({
    ...f,
    weight: Math.round(f.weight * 10) / 10
  })).sort((a, b) => b.weight - a.weight);

  // Dynamic Natural-Language Explanation
  const topFactor = rankedFactors[0];
  const r24Factor = rankedFactors.find(f => f.key === 'rainfall_24h')!;

  let naturalExplanation = '';
  if (!isSimulated) {
    naturalExplanation = `Primary driver is ${topFactor.name.toLowerCase()} (${topFactor.valStr}, ${topFactor.weight}% contribution), providing baseline slope vulnerability. Key trigger is antecedent rainfall accumulation (24h: ${zone.r24.toFixed(1)}mm, 7d: ${zone.r7d.toFixed(1)}mm), elevating pore water pressure along cut-slopes.`;
  } else {
    if (zone.risk !== simulatedRisk) {
      naturalExplanation = `[SIMULATION +${addedMm}mm IMPACT]: Rainfall contribution surges to ${r24Factor.weight}%. 24h rain (${new24h.toFixed(1)}mm) becomes the dominant trigger factor. Risk escalates ${zone.risk} → ${simulatedRisk}; Response priority escalates to "${responsePriority}".`;
    } else {
      naturalExplanation = `[SIMULATION +${addedMm}mm IMPACT]: Added rainfall increases 24h accumulation to ${new24h.toFixed(1)}mm. Rainfall contribution rises to ${r24Factor.weight}%, elevating overall hazard score by +${scoreDelta.toFixed(1)}% while maintaining ${simulatedRisk} risk tier.`;
    }
  }

  return {
    simulatedMm: addedMm,
    new24h,
    new3d,
    new7d,
    new30d,
    simulatedScore,
    simulatedRisk,
    scoreDelta,
    isSimulated,
    explanation,
    naturalExplanation,
    responsePriority,
    adminPriority,
    rankedFactors,
    isDemoWeights: true, // Clearly flag heuristic demo weights vs raw extracted feature values
  };
}

export function calculateRiskEvolutionStages(zone: RiskZone, addedMm: number = 0): RiskEvolutionStage[] {
  const isSim = addedMm > 0;
  const simScore = Math.min(100.0, zone.score + (addedMm * 0.28));
  
  let simRisk: RiskLevel = 'SAFE';
  if (simScore >= 85) simRisk = 'VERY HIGH';
  else if (simScore >= 70) simRisk = 'HIGH';
  else if (simScore >= 50) simRisk = 'MODERATE';
  else if (simScore >= 30) simRisk = 'LOW';

  const stages: RiskEvolutionStage[] = [
    {
      stage: '30-Day Antecedent',
      period: 'T - 30 Days',
      score: Math.round(zone.score * 0.42 * 10) / 10,
      risk: zone.score * 0.42 >= 50 ? 'MODERATE' : 'LOW',
      rainfallMm: zone.r30d,
      rainfallPeriod: '30-Day Total',
      description: 'Background seasonal saturation & weathering baseline.',
      isProjected: false,
    },
    {
      stage: '7-Day Buildup',
      period: 'T - 7 Days',
      score: Math.round(zone.score * 0.75 * 10) / 10,
      risk: zone.score * 0.75 >= 70 ? 'HIGH' : zone.score * 0.75 >= 50 ? 'MODERATE' : 'LOW',
      rainfallMm: zone.r7d,
      rainfallPeriod: '7-Day Total',
      description: 'Progressive antecedent pore pressure elevation in cut-slope.',
      isProjected: false,
    },
    {
      stage: '24-Hour Intensity',
      period: 'T - 24 Hours',
      score: Math.round(zone.score * 0.92 * 10) / 10,
      risk: zone.score * 0.92 >= 85 ? 'VERY HIGH' : zone.score * 0.92 >= 70 ? 'HIGH' : 'MODERATE',
      rainfallMm: zone.r24,
      rainfallPeriod: '24-Hour Intensity',
      description: 'Immediate monsoonal storm runoff and shear strain trigger.',
      isProjected: false,
    },
    {
      stage: 'Current Operational State',
      period: 'Real-Time (Now)',
      score: zone.score,
      risk: zone.risk,
      rainfallMm: zone.r24,
      rainfallPeriod: 'Real Extracted Data',
      description: `Active monitoring index on ${zone.slope}° slope. Risk tier: ${zone.risk}.`,
      isProjected: false,
    }
  ];

  if (isSim) {
    stages.push({
      stage: `Simulated (+${addedMm}mm Projection)`,
      period: 'Projection (Simulated)',
      score: Math.round(simScore * 10) / 10,
      risk: simRisk,
      rainfallMm: zone.r24 + addedMm,
      rainfallPeriod: `Simulated ${zone.r24 + addedMm} mm`,
      description: `Projected +${addedMm}mm stress scenario pushes risk to ${simRisk} (+${(simScore - zone.score).toFixed(1)}% jump).`,
      isProjected: true,
    });
  }

  return stages;
}

export function generateResponseRecommendations(
  zone: RiskZone,
  score: number,
  risk: RiskLevel
): ResponseRecommendation {
  const priority = calculateAdminPriority(score, risk);

  if (risk === 'VERY HIGH' || score >= 85) {
    return {
      priority: 'P1 CRITICAL',
      level: risk,
      verificationAction: `Deploy SDRF / District ground field patrol with crack gauges to ${zone.name} cut-slope section immediately.`,
      escalationAction: `Issue emergency briefing to State Disaster Management Authority (SDMA) & District Collector cell for ${zone.district}.`,
      infrastructureMonitoring: `Implement immediate night-time heavy freight traffic restriction along exposed corridors; station road clearance excavators at vulnerable passes.`,
      publicAlertAction: `Trigger Stage-3 automated mass SMS & Voice Broadcast alerts to all registered cell subscribers in ${zone.district} (${zone.villages} villages).`,
      evacuationPrep: `Pre-position primary relief shelters at block headquarters; alert local emergency medical units for rapid deployment.`,
    };
  } else if (risk === 'HIGH' || score >= 70) {
    return {
      priority: 'P2 HIGH',
      level: risk,
      verificationAction: `Schedule priority drone aerial survey and inspect tension crack progression along upper slope ridge.`,
      escalationAction: `Place Quick Response Teams (QRT) on high standby at ${zone.district} emergency operations center.`,
      infrastructureMonitoring: `Erect digital cautionary signage on highway approaches; monitor bridge culvert runoff capacity.`,
      publicAlertAction: `Dispatch Stage-2 advisory broadcast notification regarding slope washouts and slippery road conditions.`,
      evacuationPrep: `Identify designated safe community gathering zones; check emergency power & communication backup.`,
    };
  } else if (risk === 'MODERATE' || score >= 50) {
    return {
      priority: 'P3 MODERATE',
      level: risk,
      verificationAction: `Log routine ground patrol observations and monitor localized drainage culvert siltation.`,
      escalationAction: `Maintain regular 6-hourly inter-agency telemetry exchange between IMD and local administration.`,
      infrastructureMonitoring: `Standard highway patrol monitoring; ensure drainage channels remain unobstructed.`,
      publicAlertAction: `Standard weather advisory broadcast; no immediate public evacuation required.`,
      evacuationPrep: `Verify emergency contact directory for ${zone.villages} local village heads (Gaon Burahs).`,
    };
  } else {
    return {
      priority: 'P4 MONITOR',
      level: risk,
      verificationAction: `Continuous automated satellite and rain-gauge telemetry logging.`,
      escalationAction: `Standard baseline operational status.`,
      infrastructureMonitoring: `Normal routine maintenance.`,
      publicAlertAction: `No public alerts required.`,
      evacuationPrep: `Standard preparedness protocols in place.`,
    };
  }
}
