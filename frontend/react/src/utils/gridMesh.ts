import { RiskZone, RiskLevel } from '../types';

export interface GridCellPolygon {
  grid_id: string;
  name: string;
  state: string;
  district: string;
  lat: number;
  lon: number;
  bounds: [number, number][]; // [[latMin, lonMin], [latMax, lonMin], [latMax, lonMax], [latMin, lonMax]]
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
  villages: number;
  population: number;
  target: number;
  pos_count: number;
}

// Generate continuous NER spatial monitoring grid mesh across Northeast India
export function generateNERGridMesh(): RiskZone[] {
  const zones: RiskZone[] = [];
  
  // Base key sector seeds covering all 8 Northeast India states
  const sectorSeeds = [
    // ASSAM
    { grid_id: "ner_grid_056061", name: "Haflong Hill Sector", state: "Assam", district: "Dima Hasao", lat: 25.188, lon: 93.019, elev: 870.1, slope: 34.2, r24: 104.7, r3d: 122.2, r7d: 362.5, r30d: 622.5, risk: "VERY HIGH" as RiskLevel, score: 92.4, pop: 28400 },
    { grid_id: "ner_grid_056495", name: "Jatinga Valley Pass", state: "Assam", district: "Dima Hasao", lat: 25.163, lon: 93.025, elev: 795.4, slope: 31.8, r24: 104.7, r3d: 122.2, r7d: 362.5, r30d: 622.5, risk: "VERY HIGH" as RiskLevel, score: 88.9, pop: 15200 },
    { grid_id: "ner_grid_056952", name: "Lower Mahur Slope", state: "Assam", district: "Dima Hasao", lat: 25.145, lon: 93.031, elev: 650.2, slope: 28.5, r24: 128.7, r3d: 159.3, r7d: 162.7, r30d: 457.8, risk: "HIGH" as RiskLevel, score: 79.3, pop: 19800 },
    { grid_id: "ner_grid_061652", name: "Umrangso Basin Edge", state: "Assam", district: "Dima Hasao", lat: 25.210, lon: 92.890, elev: 510.0, slope: 22.4, r24: 61.4, r3d: 75.0, r7d: 194.5, r30d: 308.3, risk: "MODERATE" as RiskLevel, score: 61.2, pop: 9400 },
    { grid_id: "ner_grid_052110", name: "Guwahati Kamrup Ridge", state: "Assam", district: "Kamrup Metropolitan", lat: 26.180, lon: 91.750, elev: 280.0, slope: 21.5, r24: 35.0, r3d: 62.0, r7d: 125.0, r30d: 280.0, risk: "MODERATE" as RiskLevel, score: 56.4, pop: 52000 },
    { grid_id: "ner_grid_053420", name: "Silchar Valley Buffer", state: "Assam", district: "Cachar", lat: 24.830, lon: 92.800, elev: 65.0, slope: 12.0, r24: 18.0, r3d: 42.0, r7d: 85.0, r30d: 210.0, risk: "LOW" as RiskLevel, score: 34.2, pop: 38000 },
    { grid_id: "ner_grid_054110", name: "Tezpur Foothills", state: "Assam", district: "Sonitpur", lat: 26.630, lon: 92.800, elev: 78.0, slope: 8.5, r24: 12.0, r3d: 28.0, r7d: 65.0, r30d: 180.0, risk: "SAFE" as RiskLevel, score: 18.5, pop: 29000 },
    { grid_id: "ner_grid_055220", name: "Digboi Oil Field Belt", state: "Assam", district: "Tinsukia", lat: 27.380, lon: 95.620, elev: 165.0, slope: 15.2, r24: 22.0, r3d: 52.0, r7d: 110.0, r30d: 240.0, risk: "LOW" as RiskLevel, score: 38.0, pop: 21000 },

    // ARUNACHAL PRADESH
    { grid_id: "ner_grid_010010", name: "Tawang Ridge Pass", state: "Arunachal Pradesh", district: "Tawang", lat: 27.586, lon: 91.866, elev: 2840.0, slope: 38.6, r24: 10.7, r3d: 24.5, r7d: 88.4, r30d: 190.2, risk: "HIGH" as RiskLevel, score: 76.8, pop: 18500 },
    { grid_id: "ner_grid_010520", name: "Bomdila Cut-Slope", state: "Arunachal Pradesh", district: "West Kameng", lat: 27.260, lon: 92.420, elev: 2210.0, slope: 36.8, r24: 65.0, r3d: 110.0, r7d: 290.0, r30d: 480.0, risk: "VERY HIGH" as RiskLevel, score: 86.5, pop: 21000 },
    { grid_id: "ner_grid_011240", name: "Itanagar Capital Pass", state: "Arunachal Pradesh", district: "Papum Pare", lat: 27.100, lon: 93.620, elev: 750.0, slope: 32.4, r24: 48.0, r3d: 92.0, r7d: 210.0, r30d: 410.0, risk: "HIGH" as RiskLevel, score: 78.1, pop: 34000 },
    { grid_id: "ner_grid_124042", name: "Lower Dibang Foothills", state: "Arunachal Pradesh", district: "Lower Dibang Valley", lat: 28.150, lon: 95.840, elev: 420.0, slope: 14.2, r24: 8.0, r3d: 18.0, r7d: 45.0, r30d: 120.0, risk: "LOW" as RiskLevel, score: 32.1, pop: 7200 },
    { grid_id: "ner_grid_012880", name: "Ziro Valley Plateau", state: "Arunachal Pradesh", district: "Lower Subansiri", lat: 27.550, lon: 93.830, elev: 1560.0, slope: 19.8, r24: 24.0, r3d: 48.0, r7d: 115.0, r30d: 260.0, risk: "LOW" as RiskLevel, score: 39.5, pop: 12800 },

    // MEGHALAYA
    { grid_id: "ner_grid_000518", name: "Shillong Plateau Rim", state: "Meghalaya", district: "Ri-Bhoi", lat: 25.900, lon: 91.880, elev: 1420.0, slope: 26.2, r24: 18.5, r3d: 41.2, r7d: 110.5, r30d: 290.0, risk: "MODERATE" as RiskLevel, score: 54.0, pop: 31000 },
    { grid_id: "ner_grid_000720", name: "Cherrapunji Precipice Sector", state: "Meghalaya", district: "East Khasi Hills", lat: 25.280, lon: 91.720, elev: 1480.0, slope: 39.2, r24: 145.0, r3d: 310.0, r7d: 680.0, r30d: 1150.0, risk: "VERY HIGH" as RiskLevel, score: 95.8, pop: 19500 },
    { grid_id: "ner_grid_000840", name: "Nongpoh NH-6 Corridor", state: "Meghalaya", district: "Ri-Bhoi", lat: 25.920, lon: 91.880, elev: 680.0, slope: 30.5, r24: 52.0, r3d: 98.0, r7d: 240.0, r30d: 420.0, risk: "HIGH" as RiskLevel, score: 74.6, pop: 26500 },
    { grid_id: "ner_grid_000910", name: "Tura Peak Cut-Slope", state: "Meghalaya", district: "West Garo Hills", lat: 25.510, lon: 90.220, elev: 870.0, slope: 33.1, r24: 68.0, r3d: 125.0, r7d: 310.0, r30d: 520.0, risk: "HIGH" as RiskLevel, score: 81.2, pop: 24000 },

    // MIZORAM
    { grid_id: "ner_grid_013575", name: "Aizawl West Hill", state: "Mizoram", district: "Aizawl", lat: 23.727, lon: 92.717, elev: 1120.0, slope: 35.1, r24: 29.2, r3d: 58.1, r7d: 142.0, r30d: 380.5, risk: "HIGH" as RiskLevel, score: 81.5, pop: 42000 },
    { grid_id: "ner_grid_013910", name: "Lunglei Ridge North", state: "Mizoram", district: "Lunglei", lat: 22.880, lon: 92.730, elev: 1250.0, slope: 37.4, r24: 78.0, r3d: 145.0, r7d: 380.0, r30d: 590.0, risk: "VERY HIGH" as RiskLevel, score: 89.2, pop: 23000 },
    { grid_id: "ner_grid_014200", name: "Champhai Border Slope", state: "Mizoram", district: "Champhai", lat: 23.470, lon: 93.320, elev: 1380.0, slope: 25.8, r24: 32.0, r3d: 65.0, r7d: 150.0, r30d: 320.0, risk: "MODERATE" as RiskLevel, score: 58.4, pop: 18200 },

    // NAGALAND
    { grid_id: "ner_grid_090841", name: "Kohima Ridge Bypass", state: "Nagaland", district: "Kohima", lat: 25.674, lon: 94.110, elev: 1440.0, slope: 29.8, r24: 14.2, r3d: 32.0, r7d: 85.0, r30d: 210.0, risk: "MODERATE" as RiskLevel, score: 58.6, pop: 26000 },
    { grid_id: "ner_grid_091120", name: "Mokokchung Ridge West", state: "Nagaland", district: "Mokokchung", lat: 26.320, lon: 94.520, elev: 1320.0, slope: 33.6, r24: 45.0, r3d: 88.0, r7d: 210.0, r30d: 390.0, risk: "HIGH" as RiskLevel, score: 76.4, pop: 28000 },
    { grid_id: "ner_grid_091560", name: "Tuensang High Pass", state: "Nagaland", district: "Tuensang", lat: 26.280, lon: 94.830, elev: 1720.0, slope: 36.2, r24: 82.0, r3d: 150.0, r7d: 340.0, r30d: 540.0, risk: "VERY HIGH" as RiskLevel, score: 87.8, pop: 17500 },

    // MANIPUR
    { grid_id: "ner_grid_091393", name: "Kangpokpi Highway Zone", state: "Manipur", district: "Kangpokpi", lat: 24.980, lon: 93.970, elev: 980.0, slope: 27.5, r24: 22.0, r3d: 50.0, r7d: 130.0, r30d: 310.0, risk: "HIGH" as RiskLevel, score: 71.4, pop: 29500 },
    { grid_id: "ner_grid_092410", name: "Senapati Pass NH-2", state: "Manipur", district: "Senapati", lat: 25.260, lon: 94.020, elev: 1450.0, slope: 35.8, r24: 72.0, r3d: 138.0, r7d: 320.0, r30d: 510.0, risk: "VERY HIGH" as RiskLevel, score: 86.9, pop: 32000 },
    { grid_id: "ner_grid_093150", name: "Churachandpur Hill Sector", state: "Manipur", district: "Churachandpur", lat: 24.330, lon: 93.680, elev: 910.0, slope: 31.2, r24: 55.0, r3d: 105.0, r7d: 260.0, r30d: 430.0, risk: "HIGH" as RiskLevel, score: 79.5, pop: 31000 },

    // SIKKIM
    { grid_id: "ner_grid_000521", name: "Gangtok-Nathula Belt", state: "Sikkim", district: "East Sikkim", lat: 27.331, lon: 88.613, elev: 1650.0, slope: 36.4, r24: 42.0, r3d: 95.0, r7d: 280.0, r30d: 520.0, risk: "VERY HIGH" as RiskLevel, score: 87.2, pop: 22100 },
    { grid_id: "ner_grid_000640", name: "Mangan North Highway", state: "Sikkim", district: "North Sikkim", lat: 27.510, lon: 88.530, elev: 1890.0, slope: 39.8, r24: 95.0, r3d: 180.0, r7d: 420.0, r30d: 680.0, risk: "VERY HIGH" as RiskLevel, score: 94.1, pop: 14200 },
    { grid_id: "ner_grid_000780", name: "Namchi Slope Sector", state: "Sikkim", district: "South Sikkim", lat: 27.160, lon: 88.350, elev: 1310.0, slope: 32.5, r24: 38.0, r3d: 82.0, r7d: 195.0, r30d: 380.0, risk: "HIGH" as RiskLevel, score: 77.2, pop: 19800 },

    // TRIPURA
    { grid_id: "ner_grid_000999", name: "Agartala Valley Plain", state: "Tripura", district: "West Tripura", lat: 23.831, lon: 91.286, elev: 45.0, slope: 3.2, r24: 5.4, r3d: 12.0, r7d: 35.0, r30d: 95.0, risk: "SAFE" as RiskLevel, score: 12.5, pop: 58000 },
    { grid_id: "ner_grid_001250", name: "Jampui Hill Ridge", state: "Tripura", district: "North Tripura", lat: 23.920, lon: 92.280, elev: 620.0, slope: 23.4, r24: 28.0, r3d: 55.0, r7d: 120.0, r30d: 290.0, risk: "MODERATE" as RiskLevel, score: 58.2, pop: 18000 },
  ];

  // Map each seed to full RiskZone format
  for (const s of sectorSeeds) {
    zones.push({
      grid_id: s.grid_id,
      name: s.name,
      state: s.state,
      district: s.district,
      villages: 12,
      population: s.pop,
      lat: s.lat,
      lon: s.lon,
      target: s.risk === 'VERY HIGH' || s.risk === 'HIGH' ? 1 : 0,
      pos_count: s.risk === 'VERY HIGH' ? 3 : s.risk === 'HIGH' ? 2 : 0,
      elev: s.elev,
      slope: s.slope,
      aspect: 180.0,
      curv: 250.0,
      r24: s.r24,
      r3d: s.r3d,
      r7d: s.r7d,
      r30d: s.r30d,
      risk: s.risk,
      score: s.score,
    });
  }

  return zones;
}
