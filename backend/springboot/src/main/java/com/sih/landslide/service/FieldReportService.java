package com.sih.landslide.service;

import com.sih.landslide.entity.AuditLogEntity;
import com.sih.landslide.entity.FieldReportEntity;
import com.sih.landslide.repository.AuditLogRepository;
import com.sih.landslide.repository.FieldReportRepository;
import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Service;

import java.security.MessageDigest;
import java.time.Instant;
import java.util.*;

@Service
public class FieldReportService {

    private final FieldReportRepository fieldReportRepository;
    private final AuditLogRepository auditLogRepository;

    public FieldReportService(FieldReportRepository fieldReportRepository, AuditLogRepository auditLogRepository) {
        this.fieldReportRepository = fieldReportRepository;
        this.auditLogRepository = auditLogRepository;
    }

    @PostConstruct
    public void initSeedData() {
        if (fieldReportRepository.count() == 0) {
            FieldReportEntity fr1 = new FieldReportEntity();
            fr1.setId("FR-2026-001");
            fr1.setTimestamp(Instant.now());
            fr1.setLatitude(25.1884);
            fr1.setLongitude(93.0197);
            fr1.setLocationName("Haflong Hill Road, Dima Hasao");
            fr1.setState("Assam");
            fr1.setDistrict("Dima Hasao");
            fr1.setIncidentType("Debris Flow / Slope Crack");
            fr1.setSeverity("Critical");
            fr1.setStatus("Verified");
            fr1.setNotes("Tension cracks 15cm wide observed along upper cut-slope after heavy 7-day rainfall.");
            fr1.setReporterName("Field User - Officer Roy");
            fr1.setPhotoUrl("https://images.unsplash.com/photo-1541888946425-d0fbb186a5b7?auto=format&fit=crop&w=600&q=80");
            fr1.setIdempotencyHash(computeHash("Assam-Dima Hasao-Haflong Hill Road-Debris Flow"));
            fieldReportRepository.save(fr1);

            FieldReportEntity fr2 = new FieldReportEntity();
            fr2.setId("FR-2026-002");
            fr2.setTimestamp(Instant.now());
            fr2.setLatitude(27.586);
            fr2.setLongitude(91.866);
            fr2.setLocationName("Tawang Highway Pass NH-13");
            fr2.setState("Arunachal Pradesh");
            fr2.setDistrict("Tawang");
            fr2.setIncidentType("Rockfall Hazard");
            fr2.setSeverity("High");
            fr2.setStatus("Pending Verification");
            fr2.setNotes("Minor rockfall on highway outer lane following 24h rainfall.");
            fr2.setReporterName("Field Patrol - Inspector Tenzing");
            fr2.setPhotoUrl("https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=80");
            fr2.setIdempotencyHash(computeHash("Arunachal Pradesh-Tawang-Tawang Highway Pass-Rockfall"));
            fieldReportRepository.save(fr2);

            auditLogRepository.save(new AuditLogEntity(
                Instant.now(),
                "DATABASE_INIT",
                "SEED_FIELD_REPORTS",
                "System",
                "Initialized default field verification reports"
            ));
        }
    }

    public Map<String, Object> getAllReports() {
        List<FieldReportEntity> list = fieldReportRepository.findAllByOrderByTimestampDesc();
        Map<String, Object> result = new HashMap<>();
        result.put("count", list.size());
        result.put("reports", list);
        result.put("source", "Spring Boot Enterprise Database");
        return result;
    }

    public Map<String, Object> saveReport(FieldReportEntity report, String requestId) {
        String hashKey = (requestId != null && !requestId.isEmpty()) ? requestId :
                         report.getState() + "-" + report.getDistrict() + "-" + report.getLocationName() + "-" + report.getIncidentType();
        String hash = computeHash(hashKey);

        Optional<FieldReportEntity> existing = fieldReportRepository.findByIdempotencyHash(hash);
        if (existing.isPresent()) {
            Map<String, Object> dupResponse = new HashMap<>();
            dupResponse.put("message", "Idempotent request: duplicate report submission prevented");
            dupResponse.put("report", existing.get());
            dupResponse.put("is_duplicate", true);
            return dupResponse;
        }

        if (report.getId() == null || report.getId().isEmpty()) {
            report.setId("FR-2026-" + String.format("%03d", fieldReportRepository.count() + 1));
        }
        if (report.getTimestamp() == null) {
            report.setTimestamp(Instant.now());
        }
        if (report.getStatus() == null || report.getStatus().isEmpty()) {
            report.setStatus("Pending Verification");
        }
        if (report.getPhotoUrl() == null || report.getPhotoUrl().isEmpty()) {
            report.setPhotoUrl("https://images.unsplash.com/photo-1541888946425-d0fbb186a5b7?auto=format&fit=crop&w=600&q=80");
        }
        report.setIdempotencyHash(hash);

        FieldReportEntity saved = fieldReportRepository.save(report);

        auditLogRepository.save(new AuditLogEntity(
            Instant.now(),
            "FIELD_REPORT_SUBMISSION",
            "CREATE_REPORT",
            report.getReporterName() != null ? report.getReporterName() : "Field User",
            "Submitted report " + saved.getId() + " for " + saved.getLocationName() + " (" + saved.getState() + ")"
        ));

        Map<String, Object> response = new HashMap<>();
        response.put("message", "Field verification report submitted and persisted in Spring Boot database");
        response.put("report", saved);
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
