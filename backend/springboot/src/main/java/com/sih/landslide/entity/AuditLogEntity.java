package com.sih.landslide.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "audit_logs")
public class AuditLogEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Instant timestamp = Instant.now();

    @Column(name = "event_type", nullable = false)
    private String eventType;

    @Column(nullable = false)
    private String action;

    @Column(nullable = false)
    private String actor;

    @Column(columnDefinition = "TEXT")
    private String details;

    public AuditLogEntity() {}

    public AuditLogEntity(Instant timestamp, String eventType, String action, String actor, String details) {
        this.timestamp = timestamp != null ? timestamp : Instant.now();
        this.eventType = eventType;
        this.action = action;
        this.actor = actor;
        this.details = details;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Instant getTimestamp() { return timestamp; }
    public void setTimestamp(Instant timestamp) { this.timestamp = timestamp; }

    public String getEventType() { return eventType; }
    public void setEventType(String eventType) { this.eventType = eventType; }

    public String getAction() { return action; }
    public void setAction(String action) { this.action = action; }

    public String getActor() { return actor; }
    public void setActor(String actor) { this.actor = actor; }

    public String getDetails() { return details; }
    public void setDetails(String details) { this.details = details; }
}
