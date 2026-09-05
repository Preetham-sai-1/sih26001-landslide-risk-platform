# Architecture

Status: **planning document**. Describes the intended architecture for
SIH26001. Nothing described here is implemented yet unless explicitly
marked "Implemented".

## 1. Goals and Non-Goals

**Goals**
- Estimate landslide risk per monitoring zone from historical, rainfall,
  terrain, and satellite/environmental features.
- Present that risk on a GIS dashboard for authorities.
- Generate alerts (SMS, voice call) when risk is elevated, using a
  channel abstraction so new channels can be added later.
- Distinguish "we lost contact with a zone" from "a zone is at high risk"
  and never conflate the two.
- Continue functioning, in a degraded but honest way, when connectivity
  is lost — using cached/last-known state and store-and-forward sync.

**Non-goals (explicitly out of scope for the MVP)**
- Real-time seismic-grade sensing.
- Guaranteed detection of every landslide (no system can offer this).
- Dependence on physical edge hardware — ESP32 integration is optional
  and additive, not required for the system to run.
- Any claim of certified, production-grade early-warning accuracy.

## 2. Service Overview

```
┌─────────────────────┐
│ React + TypeScript   │  Authority dashboard, Leaflet map, zone risk view,
│ + Leaflet             │  alert history, SHAP explanation view
└─────────┬────────────┘
          │ REST (HTTPS)
┌─────────▼────────────┐
│ Spring Boot            │  Auth (Spring Security), zone/user/alert
│ + Spring Security       │  persistence (JPA/Hibernate), orchestration of
│ + JPA/Hibernate         │  ML calls, alert dispatch, connectivity-anomaly
│                         │  logic, offline cache + store-and-forward sync
└─────────┬────────────┘
          │ REST (internal)
┌─────────▼────────────┐
│ FastAPI ML Service     │  Loads trained model artifacts, serves risk
│                         │  predictions + calibrated probabilities +
│                         │  SHAP explanations per request
└─────────┬────────────┘
          │ (offline, not request-time)
┌─────────▼────────────┐
│ Python ML Pipeline      │  Ingestion, feature engineering, training,
│ (ml-service/src)         │  evaluation, calibration — run offline/on a
│                          │  schedule, not per API request
└──────────────────────┘

PostgreSQL + PostGIS: shared spatial data store used by Spring Boot
(zones, alerts, users, connectivity events, sync queue) and referenced by
the ML pipeline for zone geometry/feature joins.
```

Each service is independently deployable and communicates over REST. The
FastAPI service does not talk to the database directly in the current
plan — Spring Boot owns persistence and orchestration; FastAPI is a
stateless model-serving layer. This keeps the ML service simple to
redeploy/retrain without touching orchestration logic, and keeps a single
service (Spring Boot) responsible for auth and data integrity.

*This is a design decision, not yet validated against real load — revisit
if the FastAPI service ends up needing zone geometry directly (e.g. for
on-the-fly feature computation) rather than receiving pre-computed
features from Spring Boot or the ML pipeline's processed data.*

## 3. Backend (Spring Boot) Responsibilities

- Authentication and role-based access (Spring Security) — e.g. authority
  users vs. administrators. Exact roles are TBD and will be documented
  here once defined; not invented in advance.
- Zone, alert, user, connectivity-event, and sync-queue persistence
  (JPA/Hibernate over PostgreSQL/PostGIS).
- Calling the FastAPI ML service for risk predictions and caching the
  latest result per zone.
- Alert-channel orchestration: SMS and automated voice call, dispatched
  through a common `AlertChannel` abstraction (see §6) so a channel can be
  added (e.g. cell broadcast, satellite messaging) without changing
  calling code.
- Connectivity anomaly detection and the verification-alert state machine
  (see §5).
- Offline/store-and-forward logic: queuing alerts and state changes
  generated while a zone or the platform itself is unreachable, and
  syncing them once connectivity is restored.

## 4. ML Service (FastAPI) Responsibilities

- Load a trained, versioned model artifact (see `docs/validation_strategy.md`
  for how "trained" is defined and validated).
- Accept a feature vector (or zone identifier resolved to features
  upstream) and return:
  - a predicted risk class or calibrated probability,
  - a model/version identifier,
  - a SHAP-based explanation for that specific prediction.
