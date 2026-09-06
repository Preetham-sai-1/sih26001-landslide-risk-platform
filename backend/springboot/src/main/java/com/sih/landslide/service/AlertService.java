package com.sih.landslide.service;

import com.sih.landslide.entity.AlertEntity;
import com.sih.landslide.entity.AuditLogEntity;
import com.sih.landslide.repository.AlertRepository;
import com.sih.landslide.repository.AuditLogRepository;
import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Service;

import java.security.MessageDigest;
import java.time.Instant;
import java.util.*;

@Service
public class AlertService {

    private final AlertRepository alertRepository;
    private final AuditLogRepository auditLogRepository;

    public AlertService(AlertRepository alertRepository, AuditLogRepository auditLogRepository) {
        this.alertRepository = alertRepository;
        this.auditLogRepository = auditLogRepository;
    }

    @PostConstruct
    public void initSeedData() {
        if (alertRepository.count() == 0) {
            AlertEntity alert = new AlertEntity();
            alert.setId("ALT-2026-8801");
            alert.setTimestamp(Instant.now());
            alert.setTargetState("Assam");
            alert.setTargetDistrict("Dima Hasao");
            alert.setHazardLevel("VERY HIGH");
            alert.setSmsSent(14250);
            alert.setSmsDelivered(13980);
            alert.setVoiceDispatched(14250);
            alert.setVoiceAnsweredPct(86.4);
            alert.setMessage("EMERGENCY LANDSLIDE ALERT: Very High Risk in Dima Hasao (Haflong Sector). Move to designated shelters.");
            alert.setStatus("Completed (Broadcast Delivered)");
            alert.setIdempotencyHash(computeHash("Assam-Dima Hasao-VERY HIGH-EMERGENCY LANDSLIDE ALERT"));
            alertRepository.save(alert);

            auditLogRepository.save(new AuditLogEntity(
                Instant.now(),
                "DATABASE_INIT",
                "SEED_ALERT_DISPATCH",
                "System",
                "Initialized baseline emergency broadcast dispatch record"
            ));
        }
    }

    public Map<String, Object> getAllAlerts() {
        List<AlertEntity> list = alertRepository.findAllByOrderByTimestampDesc();
        Map<String, Object> result = new HashMap<>();
        result.put("count", list.size());
        result.put("alerts", list);
        result.put("source", "Spring Boot Enterprise Database");
        return result;
    }

    public Map<String, Object> dispatchAlert(AlertEntity alert, String requestId) {
        String hashKey = (requestId != null && !requestId.isEmpty()) ? requestId :
                         alert.getTargetState() + "-" + alert.getTargetDistrict() + "-" + alert.getHazardLevel() + "-" + alert.getMessage();
        String hash = computeHash(hashKey);

        Optional<AlertEntity> existing = alertRepository.findByIdempotencyHash(hash);
        if (existing.isPresent()) {
            Map<String, Object> dupResponse = new HashMap<>();
            dupResponse.put("message", "Idempotent request: duplicate alert dispatch prevented");
            dupResponse.put("dispatch_log", existing.get());
            dupResponse.put("is_duplicate", true);
            return dupResponse;
        }

        if (alert.getId() == null || alert.getId().isEmpty()) {
            alert.setId("ALT-2026-" + (8801 + alertRepository.count()));
        }
        if (alert.getTimestamp() == null) {
            alert.setTimestamp(Instant.now());
        }
        int target = "Dima Hasao".equalsIgnoreCase(alert.getTargetDistrict()) ? 14250 : 9500;
        if (alert.getSmsSent() == null) alert.setSmsSent(target);
        if (alert.getSmsDelivered() == null) alert.setSmsDelivered((int) (target * 0.98));
        if (alert.getVoiceDispatched() == null) alert.setVoiceDispatched(target);
        if (alert.getVoiceAnsweredPct() == null) alert.setVoiceAnsweredPct(84.5);
        if (alert.getStatus() == null) alert.setStatus("Completed (Broadcast Delivered)");
        alert.setIdempotencyHash(hash);

        AlertEntity saved = alertRepository.save(alert);

        auditLogRepository.save(new AuditLogEntity(
            Instant.now(),
            "ALERT_DISPATCH",
            "DISPATCH_BROADCAST",
            "Spring Boot Disaster Cell Officer",
            "Dispatched " + saved.getHazardLevel() + " alert to " + saved.getTargetDistrict() + ", " + saved.getTargetState()
        ));

        Map<String, Object> response = new HashMap<>();
        response.put("message", "Broadcast alert dispatched to " + saved.getTargetDistrict() + ", " + saved.getTargetState() + " and logged in DB");
        response.put("dispatch_log", saved);
        response.put("is_duplicate", false);
        return response;
    }

    public List<AuditLogEntity> getAuditLogs() {
        return auditLogRepository.findAllByOrderByIdDesc();
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
