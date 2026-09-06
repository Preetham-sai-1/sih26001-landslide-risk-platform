package com.sih.landslide.controller;

import com.sih.landslide.dto.ApiResponseDTO;
import com.sih.landslide.entity.IncidentEntity;
import com.sih.landslide.model.enums.IncidentStatus;
import com.sih.landslide.service.IncidentService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/api/v1/incidents")
@CrossOrigin(origins = "*")
public class IncidentController {

    private final IncidentService incidentService;

    public IncidentController(IncidentService incidentService) {
        this.incidentService = incidentService;
    }

    @GetMapping
    public ResponseEntity<ApiResponseDTO<List<IncidentEntity>>> getIncidents() {
        List<IncidentEntity> list = incidentService.getAllIncidents();
        return ResponseEntity.ok(ApiResponseDTO.ok(list));
    }

    @PostMapping("/{gridId}/verify")
    public ResponseEntity<ApiResponseDTO<IncidentEntity>> verifyIncident(
            @PathVariable String gridId,
            @RequestParam IncidentStatus targetStatus,
            @RequestParam(required = false) String notes,
            Principal principal) {
        String actor = principal != null ? principal.getName() : "Field Verification Officer";
        IncidentEntity updated = incidentService.transitionIncident(gridId, targetStatus, actor, notes);
        return ResponseEntity.ok(ApiResponseDTO.ok(updated));
    }
}
