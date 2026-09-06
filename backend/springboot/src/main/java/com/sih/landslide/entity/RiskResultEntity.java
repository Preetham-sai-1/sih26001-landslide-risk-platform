package com.sih.landslide.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "risk_results")
public class RiskResultEntity {

    @Id
    private String id;

    @Column(name = "grid_id", nullable = false)
    private String gridId;

    @Column(nullable = false)
    private Instant timestamp = Instant.now();

    @Column(name = "probability_pct", nullable = false)
    private Double probabilityPct;

    @Column(name = "calibrated_probability", nullable = false)
    private Double calibratedProbability;

    @Column(name = "risk_level", nullable = false)
    private String riskLevel;

    @Column(name = "model_version", nullable = false)
    private String modelVersion;

    @Column(name = "top_factor")
    private String topFactor;

    @Column(name = "idempotency_hash", unique = true)
    private String idempotencyHash;

    public RiskResultEntity() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getGridId() { return gridId; }
    public void setGridId(String gridId) { this.gridId = gridId; }

    public Instant getTimestamp() { return timestamp; }
    public void setTimestamp(Instant timestamp) { this.timestamp = timestamp; }

    public Double getProbabilityPct() { return probabilityPct; }
    public void setProbabilityPct(Double probabilityPct) { this.probabilityPct = probabilityPct; }

    public Double getCalibratedProbability() { return calibratedProbability; }
    public void setCalibratedProbability(Double calibratedProbability) { this.calibratedProbability = calibratedProbability; }

    public String getRiskLevel() { return riskLevel; }
    public void setRiskLevel(String riskLevel) { this.riskLevel = riskLevel; }

    public String getModelVersion() { return modelVersion; }
    public void setModelVersion(String modelVersion) { this.modelVersion = modelVersion; }

    public String getTopFactor() { return topFactor; }
    public void setTopFactor(String topFactor) { this.topFactor = topFactor; }

    public String getIdempotencyHash() { return idempotencyHash; }
    public void setIdempotencyHash(String idempotencyHash) { this.idempotencyHash = idempotencyHash; }
}
