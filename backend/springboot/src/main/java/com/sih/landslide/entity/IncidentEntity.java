package com.sih.landslide.entity;

import com.sih.landslide.model.enums.IncidentStatus;
import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "incidents")
public class IncidentEntity {

    @Id
    private String id;

    @Column(name = "grid_id", nullable = false)
    private String gridId;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private IncidentStatus status = IncidentStatus.NORMAL;

    @Column(name = "hazard_level", nullable = false)
    private String hazardLevel = "SAFE";

    @Column(name = "verified_by")
    private String verifiedBy;

    @Column(name = "verification_notes", columnDefinition = "TEXT")
    private String verificationNotes;

    public IncidentEntity() {}

    public IncidentEntity(String id, String gridId, IncidentStatus status, String hazardLevel) {
        this.id = id;
        this.gridId = gridId;
        this.status = status;
        this.hazardLevel = hazardLevel;
        this.createdAt = Instant.now();
        this.updatedAt = Instant.now();
    }

    public boolean transitionTo(IncidentStatus nextStatus, String actor, String notes) {
        if (!this.status.canTransitionTo(nextStatus)) {
            throw new IllegalArgumentException("Illegal state transition from " + this.status + " to " + nextStatus);
        }
        if (nextStatus == IncidentStatus.CONFIRMED && (actor == null || actor.trim().isEmpty())) {
            throw new IllegalArgumentException("ML prediction alone cannot mark incident as CONFIRMED. Requires verification officer.");
        }
        this.status = nextStatus;
        this.updatedAt = Instant.now();
        if (actor != null) this.verifiedBy = actor;
        if (notes != null) this.verificationNotes = notes;
        return true;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getGridId() { return gridId; }
    public void setGridId(String gridId) { this.gridId = gridId; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }

    public IncidentStatus getStatus() { return status; }
    public void setStatus(IncidentStatus status) { this.status = status; }

    public String getHazardLevel() { return hazardLevel; }
    public void setHazardLevel(String hazardLevel) { this.hazardLevel = hazardLevel; }

    public String getVerifiedBy() { return verifiedBy; }
    public void setVerifiedBy(String verifiedBy) { this.verifiedBy = verifiedBy; }

    public String getVerificationNotes() { return verificationNotes; }
    public void setVerificationNotes(String verificationNotes) { this.verificationNotes = verificationNotes; }
}
