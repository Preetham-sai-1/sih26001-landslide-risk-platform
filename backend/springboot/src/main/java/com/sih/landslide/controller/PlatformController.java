package com.sih.landslide.controller;

import com.sih.landslide.dto.ApiResponseDTO;
import com.sih.landslide.service.AlertService;
import com.sih.landslide.service.FastApiProxyService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/v1")
@CrossOrigin(origins = "*")
public class PlatformController {

    private final FastApiProxyService proxyService;
    private final AlertService alertService;

    public PlatformController(FastApiProxyService proxyService, AlertService alertService) {
        this.proxyService = proxyService;
        this.alertService = alertService;
    }

    @GetMapping("/health")
    public ResponseEntity<ApiResponseDTO<Object>> getHealth() {
        Map<String, Object> response = new HashMap<>();
        response.put("service", "sih-landslide-springboot-backend");
        response.put("status", "UP");
        response.put("architecture", "React -> Spring Boot -> PostgreSQL 18 & FastAPI ML Engine");
        response.put("fastapi_health", proxyService.getFromFastApi("/health"));
        response.put("timestamp", new Date().toString());
        return ResponseEntity.ok(ApiResponseDTO.ok(response));
    }

    @GetMapping("/stats")
    public ResponseEntity<ApiResponseDTO<Object>> getStats() {
        Object stats = proxyService.getFromFastApi("/stats");
        return ResponseEntity.ok(ApiResponseDTO.ok(stats));
    }

    @GetMapping("/audit-logs")
    public ResponseEntity<ApiResponseDTO<Object>> getAuditLogs() {
        return ResponseEntity.ok(ApiResponseDTO.ok(alertService.getAuditLogs()));
    }
}
