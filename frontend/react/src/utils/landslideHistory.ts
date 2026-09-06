export interface HistoricalLandslidePoint {
  event_id: string;
  source: string;
  year?: number;
  date_str?: string;
  lat: number;
  lon: number;
  state: string;
  district: string;
  location_name: string;
  landslide_type: string;
  trigger_cause: string;
  source_reference: string;
  historical_fatalities?: number;
  antecedent_rainfall_mm?: number;
  geology_formation: string;
}

export const GSI_HISTORICAL_LANDSLIDES: HistoricalLandslidePoint[] = [
  // ASSAM
  {
    event_id: "GSI-NER-AS-1021",
    source: "Geological Survey of India (GSI) NER Inventory",
    year: 2018,
    date_str: "2018-07-14",
    lat: 25.185,
    lon: 93.022,
    state: "Assam",
    district: "Dima Hasao",
    location_name: "Haflong - Jatinga Ridge Slope",
    landslide_type: "Debris Flow & Translational Slide",
    trigger_cause: "Intense monsoonal precipitation (>140mm in 48h)",
    source_reference: "GSI Open File Report / Landslide Atlas of India, Plate NER-12",
    historical_fatalities: 3,
    antecedent_rainfall_mm: 142.5,
    geology_formation: "Disang Formation (Weak splintery shale & sandstone)"
  },
  {
    event_id: "GSI-NER-AS-1044",
    source: "Geological Survey of India (GSI) NER Inventory",
    year: 2019,
    date_str: "2019-06-22",
    lat: 26.175,
    lon: 91.745,
    state: "Assam",
    district: "Kamrup Metropolitan",
    location_name: "Guwahati Narakasur Hill Cut-Slope",
    landslide_type: "Earth Slide / Slope Collapse",
    trigger_cause: "Heavy urban downpour on unreinforced cut slope",
    source_reference: "GSI Special Publication No. 98, Landslides in Brahmaputra Basin",
    historical_fatalities: 1,
    antecedent_rainfall_mm: 88.0,
    geology_formation: "Precambrian Gneissic Complex with deep residual soil cover"
  },
  {
    event_id: "GSI-NER-AS-1088",
    source: "Geological Survey of India (GSI) NER Inventory",
    year: 2020,
    date_str: "2020-05-28",
    lat: 24.825,
    lon: 92.795,
    state: "Assam",
    district: "Cachar",
    location_name: "Silchar Kumbhirgram Hill Pass",
    landslide_type: "Debris Slide",
    trigger_cause: "Cyclonic depression rainfall trigger",
    source_reference: "GSI Landslide Database Record AS-CAC-08",
    historical_fatalities: 0,
    antecedent_rainfall_mm: 110.0,
    geology_formation: "Surma Group Sandstone-Shale interbeds"
  },

  // ARUNACHAL PRADESH
  {
    event_id: "GSI-NER-AR-2015",
    source: "Geological Survey of India (GSI) NER Inventory",
    year: 2017,
    date_str: "2017-08-11",
    lat: 27.582,
    lon: 91.861,
    state: "Arunachal Pradesh",
    district: "Tawang",
    location_name: "Tawang Sela Corridor Pass (NH-13)",
    landslide_type: "Rock Fall & Rock Slide",
    trigger_cause: "Frost action followed by heavy monsoon precipitation",
    source_reference: "GSI Himalayan Landslide Investigations, Report NER-AR-04",
    historical_fatalities: 2,
    antecedent_rainfall_mm: 95.4,
    geology_formation: "Sela Gneissic Group (Highly jointed crystalline rocks)"
  },
  {
    event_id: "GSI-NER-AR-2032",
    source: "Geological Survey of India (GSI) NER Inventory",
    year: 2021,
    date_str: "2021-07-04",
    lat: 27.095,
    lon: 93.615,
    state: "Arunachal Pradesh",
    district: "Papum Pare",
    location_name: "Itanagar Papu Nallah Highway Sector",
    landslide_type: "Rotational Mudflow",
    trigger_cause: "Prolonged 7-day antecedent saturation",
    source_reference: "GSI Geological Mapping & Landslide Zonation, Itanagar Region",
    historical_fatalities: 0,
    antecedent_rainfall_mm: 165.2,
    geology_formation: "Siwalik Group (Unconsolidated sandstone & pebble beds)"
  },

  // MEGHALAYA
  {
    event_id: "GSI-NER-ML-3011",
    source: "Geological Survey of India (GSI) NER Inventory",
    year: 2016,
    date_str: "2016-06-18",
    lat: 25.275,
    lon: 91.715,
    state: "Meghalaya",
    district: "East Khasi Hills",
    location_name: "Sohra (Cherrapunji) Cliff Precipice",
    landslide_type: "Debris Avalanche / Cliff Failure",
    trigger_cause: "Extreme cloudburst precipitation (>220mm in 24h)",
    source_reference: "GSI Memoirs Vol. 132, Geodynamics & Slope Stability of Meghalaya Plateau",
    historical_fatalities: 4,
    antecedent_rainfall_mm: 260.0,
    geology_formation: "Khasi Group Sandstone & Shella Limestone overlay"
  },
  {
    event_id: "GSI-NER-ML-3045",
    source: "Geological Survey of India (GSI) NER Inventory",
    year: 2020,
    date_str: "2020-09-24",
    lat: 25.895,
    lon: 91.875,
    state: "Meghalaya",
    district: "Ri-Bhoi",
    location_name: "Nongpoh Valley Sector (NH-6)",
    landslide_type: "Translational Debris Slide",
    trigger_cause: "Continuous rain coupled with road-widening excavation",
    source_reference: "GSI Landslide Hazard Zonation Atlas of Meghalaya",
    historical_fatalities: 0,
    antecedent_rainfall_mm: 118.0,
    geology_formation: "Shillong Group Quartzites & Phyllites"
  },

  // MIZORAM
  {
    event_id: "GSI-NER-MZ-4008",
    source: "Geological Survey of India (GSI) NER Inventory",
    year: 2017,
    date_str: "2017-06-09",
    lat: 23.722,
    lon: 92.712,
    state: "Mizoram",
    district: "Aizawl",
    location_name: "Aizawl Tuikual Sinking Zone",
    landslide_type: "Deep-seated Rotational Complex Slide",
    trigger_cause: "Heavy monsoon soaking on steep dip-slope topography",
    source_reference: "GSI Landslide Macro-zonation Study of Aizawl City",
    historical_fatalities: 6,
    antecedent_rainfall_mm: 175.0,
    geology_formation: "Bhuban Formation (Interbedded fine sandstone, siltstone & shale)"
  },

  // NAGALAND
  {
    event_id: "GSI-NER-NL-5012",
    source: "Geological Survey of India (GSI) NER Inventory",
    year: 2018,
    date_str: "2018-08-02",
    lat: 25.670,
    lon: 94.105,
    state: "Nagaland",
    district: "Kohima",
    location_name: "Kohima High School - By-pass Cut Slope",
    landslide_type: "Progressive Creep & Slump",
    trigger_cause: "Excessive pore-water pressure along tectonic fault line",
    source_reference: "GSI Geotechnical Assessment of Sinking Areas in Nagaland",
    historical_fatalities: 1,
    antecedent_rainfall_mm: 135.0,
    geology_formation: "Disang Shale (Tectonically pulverized clay-shale)"
  },

  // MANIPUR
  {
    event_id: "GSI-NER-MN-6004",
    source: "Geological Survey of India (GSI) NER Inventory",
    year: 2015,
    date_str: "2015-08-01",
    lat: 24.975,
    lon: 93.965,
    state: "Manipur",
    district: "Kangpokpi",
    location_name: "Kangpokpi - Karong NH-2 Highway Section",
    landslide_type: "Mudflow & Debris Flow",
    trigger_cause: "High-intensity precipitation following Cyclone Komen",
    source_reference: "GSI Special Landslide Incident Report NER-MN-2015",
    historical_fatalities: 2,
    antecedent_rainfall_mm: 190.5,
    geology_formation: "Disang Formation weathered flysch"
  },

  // SIKKIM
  {
    event_id: "GSI-NER-SK-7009",
    source: "Geological Survey of India (GSI) NER Inventory",
    year: 2019,
    date_str: "2019-07-12",
    lat: 27.325,
    lon: 88.608,
    state: "Sikkim",
    district: "East Sikkim",
    location_name: "Gangtok Tadong - Teesta NH-10 Corridor",
    landslide_type: "Rock Slide & Slump Failure",
    trigger_cause: "Toe-erosion by Teesta tributary and heavy rainfall",
    source_reference: "GSI Geological Mapping & Landslide Hazard Atlas of Sikkim",
    historical_fatalities: 2,
    antecedent_rainfall_mm: 180.0,
    geology_formation: "Daling Group (Chlorite-Sericite Schists & Phyllites)"
  },

  // TRIPURA
  {
    event_id: "GSI-NER-TR-8002",
    source: "Geological Survey of India (GSI) NER Inventory",
    year: 2018,
    date_str: "2018-06-15",
    lat: 23.825,
    lon: 91.280,
    state: "Tripura",
    district: "West Tripura",
    location_name: "Baromura Hill Anticlinal Ridge",
    landslide_type: "Shallow Soil Slip",
    trigger_cause: "Precipitation on degraded forest slope",
    source_reference: "GSI Geo-environmental Study of Tripura Hill Ranges",
    historical_fatalities: 0,
    antecedent_rainfall_mm: 82.0,
    geology_formation: "Tipam Sandstone Formation"
  }
];