- Expose a health/readiness endpoint distinct from the prediction endpoint
  so Spring Boot can distinguish "model service is up but has no model
  loaded yet" from "model service is down."
- Remain stateless per request; no persistence of its own in the current
  plan.

## 5. Connectivity Anomaly vs. Landslide Inference

This is the single most important product-logic rule in the system and it
is intentionally kept explicit and centralized rather than implicit in
alerting code.

**Rule:** Loss of connectivity to a zone or sensor is never, by itself,
treated as evidence that a landslide occurred.

Reasoning: connectivity loss can result from power outages, hardware
failure, network/backhaul issues, terrain-related signal loss, or routine
maintenance — none of which imply ground movement. Treating "silence" as
"disaster" would produce a large volume of false alarms and would erode
trust in the alerting system, which is itself a safety risk.

State model (planning-level, to be refined during backend implementation):

| ML Risk Level | Connectivity State | Resulting State |
|---|---|---|
| Low/Moderate | Normal | Routine monitoring |
| Low/Moderate | Anomalous (unexpected silence) | Connectivity/infrastructure event — logged, not escalated as disaster |
| High/Critical | Normal | High-risk alert, standard alerting path |
| High/Critical | Anomalous (unexpected silence) | **Priority Verification Alert** — highest urgency, explicitly flagged for human verification (e.g. field check, alternate sensor, neighboring zone data) rather than auto-declared as a confirmed landslide |

"Connectivity anomaly" itself needs a concrete definition (e.g. missed
heartbeat threshold, expected reporting interval per zone/device). That
definition is an open item — see `docs/data_strategy.md` §"Open
Assumptions" — and will be made configurable rather than hard-coded once
decided, since it will likely vary by zone/device type.

## 6. Alert Channel Abstraction

Alert delivery is designed behind a common interface so the initial two
channels (SMS, automated voice call) do not hard-wire the rest of the
system to a specific provider or transport:

```
AlertChannel (interface)
 ├── SmsAlertChannel
 ├── VoiceCallAlertChannel
 └── (future) CellBroadcastAlertChannel, SatelliteAlertChannel, ...
```

Each implementation is responsible for taking a structured alert payload
(zone, risk level, verification status, timestamp) and delivering it
through its transport. Provider selection (which SMS/voice gateway) is a
configuration/environment concern, not hard-coded, and no specific
provider is chosen in this document — that is an open item pending
provider access/credentials.

## 7. Offline Support and Store-and-Forward Sync

- **Cached / last-known state:** the dashboard and backend must be able to
  show the last successfully retrieved risk state for a zone, clearly
  labeled with its timestamp, when a fresh read is unavailable.
- **Store-and-forward:** actions generated while disconnected (e.g. an
  alert that should have been dispatched, a manual verification entered
  by a field responder) are queued locally/at the edge and synchronized
  once connectivity returns, rather than lost.
- Exact queue implementation (local DB table vs. message queue) is an
  implementation decision to be made during backend build-out, not fixed
  here.

## 8. Optional Edge Layer (ESP32)

An optional edge layer using ESP32 with tilt, soil moisture, and vibration
sensors may be integrated later to supplement satellite/rainfall/terrain
features with ground-truth sensor data. The MVP core (ML risk model + GIS
dashboard + alerting) must function completely without any edge hardware.
The edge layer, if built, will report through the same connectivity/sync
model described in §5 and §7 rather than a separate path.

## 9. GIS Data Flow

```
gis/raw          → original shapefiles/rasters as received, unmodified
gis/processed     → reprojected/cleaned layers (consistent CRS, validated geometry)
gis/zones         → final monitoring zone boundary definitions used by the
                     ML pipeline (feature aggregation per zone) and the
                     backend (zone records in PostGIS)
```

No specific CRS, zone boundaries, or geographic coordinates are defined in
this document — those depend on the actual study area and data sources,
which have not yet been selected. See `docs/data_strategy.md`.

## 10. Open Architectural Questions (tracked, not resolved here)

- Exact database schema for zones/alerts/users/connectivity events.
- Whether FastAPI ever needs direct PostGIS access (see §2).
- Concrete definition of "connectivity anomaly" per zone/device (see §5).
- SMS/voice provider selection and credential handling.
- Model retraining cadence and deployment process for new model artifacts.

These will be resolved and documented here (or in a linked ADR) as they
are decided — not assumed in advance.
