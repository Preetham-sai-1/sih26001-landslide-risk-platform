package com.sih.landslide.entity;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "field_reports")
public class FieldReportEntity {

    @Id
    private String id;

    @Column(nullable = false)
    private Instant timestamp = Instant.now();

    @Column(nullable = false)
    private Double latitude;

    @Column(nullable = false)
    private Double longitude;

    @Column(name = "location_name", nullable = false)
    @JsonProperty("location_name")
    @JsonAlias({"locationName", "location_name"})
    private String locationName;

    @Column(nullable = false)
    private String state;

    @Column(nullable = false)
    private String district;

    @Column(name = "incident_type", nullable = false)
    @JsonProperty("incident_type")
    @JsonAlias({"incidentType", "incident_type"})
    private String incidentType;

    @Column(nullable = false)
    private String severity;

    @Column(nullable = false)
    private String status;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "reporter_name")
    @JsonProperty("reporter_name")
    @JsonAlias({"reporterName", "reporter_name"})
    private String reporterName;

    @Column(name = "photo_url")
    @JsonProperty("photo_url")
    @JsonAlias({"photoUrl", "photo_url"})
    private String photoUrl;

    @Column(name = "idempotency_hash", unique = true)
    private String idempotencyHash;

    public FieldReportEntity() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public Instant getTimestamp() { return timestamp; }
    public void setTimestamp(Instant timestamp) { this.timestamp = timestamp; }

    public Double getLatitude() { return latitude; }
    public void setLatitude(Double latitude) { this.latitude = latitude; }

    public Double getLongitude() { return longitude; }
    public void setLongitude(Double longitude) { this.longitude = longitude; }

    public String getLocationName() { return locationName; }
    public void setLocationName(String locationName) { this.locationName = locationName; }

    public String getState() { return state; }
    public void setState(String state) { this.state = state; }

    public String getDistrict() { return district; }
    public void setDistrict(String district) { this.district = district; }

    public String getIncidentType() { return incidentType; }
    public void setIncidentType(String incidentType) { this.incidentType = incidentType; }

    public String getSeverity() { return severity; }
    public void setSeverity(String severity) { this.severity = severity; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public String getReporterName() { return reporterName; }
    public void setReporterName(String reporterName) { this.reporterName = reporterName; }

    public String getPhotoUrl() { return photoUrl; }
    public void setPhotoUrl(String photoUrl) { this.photoUrl = photoUrl; }

    public String getIdempotencyHash() { return idempotencyHash; }
    public void setIdempotencyHash(String idempotencyHash) { this.idempotencyHash = idempotencyHash; }
}
