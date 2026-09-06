import { RiskZone } from '../types';

export interface ShelterInfo {
  shelter_id: string;
  name: string;
  type: string;
  distance_km: number;
  lat: number;
  lon: number;
  capacity_persons: number;
  readiness_status: 'Fully Operational' | 'Standby' | 'Mobilizing Resources';
  amenities: string[];
  contact_officer: string;
  phone: string;
  elevation_m: number;
}

export interface EvacuationRoute {
  route_id: string;
  name: string;
  type: 'Primary' | 'Alternate Bypass';
  distance_km: number;
  estimated_travel_mins: number;
  condition: 'Clear & Open' | 'Caution - Slow Moving' | 'Restricted / Emergency Convoy Only';
  path_coordinates: [number, number][];
  hazards: string[];
}

export interface EvacuationPlan {
  zone_id: string;
  nearest_shelter: ShelterInfo;
  alternate_shelter: ShelterInfo;
  primary_route: EvacuationRoute;
  alternate_route: EvacuationRoute;
  assembly_point_name: string;
  disclaimer: string;
}

export function getZoneEvacuationPlan(zone: RiskZone, simulatedAddedMm: number = 0): EvacuationPlan {
  const isSevere = zone.risk === 'VERY HIGH' || simulatedAddedMm >= 50;

  const primaryShelter: ShelterInfo = {
    shelter_id: `SH-${zone.district.substring(0, 3).toUpperCase()}-01`,
    name: `${zone.district} District Multi-Purpose Indoor Sports Stadium`,
    type: 'Government Designated Relief Shelter',
    distance_km: 2.8,
    lat: zone.lat + 0.02,
    lon: zone.lon + 0.015,
    capacity_persons: 650,
    readiness_status: isSevere ? 'Fully Operational' : 'Standby',
    amenities: ['Emergency Power', 'Potable Water Tankers', 'Medical First Aid Post', 'Kitchen Supplies'],
    contact_officer: 'Nodal Officer / District Disaster Management Cell',
    phone: '1077 (District Toll-Free Emergency Helpline)',
    elevation_m: zone.elev - 120
  };

  const alternateShelter: ShelterInfo = {
    shelter_id: `SH-${zone.district.substring(0, 3).toUpperCase()}-02`,
    name: `${zone.name} Community Hall & Primary Health Centre`,
    type: 'Secondary Shelter Node',
    distance_km: 4.5,
    lat: zone.lat - 0.025,
    lon: zone.lon - 0.02,
    capacity_persons: 300,
    readiness_status: 'Standby',
    amenities: ['Emergency Solar Lighting', 'Dry Rations', 'Basic First Aid'],
    contact_officer: 'Block Development Officer',
    phone: '112 / 1070',
    elevation_m: zone.elev - 80
  };

  const primaryRoute: EvacuationRoute = {
    route_id: 'RTE-PRI-01',
    name: `Main Hill Road to ${primaryShelter.name}`,
    type: 'Primary',
    distance_km: 3.2,
    estimated_travel_mins: isSevere ? 22 : 12,
    condition: isSevere ? 'Caution - Slow Moving' : 'Clear & Open',
    path_coordinates: [
      [zone.lat, zone.lon],
      [zone.lat + 0.008, zone.lon + 0.006],
      [zone.lat + 0.015, zone.lon + 0.012],
      [zone.lat + 0.02, zone.lon + 0.015],
    ],
    hazards: isSevere ? ['Localized Mud Spills on Outer Shoulder', 'Low Visibility Fog'] : ['None reported']
  };

  const alternateRoute: EvacuationRoute = {
    route_id: 'RTE-ALT-02',
    name: `Valley Ridge Bypass to ${alternateShelter.name}`,
    type: 'Alternate Bypass',
    distance_km: 5.1,
    estimated_travel_mins: 28,
    condition: 'Clear & Open',
    path_coordinates: [
      [zone.lat, zone.lon],
      [zone.lat - 0.01, zone.lon - 0.008],
      [zone.lat - 0.018, zone.lon - 0.015],
      [zone.lat - 0.025, zone.lon - 0.02],
    ],
    hazards: ['Single-lane paved stretch', 'Stream crossing culvert']
  };

  return {
    zone_id: zone.grid_id,
    nearest_shelter: primaryShelter,
    alternate_shelter: alternateShelter,
    primary_route: primaryRoute,
    alternate_route: alternateRoute,
    assembly_point_name: `${zone.name} Central Panchayat Ground`,
    disclaimer: 'Prototype Decision-Support Shelter Data for SIH demonstration. Follow official District Magistrate / SDMA directives during actual disasters.'
  };
}
