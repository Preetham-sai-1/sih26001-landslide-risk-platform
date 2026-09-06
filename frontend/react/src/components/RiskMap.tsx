import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Polygon, Polyline, Popup, Tooltip, ZoomControl, useMap } from 'react-leaflet';
import { RiskZone, ForecastHorizon, LiveWeatherStation } from '../types';
import { calculateSimulatedRisk } from '../utils/simulation';
import { evaluateCellForecast } from '../utils/forecastEngine';
import { GSI_HISTORICAL_LANDSLIDES, HistoricalLandslidePoint } from '../utils/landslideHistory';
import { getZoneEvacuationPlan } from '../utils/shelters';
import { computeCommunityImpact } from '../utils/communityImpact';
import { MapLayerControl, MapLayerState } from './MapLayerControl';
import { 
  ChevronRight, 
  Sparkles, 
  Grid, 
  Layers, 
  Navigation, 
  Zap, 
  Home, 
  AlertTriangle, 
  CloudLightning, 
  Clock, 
  ShieldAlert, 
  Radio, 
  CloudRain, 
  Thermometer, 
  Droplets, 
  Wind,
  MapPin,
  Building,
  School,
  HeartPulse
} from 'lucide-react';

interface RiskMapProps {
  zones: RiskZone[];
  selectedZone: RiskZone | null;
  onSelectZone: (zone: RiskZone) => void;
  isDarkMode: boolean;
  highlightZoneId?: string;
  isCitizenView?: boolean;
  simulatedMm?: number;
  forecastHorizon?: ForecastHorizon;
  onForecastHorizonChange?: (horizon: ForecastHorizon) => void;
  liveWeatherStations?: LiveWeatherStation[];
  onSelectLandslidePoint?: (point: HistoricalLandslidePoint) => void;
  mapCenter?: [number, number];
  mapZoom?: number;
}

const getRiskColor = (risk: string) => {
  switch (risk) {
    case 'VERY HIGH': return '#ef4444';
    case 'HIGH': return '#f97316';
    case 'MODERATE': return '#f59e0b';
    case 'LOW': return '#06b6d4';
    case 'SAFE': default: return '#10b981';
  }
};

const getRiskRadius = (risk: string) => {
  switch (risk) {
    case 'VERY HIGH': return 16;
    case 'HIGH': return 14;
    case 'MODERATE': return 12;
    case 'LOW': return 10;
    case 'SAFE': default: return 8;
  }
};

// Map Recenter Component Helper
const ChangeMapView: React.FC<{ center: [number, number]; zoom: number }> = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, zoom, { duration: 1.2 });
  }, [center, zoom, map]);
  return null;
};

