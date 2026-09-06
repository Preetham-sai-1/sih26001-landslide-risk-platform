package com.sih.landslide.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "zones")
public class ZoneEntity {

    @Id
    @Column(name = "grid_id")
    private String gridId;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String state;

    @Column(nullable = false)
    private String district;

    private Integer villages;
    private Integer population;

    @Column(nullable = false)
    private Double latitude;

    @Column(nullable = false)
    private Double longitude;

    @Column(name = "elevation_m", nullable = false)
    private Double elevationM;

    @Column(name = "slope_deg", nullable = false)
    private Double slopeDeg;

    @Column(name = "aspect_deg", nullable = false)
    private Double aspectDeg;

    @Column(nullable = false)
    private Double curvature;

    @Column(name = "risk_level", nullable = false)
    private String riskLevel;

    @Column(name = "risk_score", nullable = false)
    private Double riskScore;

    public ZoneEntity() {}

    public String getGridId() { return gridId; }
    public void setGridId(String gridId) { this.gridId = gridId; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getState() { return state; }
    public void setState(String state) { this.state = state; }

    public String getDistrict() { return district; }
    public void setDistrict(String district) { this.district = district; }

    public Integer getVillages() { return villages; }
    public void setVillages(Integer villages) { this.villages = villages; }

    public Integer getPopulation() { return population; }
    public void setPopulation(Integer population) { this.population = population; }

    public Double getLatitude() { return latitude; }
    public void setLatitude(Double latitude) { this.latitude = latitude; }

    public Double getLongitude() { return longitude; }
    public void setLongitude(Double longitude) { this.longitude = longitude; }

    public Double getElevationM() { return elevationM; }
    public void setElevationM(Double elevationM) { this.elevationM = elevationM; }

    public Double getSlopeDeg() { return slopeDeg; }
    public void setSlopeDeg(Double slopeDeg) { this.slopeDeg = slopeDeg; }

    public Double getAspectDeg() { return aspectDeg; }
    public void setAspectDeg(Double aspectDeg) { this.aspectDeg = aspectDeg; }

    public Double getCurvature() { return curvature; }
    public void setCurvature(Double curvature) { this.curvature = curvature; }

    public String getRiskLevel() { return riskLevel; }
    public void setRiskLevel(String riskLevel) { this.riskLevel = riskLevel; }

    public Double getRiskScore() { return riskScore; }
    public void setRiskScore(Double riskScore) { this.riskScore = riskScore; }
}
