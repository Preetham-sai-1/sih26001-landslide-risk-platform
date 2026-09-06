# SIH26001 — Final Product Polish & Disaster Command Center Implementation

**Project**: SIH26001 Landslide Early Warning & Risk Platform (North Eastern Region, India)  
**Baseline**: `86c705c` (feat: validate full-stack deployment)  
**Status**: Final Product Polish Complete — 100% Production Ready for Demonstration

---

## 1. Information Architecture & Navigation

The platform was enhanced to serve as a unified, enterprise-grade **Disaster Command Center** tailored for emergency responders, district magistrates, state disaster management authorities (SDMA), field officers, and citizens.

### Navigation Overview (12 Core Views)
1. **Command Center (`/` or `command-center`)**: Main tactical situational awareness dashboard featuring a 75% dominant Leaflet map, operational attention bar, search bar, role switcher, and progressive disclosure Zone Intelligence drawer.
2. **Early Warning Center (`/early-warning`)**: Scenario projection engine for real-time trigger monitoring, rainfall threshold curves (72h antecedent), and predictive lead-time estimations.
3. **Risk Map Explorer (`/risk-map`)**: GIS spatial analyst view supporting raster overlay toggles, slope/soil risk gradient heatmaps, and spatial buffer selections.
4. **Live Weather & Telemetry (`/weather`)**: Real-time IMD/AWS sensor telemetry view displaying rainfall rates, soil moisture percentage, wind vectors, and automatic fallback status indicators.
5. **Infrastructure & Assets (`/infrastructure`)**: Critical asset protection map layer showing roads, bridges, power substations, hospitals, and population vulnerability scores.
6. **Field Verification (`/field-reports`)**: Ground verification dispatch and photo report feed managed by Field Officers, maintaining strict separation between ML predictions and ground truth.
7. **Alerts & Subscriptions (`/alerts`)**: Multi-channel alert dispatch portal (SMS, WhatsApp, Siren, CAP/NDMA XML) with role-based approval controls.
8. **Incident Lifecycle (`/incidents`)**: Audit-logged state machine for tracking disaster events from initial ML trigger (`WATCH`) to field verification (`VERIFICATION`), authority confirmation (`CONFIRMED`), and final mitigation (`RESOLVED`).
9. **Analytics & Reports (`/analytics`)**: Historical spatial-temporal analytics, model performance tracking, and automated PDF situation report export generation.
10. **Citizen Warning Portal (`/citizen`)**: Simplified public access view providing plain-language safety alerts, emergency hotline contacts, and nearest evacuation shelter navigation.
11. **Data Sources & Lineage (`/data-sources`)**: Provenance dashboard tracking active spatial rasters, telemetry feeds, model weights, and pipeline freshness.
12. **System Health & Resiliency (`/system-health`)**: Live operational telemetry for platform services (Spring Boot, PostgreSQL/PostGIS, FastAPI ML engine, Nginx, IMD relay).

---

## 2. Command Center Layout & UX Architecture

The default **Command Center** view implements high-density, low-latency ergonomics:
- **Top Operational Header**: Displays system identity, active operational alert badge, live server time, quick search trigger (`Ctrl + K`), role switcher (`ADMIN`, `AUTHORITY`, `FIELD_OFFICER`, `VIEWER`), and theme toggle.
- **Operational Attention Bar**: Top summary strip highlighting critical situational metrics: `CRITICAL ZONES`, `HIGH RISK ZONES`, `ESCALATING READINESS`, `PENDING FIELD VERIFICATIONS`, and `ACTIVE DISPATCH ALERTS`.
- **75% Dominant Spatial Canvas**: Full-bleed Leaflet map featuring custom GeoJSON zone boundaries, hazard heatmaps, incident pin markers, shelter locations, and interactive layer controls.
- **Progressive Disclosure Zone Intelligence Panel**: Sliding drawer that opens upon clicking any zone or marker, organizing zone details into tabbed accordions:
  - `WEATHER`: Current rainfall, 72h accumulated rainfall, soil saturation rate.
  - `ML MODEL INFERENCE & SHAP`: Landslide probability ($P_{\text{landslide}}$), confidence score, risk category badge, and top XGBoost SHAP feature importance drivers.
  - `IMPACT`: Affected population, critical infrastructure at risk, nearest evacuation shelters.
  - `TIMELINE`: Audit history of alerts, telemetry spikes, and verification dispatches.
  - `RESPONSE DIRECTIVES`: Standard Operating Procedures (SOPs) based on current risk level.

---

## 3. Data Semantics & Safety Boundaries

To prevent panic and maintain operational integrity, strict visual and semantic rules are enforced throughout the UI:
1. **Prediction $\neq$ Confirmation**:
   - ML model outputs are explicitly labeled **`PREDICTED RISK (ML Probability Output - Not Confirmed Incident)`**.
   - Physical events are only marked **`CONFIRMED LANDSLIDE`** after a Field Officer submits a ground report or an Authority officially verifies the incident.
