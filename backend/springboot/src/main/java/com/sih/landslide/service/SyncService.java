package com.sih.landslide.service;

import com.sih.landslide.entity.AuditLogEntity;
import com.sih.landslide.entity.SyncRecordEntity;
import com.sih.landslide.repository.AuditLogRepository;
import com.sih.landslide.repository.SyncRecordRepository;
import org.springframework.stereotype.Service;

import java.security.MessageDigest;
import java.time.Instant;
import java.util.*;

@Service
public class SyncService {

    private final SyncRecordRepository syncRecordRepository;
    private final AuditLogRepository auditLogRepository;

    public SyncService(SyncRecordRepository syncRecordRepository, AuditLogRepository auditLogRepository) {
        this.syncRecordRepository = syncRecordRepository;
        this.auditLogRepository = auditLogRepository;
    }

    public Map<String, Object> executeSync(String sourceSystem, int recordCount, String requestId) {
        String hashKey = (requestId != null && !requestId.isEmpty()) ? requestId :
                         sourceSystem + "-" + recordCount + "-" + (Instant.now().toEpochMilli() / 60000);
        String hash = computeHash(hashKey);

        Optional<SyncRecordEntity> existing = syncRecordRepository.findByIdempotencyHash(hash);
        if (existing.isPresent()) {
            Map<String, Object> dupResponse = new HashMap<>();
            dupResponse.put("message", "Idempotent request: duplicate synchronization request prevented");
            dupResponse.put("sync_record", existing.get());
            dupResponse.put("is_duplicate", true);
            return dupResponse;
        }

        SyncRecordEntity sync = new SyncRecordEntity();
        sync.setId("SYNC-" + UUID.randomUUID().toString().substring(0, 8));
        sync.setSyncTime(Instant.now());
        sync.setSourceSystem(sourceSystem != null ? sourceSystem : "IMD_AWS_TELEMETRY");
        sync.setRecordsSynced(recordCount > 0 ? recordCount : 42);
        sync.setStatus("SUCCESS");
        sync.setIdempotencyHash(hash);

        SyncRecordEntity saved = syncRecordRepository.save(sync);

        auditLogRepository.save(new AuditLogEntity(
            Instant.now(),
            "DATA_SYNCHRONIZATION",
            "SYNC_EXECUTE",
            "Sync Manager",
            "Synchronized " + saved.getRecordsSynced() + " records from " + saved.getSourceSystem()
        ));

        Map<String, Object> response = new HashMap<>();
        response.put("message", "Data synchronization completed successfully");
        response.put("sync_record", saved);
        response.put("is_duplicate", false);
        return response;
    }

    private String computeHash(String text) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] digest = md.digest(text.getBytes());
            StringBuilder sb = new StringBuilder();
            for (byte b : digest) sb.append(String.format("%02x", b));
            return sb.toString();
        } catch (Exception e) {
            return UUID.randomUUID().toString();
        }
    }
}