export const RiskMap: React.FC<RiskMapProps> = ({
  zones,
  selectedZone,
  onSelectZone,
  isDarkMode,
  highlightZoneId,
  isCitizenView = false,
  simulatedMm = 0,
  forecastHorizon = 'CURRENT',
  onForecastHorizonChange,
  liveWeatherStations = [],
  onSelectLandslidePoint,
  mapCenter,
  mapZoom,
}) => {
  const [layers, setLayers] = useState<MapLayerState>({
    grid: true,
    risk: true,
    landslides: false,
    liveWeather: false,
    infrastructure: false,
    communityImpact: false,
    evacuation: false,
    forecast: forecastHorizon !== 'CURRENT',
    heatmap: false,
  });

  const handleToggleLayer = (key: keyof MapLayerState) => {
    setLayers(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleResetLayers = () => {
    setLayers({
      grid: true,
      risk: true,
      landslides: false,
      liveWeather: false,
      infrastructure: false,
      communityImpact: false,
      evacuation: false,
      forecast: forecastHorizon !== 'CURRENT',
      heatmap: false,
    });
  };


  // Default Center coordinates (NER Regional View)
  const defaultCenterLat = selectedZone ? selectedZone.lat : 25.8;
  const defaultCenterLon = selectedZone ? selectedZone.lon : 92.5;
  const activeCenter: [number, number] = mapCenter || [defaultCenterLat, defaultCenterLon];
  const activeZoom: number = mapZoom || (selectedZone ? 9 : 7);

  const tileUrl = isDarkMode
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

  const attribution = isDarkMode
    ? '&copy; <a href="https://carto.com/">CARTO</a> &copy; OpenStreetMap'
    : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

  const horizons: ForecastHorizon[] = ['CURRENT', '+6H', '+12H', '+24H'];

  return (
    <div className="relative w-full h-full">
      {/* Floating Toolbar: Forecast Horizon & Map Layer Control */}
      <div className="absolute top-4 right-4 z-20 flex flex-wrap items-center gap-2 select-none">
        {/* Forecast Horizon Switcher */}
        {onForecastHorizonChange && (
          <div className="flex items-center gap-1 p-1 bg-slate-950/90 backdrop-blur-md rounded-xl border border-slate-800 shadow-2xl">
            <div className="flex items-center gap-1 px-2 text-[10px] font-extrabold text-amber-400 font-mono">
              <CloudLightning className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <span className="hidden sm:inline">FORECAST:</span>
            </div>
            {horizons.map((h) => {
              const isActive = forecastHorizon === h;
              return (
                <button
                  key={h}
                  onClick={() => onForecastHorizonChange(h)}
                  className={`py-1.5 px-2.5 rounded-lg text-[11px] font-extrabold transition-all duration-200 ${
                    isActive
                      ? h === 'CURRENT'
                        ? 'bg-brand-600 text-white shadow-md'
                        : 'bg-gradient-to-r from-amber-600 to-rose-600 text-white shadow-md shadow-amber-500/25 border border-amber-400/40 scale-105'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  {h}
                </button>
              );
            })}
          </div>
        )}

        {/* Polished Multi-Layer Controller */}
        <MapLayerControl
          layers={layers}
          onToggleLayer={handleToggleLayer}
          onResetLayers={handleResetLayers}
        />
      </div>

      <MapContainer
        center={activeCenter}
        zoom={activeZoom}
        zoomControl={false}
        className="w-full h-full z-0"
      >
        <TileLayer url={tileUrl} attribution={attribution} />
        <ZoomControl position="bottomright" />
        <ChangeMapView center={activeCenter} zoom={activeZoom} />

        {/* --- LAYER 1: HEATMAP DENSITY OVERLAY (Optional Layer) --- */}
        {layers.heatmap && zones.map((zone) => {
          const isHigh = zone.risk === 'VERY HIGH' || zone.risk === 'HIGH';
          const heatRadius = isHigh ? 38 : 22;
          const heatColor = isHigh ? '#ef4444' : '#f59e0b';

          return (
            <CircleMarker
              key={`heat_${zone.grid_id}`}
              center={[zone.lat, zone.lon]}
              radius={heatRadius}
              pathOptions={{
                stroke: false,
                fillColor: heatColor,
                fillOpacity: 0.28,
              }}
            />
          );
        })}

        {/* --- LAYER 2: NER SPATIAL MONITORING GRID CELLS (1 km × 1 km) --- */}
        {layers.grid && zones.map((zone) => {
          const isSelected = selectedZone?.grid_id === zone.grid_id;
          const isHighlighted = highlightZoneId === zone.grid_id;

          // Evaluate Forecast Projection
          const fcEval = evaluateCellForecast(zone, forecastHorizon);
          
          let displayRisk = fcEval.forecastRisk;
          let displayScore = fcEval.forecastScore;
          let displayR24 = fcEval.forecast24hRain;
          let isSimulated = false;

          if (isSelected && simulatedMm > 0) {
            const simResult = calculateSimulatedRisk(zone, simulatedMm);
            displayRisk = simResult.simulatedRisk;
            displayScore = simResult.simulatedScore;
            displayR24 = simResult.new24h;
            isSimulated = true;
          }

          const color = getRiskColor(displayRisk);
          const isEscalating = fcEval.isEscalating && forecastHorizon !== 'CURRENT';

          // Construct Spatial Cell Polygon Bounds (WGS84 EPSG:4326 Lat/Lon Pairs)
          const dLat = 0.08;
          const dLon = 0.09;
          const polygonBounds: [number, number][] = [
            [zone.lat + dLat, zone.lon - dLon],
            [zone.lat + dLat, zone.lon + dLon],
            [zone.lat - dLat, zone.lon + dLon],
            [zone.lat - dLat, zone.lon - dLon],
          ];

          const isVeryHigh = displayRisk === 'VERY HIGH';
          const strokeColor = isSelected
            ? '#38bdf8'
            : isEscalating
            ? '#fbbf24'
            : isVeryHigh
            ? '#ef4444'
            : isDarkMode
            ? '#64748b'
            : '#334155';
            
          const strokeWeight = isSelected ? 3.0 : isEscalating ? 2.5 : isVeryHigh ? 2.0 : 1.2;
          const fillOpacity = isVeryHigh ? 0.65 : isEscalating ? 0.60 : isSelected ? 0.60 : 0.45;

          return (
            <Polygon
              key={`grid_${zone.grid_id}`}
              positions={polygonBounds}
              eventHandlers={{
                click: () => onSelectZone(zone),
              }}
              pathOptions={{
                color: strokeColor,
                weight: strokeWeight,
                fillColor: color,
                fillOpacity: fillOpacity,
                opacity: 0.9,
                dashArray: isEscalating ? '4, 4' : undefined,
              }}
            >
              <Tooltip direction="top" offset={[0, -5]} opacity={1}>
                <div className="p-2 min-w-[210px] text-xs font-sans space-y-1">
                  <div className="flex items-center justify-between gap-2 border-b border-slate-700 pb-1">
                    <div className="flex items-center gap-1 font-mono font-bold text-amber-300 text-[11px]">
                      <Grid className="w-3.5 h-3.5 text-brand-400" />
                      <span>{zone.grid_id}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {isEscalating && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-amber-500/30 text-amber-300 border border-amber-400 animate-pulse">
                          {forecastHorizon} ESCALATION
                        </span>
                      )}
                      <span
                        className="px-2 py-0.5 rounded text-[10px] font-extrabold flex items-center gap-1"
                        style={{ backgroundColor: `${color}30`, color: color, border: `1px solid ${color}60` }}
                      >
                        {isSimulated && <Sparkles className="w-2.5 h-2.5 animate-spin" />}
                        {displayRisk}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1 text-slate-300">
                    <div className="flex items-center justify-between text-white font-bold text-[11px]">
                      <span>{zone.name}</span>
                      <span className="text-slate-400 font-normal">{zone.state}</span>
                    </div>

                    {isEscalating ? (
                      <div className="bg-amber-950/40 p-1.5 rounded border border-amber-500/40 text-[10px] text-amber-300">
                        <span className="font-bold block">Risk Escalation: {fcEval.transition}</span>
                        <span>Score: {fcEval.currentScore.toFixed(1)}% → {fcEval.forecastScore.toFixed(1)}% (+{fcEval.scoreDelta.toFixed(1)} pts)</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-[10px]">
                        <span className="text-slate-400">Risk Score ({forecastHorizon}):</span>
                        <span className="font-extrabold text-white">{displayScore.toFixed(1)}%</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-slate-400">24h Rain:</span>
                      <span className={`font-semibold ${isEscalating ? 'text-amber-300 font-extrabold' : 'text-cyan-400'}`}>
                        {displayR24.toFixed(1)} mm {fcEval.addedRainMm > 0 ? `(+${fcEval.addedRainMm}mm FC)` : ''}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-slate-400">Terrain Slope:</span>
                      <span className="font-semibold text-amber-400">{zone.slope.toFixed(1)}°</span>
                    </div>
                  </div>
                </div>
              </Tooltip>
            </Polygon>
          );
        })}

        {/* --- LAYER 3: INFRASTRUCTURE HIGHWAY CORRIDORS & ASSET NODES --- */}
        {layers.infrastructure && selectedZone && (() => {
          const z = selectedZone;
          const isVeryHigh = z.risk === 'VERY HIGH';
          const simRisk = simulatedMm > 0 ? calculateSimulatedRisk(z, simulatedMm).simulatedRisk : z.risk;
          const isCritical = simRisk === 'VERY HIGH';

          const highwayPath: [number, number][] = [
            [z.lat - 0.05, z.lon - 0.06],
            [z.lat - 0.02, z.lon - 0.03],
            [z.lat + 0.01, z.lon + 0.015],
            [z.lat + 0.045, z.lon + 0.05],
          ];

          return (
            <React.Fragment key="infra_layer">
              <Polyline
                positions={highwayPath}
                pathOptions={{
                  color: isCritical ? '#ef4444' : '#f59e0b',
                  weight: 4,
                  dashArray: isCritical ? '6, 6' : undefined,
                  opacity: 0.85,
                }}
              >
                <Tooltip direction="top" opacity={0.95}>
                  <span className="font-bold text-xs text-white">
                    {z.district.includes('Dima Hasao') ? 'NH-27 Highway Corridor' : `${z.state} Highway Pass`} ({isCritical ? 'RESTRICTED' : 'CAUTION'})
                  </span>
                </Tooltip>
              </Polyline>
            </React.Fragment>
          );
        })()}

        {/* --- LAYER 4: EVACUATION ROUTES & SHELTER NODES --- */}
        {layers.evacuation && selectedZone && (() => {
          const evacPlan = getZoneEvacuationPlan(selectedZone, simulatedMm);
          return (
            <React.Fragment key="evac_layer">
              {/* Primary Route */}
              <Polyline
                positions={evacPlan.primary_route.path_coordinates}
                pathOptions={{
                  color: '#10b981',
                  weight: 3.5,
                  dashArray: '4, 4',
                  opacity: 0.9,
                }}
              >
                <Tooltip direction="top" opacity={0.95}>
                  <span className="font-bold text-xs text-emerald-300">
                    Primary Evacuation Route ({evacPlan.primary_route.distance_km} km)
                  </span>
                </Tooltip>
              </Polyline>

              {/* Primary Shelter Marker */}
              <CircleMarker
                center={[evacPlan.nearest_shelter.lat, evacPlan.nearest_shelter.lon]}
                radius={9}
                pathOptions={{
                  color: '#ffffff',
                  weight: 2.5,
                  fillColor: '#6366f1',
                  fillOpacity: 0.95,
                }}
              >
                <Tooltip direction="top" opacity={0.95}>
                  <div className="p-1 text-xs">
                    <span className="font-bold text-indigo-300 flex items-center gap-1">
                      <Home className="w-3.5 h-3.5" /> {evacPlan.nearest_shelter.name}
                    </span>
                    <span className="text-[10px] text-slate-300 block">
                      Capacity: {evacPlan.nearest_shelter.capacity_persons} • {evacPlan.nearest_shelter.readiness_status}
                    </span>
                  </div>
                </Tooltip>
              </CircleMarker>
            </React.Fragment>
          );
        })()}

        {/* --- LAYER 5: COMMUNITY CRITICAL FACILITIES --- */}
        {layers.communityImpact && selectedZone && (() => {
          const impact = computeCommunityImpact(selectedZone, simulatedMm);
          return (
            <React.Fragment key="community_layer">
              {impact.critical_facilities.map((fac, idx) => {
                const facPos: [number, number] = [
                  selectedZone.lat + (idx % 2 === 0 ? 0.015 : -0.015),
                  selectedZone.lon + (idx < 2 ? 0.015 : -0.015)
                ];

                return (
                  <CircleMarker
                    key={`fac_${idx}`}
                    center={facPos}
                    radius={6.5}
                    pathOptions={{
                      color: '#ffffff',
                      weight: 1.5,
                      fillColor: fac.type === 'Hospital' ? '#ef4444' : fac.type === 'School' ? '#38bdf8' : '#a855f7',
                      fillOpacity: 0.95,
                    }}
                  >
                    <Tooltip direction="top" opacity={0.95}>
                      <div className="p-1 text-xs">
                        <span className="font-bold text-white block">{fac.name}</span>
                        <span className="text-[10px] text-slate-300">{fac.type} • Status: {fac.status}</span>
                      </div>
                    </Tooltip>
                  </CircleMarker>
                );
              })}
            </React.Fragment>
          );
        })()}

        {/* --- LAYER 6: GSI HISTORICAL GROUND TRUTH LANDSLIDE POINTS --- */}
        {layers.landslides && GSI_HISTORICAL_LANDSLIDES.map((pt) => {
          return (
            <CircleMarker
              key={pt.event_id}
              center={[pt.lat, pt.lon]}
              radius={6}
              eventHandlers={{
                click: () => onSelectLandslidePoint?.(pt),
              }}
              pathOptions={{
                color: '#ffffff',
                weight: 1.5,
                fillColor: '#f59e0b',
                fillOpacity: 0.9,
              }}
            >
              <Tooltip direction="top" opacity={0.95}>
                <div className="p-1 space-y-0.5 text-xs font-sans">
                  <div className="flex items-center gap-1 text-amber-300 font-bold">
                    <MapPin className="w-3 h-3" />
                    <span>{pt.event_id}</span>
                  </div>
                  <div className="text-[10px] text-slate-300">
                    <span>{pt.location_name} ({pt.year || 'Historical'})</span>
                  </div>
                </div>
              </Tooltip>
            </CircleMarker>
          );
        })}

        {/* --- LAYER 7: LIVE IMD AWS STATIONS --- */}
        {layers.liveWeather && liveWeatherStations.map((station) => {
          const isSevere = station.warning_level === 'RED' || station.warning_level === 'ORANGE';
          const warningColor = station.warning_level === 'RED' ? '#ef4444' : station.warning_level === 'ORANGE' ? '#f59e0b' : station.warning_level === 'YELLOW' ? '#eab308' : '#10b981';

          return (
            <React.Fragment key={`aws_${station.station_id}`}>
              {/* Pulsing Warning Halo */}
              {isSevere && (
                <CircleMarker
                  center={[station.lat, station.lon]}
                  radius={18}
                  pathOptions={{
                    color: warningColor,
                    fillColor: warningColor,
                    fillOpacity: 0.2,
                    stroke: true,
                    weight: 1.5,
                    dashArray: '3, 3',
                    className: 'animate-spin'
                  }}
                />
              )}

              {/* Station Core Marker */}
              <CircleMarker
                center={[station.lat, station.lon]}
                radius={8}
                pathOptions={{
                  color: '#ffffff',
                  weight: 2.5,
                  fillColor: '#059669',
                  fillOpacity: 0.95,
                }}
              >
                <Tooltip direction="top" opacity={0.95}>
                  <div className="p-1 space-y-0.5 text-xs font-sans">
                    <div className="flex items-center gap-1 text-emerald-300 font-extrabold text-[11px]">
                      <Radio className="w-3 h-3 animate-pulse" />
                      <span>{station.station_name}</span>
                    </div>
                    <div className="text-[10px] text-slate-300">
                      <span>24h Rain: <strong>{station.rainfall_24h_mm.toFixed(1)} mm</strong></span> • <span>Temp: <strong>{station.temperature_c.toFixed(1)}°C</strong></span>
                    </div>
                  </div>
                </Tooltip>
              </CircleMarker>
            </React.Fragment>
          );
        })}

        {/* --- LAYER 8: RISK CENTROID MARKERS --- */}
        {layers.risk && zones.map((zone) => {
          const isSelected = selectedZone?.grid_id === zone.grid_id;
          const isHighlighted = highlightZoneId === zone.grid_id;

          let displayRisk = zone.risk;
          let isSimulated = false;

          if (isSelected && simulatedMm > 0) {
            const simResult = calculateSimulatedRisk(zone, simulatedMm);
            displayRisk = simResult.simulatedRisk;
            isSimulated = true;
          }

          const color = getRiskColor(displayRisk);
          const baseRadius = getRiskRadius(displayRisk);

          let fillOpacity = 0.85;
          let opacity = 0.95;
          let radius = baseRadius;

          if (isCitizenView) {
            if (isHighlighted) {
              fillOpacity = 0.95;
              opacity = 1;
              radius = baseRadius + 6;
            } else {
              fillOpacity = 0.3;
              opacity = 0.5;
            }
          }

          if (isSelected) {
            radius = baseRadius + 4;
          }

          return (
            <React.Fragment key={`marker_${zone.grid_id}`}>
              {(displayRisk === 'VERY HIGH' || isHighlighted || (isSelected && isSimulated)) && (
                <CircleMarker
                  center={[zone.lat, zone.lon]}
                  radius={radius + 8}
                  pathOptions={{
                    color: color,
                    fillColor: color,
                    fillOpacity: isSimulated ? 0.35 : 0.25,
                    stroke: false,
                    className: 'animate-ping'
                  }}
                />
              )}

              <CircleMarker
                center={[zone.lat, zone.lon]}
                radius={radius}
                eventHandlers={{
                  click: () => onSelectZone(zone),
                }}
                pathOptions={{
                  color: isSelected ? '#ffffff' : color,
                  weight: isSelected ? (isSimulated ? 4 : 3) : 2,
                  fillColor: color,
                  fillOpacity: fillOpacity,
                  opacity: opacity,
                }}
              >
                <Popup>
                  <div className="p-1 max-w-[220px]">
                    <h3 className="font-bold text-white text-sm mb-1">{zone.name}</h3>
                    <p className="text-xs text-slate-300 mb-2">Grid ID: <code className="bg-slate-800 px-1 py-0.5 rounded text-amber-300">{zone.grid_id}</code></p>
                    <button
                      onClick={() => onSelectZone(zone)}
                      className="w-full py-1.5 px-3 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
                    >
                      Open Zone Inspector <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </Popup>
              </CircleMarker>
            </React.Fragment>
          );
        })}
      </MapContainer>

      {/* Floating Legend */}
      <div className="absolute bottom-6 left-6 z-10 glass-panel p-3 rounded-2xl text-xs space-y-2 shadow-2xl border border-slate-800 max-w-[260px] select-none text-slate-100 bg-slate-950/90 backdrop-blur-md">
        <div className="border-b border-slate-800 pb-1 flex items-center justify-between">
          <span className="font-bold text-white">Multi-Layer NER Map</span>
          <span className="text-[10px] text-amber-400 font-mono font-bold">1 km Monitoring</span>
        </div>

        <div className="grid grid-cols-2 gap-1 text-[10px]">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-red-500" /> Very High</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-orange-500" /> High Risk</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-amber-500" /> Moderate</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-emerald-500" /> Safe</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-400 border border-white" /> GSI Event</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border border-white" /> IMD AWS</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-indigo-500 border border-white" /> Shelter Node</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-cyan-400" /> Infrastructure</span>
        </div>
      </div>
    </div>
  );
};