2. **Demo Mode Transparency**:
   - All simulated telemetry, offline fallbacks, and scenario projections carry clear **`DEMO MODE`** / **`SIMULATED SCENARIO`** badges.
3. **Data Provenance**:
   - Data origin indicators clearly distinguish between live IMD feeds, synthetic test projections, and historical Kerala/NER datasets.

---

## 4. Frontend & Backend Architecture Integration

```
+-------------------------------------------------------------------------+
|                              REACT FRONTEND                             |
|    (Single-Page App, Tailwind CSS, Lucide Icons, Leaflet GIS, Recharts) |
+-------------------------------------------------------------------------+
                                    | REST API / Auth
                                    v
+-------------------------------------------------------------------------+
|                        SPRING BOOT BACKEND (Port 8080)                  |
|    - Security (BCrypt, Role Authorization)                              |
|    - PostgreSQL 18.4 / PostGIS Spatial Persistence                      |
|    - Incident State Machine & Audit Logging                             |
|    - REST Controller API Routing                                        |
+-------------------------------------------------------------------------+
                                    | HTTP / REST (Internal Mesh)
                                    v
+-------------------------------------------------------------------------+
|                          FASTAPI ML SERVICE (Port 8000)                 |
|    - V12.1 XGBoost Model Engine                                         |
|    - SHAP Feature Importance Explainer                                  |
|    - Live IMD / AWS Telemetry Harvester & Raster Pipeline               |
+-------------------------------------------------------------------------+
```

- **Zero Direct External Calls**: The React frontend routes all API requests through the Spring Boot API gateway. Spring Boot proxies ML inference requests to the FastAPI engine and coordinates with PostgreSQL/PostGIS.

---

## 5. Verification & Test Execution Results

### 1. Frontend Build Verification
- **Command**: `npm run build` (in `frontend/react`)
- **Status**: **PASSED (0 Errors)**
- **Output**: Built production assets into `dist/` in 3.88s.

### 2. Spring Boot Unit & Integration Tests
- **Command**: `mvn test` (in `backend/springboot`)
- **Status**: **PASSED (6/6 Tests)**
- **Coverage**: Spring Security rules, JPA/H2 repository persistence, spatial query parsing, API endpoints, incident workflow, Actuator health endpoints.

### 3. ML Service Unit & Pipeline Tests
- **Command**: `python -m pytest tests/ -v` (in `ml-service`)
- **Status**: **PASSED (204/204 Tests)**
- **Coverage**: V12.1 model integrity, SHAP feature calculation, rainfall accumulation, raster feature extraction, stress handling, offline recovery, monotonicity checks.

---

## 6. Demonstration Scenario Playbook (SCENE 1 - 8)

| Scene | Name | User Action | System Response |
| :--- | :--- | :--- | :--- |
| **SCENE 1** | Baseline Awareness | Open Command Center | Displays 12 zones with green/yellow baseline indicators, live IMD telemetry pill active. |
| **SCENE 2** | Rainfall Escalation | Increase rainfall slider in Early Warning | Real-time ML inference recalculates risk; Zone Z-04 probability rises to 87.4% (`CRITICAL`). |
| **SCENE 3** | Explainable Risk | Click Zone Z-04 $\rightarrow$ SHAP Tab | Visualizes top 3 drivers: 72h Rainfall (42%), Slope Gradient (31%), Soil Saturation (18%). |
| **SCENE 4** | Prioritization | Open Stats Attention Bar | Identifies Z-04 as Top Priority; automatically recommends dispatching field report. |
| **SCENE 5** | Field Verification | Switch role to `FIELD_OFFICER` $\rightarrow$ Submit Report | Uploads ground report with photo and coordinates. Incident state shifts to `VERIFICATION`. |
| **SCENE 6** | Authority Confirmation | Switch role to `AUTHORITY` $\rightarrow$ Confirm Incident | Incident state transitions to `CONFIRMED`. System generates alert dispatch payload. |
| **SCENE 7** | Offline Resilience | Simulate FastAPI network disconnect | Spring Boot seamlessly falls back to cached risk scores and flags `DEGRADED TELEMETRY`. |
| **SCENE 8** | System Recovery | Reconnect FastAPI network | System auto-recovers, reconciles pending state, and updates live telemetry metrics. |

---

## 7. Operational Limitations & Future Scope

1. **Physical Sensor Deployment**: Live telemetry currently connects to IMD/AWS public endpoints and fallback simulators; direct IoT sensor node integration is scheduled for Phase 2.
2. **High-Resolution DEM Coverage**: High-resolution 5m DEM rasters are loaded for target validation sectors (Kerala & selected NER districts); remaining regions default to SRTM 30m coverage.
3. **SMS Gateway Integration**: Emergency alert payloads generate valid CAP XML and webhook JSON structures; live cellular SMS transport requires SMS vendor credentials in production deployment.
