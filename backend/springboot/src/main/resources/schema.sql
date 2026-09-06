-- SIH 2026 Production Schema Initialization
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    role VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE TABLE IF NOT EXISTS zones (
    grid_id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    state VARCHAR(100) NOT NULL,
    district VARCHAR(100) NOT NULL,
    villages INT DEFAULT 0,
    population INT DEFAULT 0,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    elevation_m DOUBLE PRECISION NOT NULL,
    slope_deg DOUBLE PRECISION NOT NULL,
    aspect_deg DOUBLE PRECISION NOT NULL,
    curvature DOUBLE PRECISION NOT NULL,
    risk_level VARCHAR(50) NOT NULL,
    risk_score DOUBLE PRECISION NOT NULL
);

CREATE TABLE IF NOT EXISTS risk_results (
    id VARCHAR(64) PRIMARY KEY,
    grid_id VARCHAR(64) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    probability_pct DOUBLE PRECISION NOT NULL,
    calibrated_probability DOUBLE PRECISION NOT NULL,
    risk_level VARCHAR(50) NOT NULL,
    model_version VARCHAR(100) NOT NULL,
    top_factor VARCHAR(255),
    idempotency_hash VARCHAR(64) UNIQUE
);

CREATE TABLE IF NOT EXISTS alerts (
    id VARCHAR(64) PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    target_state VARCHAR(100) NOT NULL,
    target_district VARCHAR(100) NOT NULL,
    hazard_level VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR(50) NOT NULL,
    sms_sent INT DEFAULT 0,
    sms_delivered INT DEFAULT 0,
    voice_dispatched INT DEFAULT 0,
    voice_answered_pct DOUBLE PRECISION DEFAULT 0.0,
    idempotency_hash VARCHAR(64) UNIQUE
);

CREATE TABLE IF NOT EXISTS incidents (
    id VARCHAR(64) PRIMARY KEY,
    grid_id VARCHAR(64) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(50) NOT NULL,
    hazard_level VARCHAR(50) NOT NULL,
    verified_by VARCHAR(100),
    verification_notes TEXT
);

CREATE TABLE IF NOT EXISTS field_reports (
    id VARCHAR(64) PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    location_name VARCHAR(255) NOT NULL,
    state VARCHAR(100) NOT NULL,
    district VARCHAR(100) NOT NULL,
    incident_type VARCHAR(100) NOT NULL,
    severity VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL,
    notes TEXT,
    reporter_name VARCHAR(150),
    photo_url VARCHAR(500),
    idempotency_hash VARCHAR(64) UNIQUE
);

CREATE TABLE IF NOT EXISTS notifications (
    id VARCHAR(64) PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    recipient VARCHAR(150) NOT NULL,
    channel VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR(50) NOT NULL
);

CREATE TABLE IF NOT EXISTS sensor_readings (
    id VARCHAR(64) PRIMARY KEY,
    station_id VARCHAR(100) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    rainfall_1h_mm DOUBLE PRECISION DEFAULT 0.0,
    rainfall_24h_mm DOUBLE PRECISION DEFAULT 0.0,
    temperature_c DOUBLE PRECISION DEFAULT 0.0,
    humidity_pct DOUBLE PRECISION DEFAULT 0.0
);

CREATE TABLE IF NOT EXISTS sync_records (
    id VARCHAR(64) PRIMARY KEY,
    sync_time TIMESTAMP WITH TIME ZONE NOT NULL,
    source_system VARCHAR(100) NOT NULL,
    records_synced INT NOT NULL,
    status VARCHAR(50) NOT NULL,
    idempotency_hash VARCHAR(64) UNIQUE
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGSERIAL PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    action VARCHAR(100) NOT NULL,
    actor VARCHAR(150) NOT NULL,
    details TEXT
);
