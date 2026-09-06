package com.sih.landslide.service;

import com.sih.landslide.entity.AuditLogEntity;
import com.sih.landslide.entity.IncidentEntity;
import com.sih.landslide.model.enums.IncidentStatus;
import com.sih.landslide.repository.AuditLogRepository;
import com.sih.landslide.repository.IncidentRepository;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Service
public class IncidentService {

    private final IncidentRepository incidentRepository;
    private final AuditLogRepository auditLogRepository;

    public IncidentService(IncidentRepository incidentRepository, AuditLogRepository auditLogRepository) {
        this.incidentRepository = incidentRepository;
        this.auditLogRepository = auditLogRepository;
    }

    public IncidentEntity getOrCreateIncident(String gridId, String hazardLevel) {
        Optional<IncidentEntity> existing = incidentRepository.findByGridId(gridId);
        if (existing.isPresent()) {
            return existing.get();
        }
        IncidentStatus initialStatus = "CRITICAL".equalsIgnoreCase(hazardLevel) ? IncidentStatus.CRITICAL :
                                        "HIGH".equalsIgnoreCase(hazardLevel) ? IncidentStatus.HIGH :
                                        "VERY HIGH".equalsIgnoreCase(hazardLevel) ? IncidentStatus.HIGH :
                                        "MODERATE".equalsIgnoreCase(hazardLevel) ? IncidentStatus.WATCH : IncidentStatus.NORMAL;

        IncidentEntity incident = new IncidentEntity("INC-" + gridId, gridId, initialStatus, hazardLevel);
        IncidentEntity saved = incidentRepository.save(incident);

        auditLogRepository.save(new AuditLogEntity(
            Instant.now(),
            "INCIDENT_CREATED",
            "CREATE_INCIDENT",
            "System ML Engine",
            "Created incident " + saved.getId() + " for grid " + gridId + " with status " + saved.getStatus()
        ));

        return saved;
    }

    public IncidentEntity transitionIncident(String gridId, IncidentStatus targetStatus, String actor, String notes) {
        IncidentEntity incident = incidentRepository.findByGridId(gridId)
                .orElseGet(() -> getOrCreateIncident(gridId, "MODERATE"));

        IncidentStatus oldStatus = incident.getStatus();
        incident.transitionTo(targetStatus, actor, notes);
        IncidentEntity saved = incidentRepository.save(incident);

        auditLogRepository.save(new AuditLogEntity(
            Instant.now(),
            "INCIDENT_TRANSITION",
            "TRANSITION_" + oldStatus + "_TO_" + targetStatus,
            actor != null ? actor : "Officer",
            "Incident " + saved.getId() + " transitioned from " + oldStatus + " to " + targetStatus + ". Notes: " + notes
        ));

        return saved;
    }

    public List<IncidentEntity> getAllIncidents() {
        return incidentRepository.findAll();
    }
}
