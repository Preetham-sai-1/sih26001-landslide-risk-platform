package com.sih.landslide.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "sync_records")
public class SyncRecordEntity {

    @Id
    private String id;

    @Column(name = "sync_time", nullable = false)
    private Instant syncTime = Instant.now();

    @Column(name = "source_system", nullable = false)
    private String sourceSystem;

    @Column(name = "records_synced", nullable = false)
    private Integer recordsSynced;

    @Column(nullable = false)
    private String status;

    @Column(name = "idempotency_hash", unique = true)
    private String idempotencyHash;

    public SyncRecordEntity() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public Instant getSyncTime() { return syncTime; }
    public void setSyncTime(Instant syncTime) { this.syncTime = syncTime; }

    public String getSourceSystem() { return sourceSystem; }
    public void setSourceSystem(String sourceSystem) { this.sourceSystem = sourceSystem; }

    public Integer getRecordsSynced() { return recordsSynced; }
    public void setRecordsSynced(Integer recordsSynced) { this.recordsSynced = recordsSynced; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getIdempotencyHash() { return idempotencyHash; }
    public void setIdempotencyHash(String idempotencyHash) { this.idempotencyHash = idempotencyHash; }
}
