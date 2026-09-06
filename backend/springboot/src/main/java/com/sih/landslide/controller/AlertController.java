package com.sih.landslide.controller;

import com.sih.landslide.dto.ApiResponseDTO;
import com.sih.landslide.entity.AlertEntity;
import com.sih.landslide.service.AlertService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/alerts")
@CrossOrigin(origins = "*")
public class AlertController {

    private final AlertService alertService;

    public AlertController(AlertService alertService) {
        this.alertService = alertService;
    }

    @GetMapping
    public ResponseEntity<ApiResponseDTO<Object>> getAlerts() {
        return ResponseEntity.ok(ApiResponseDTO.ok(alertService.getAllAlerts()));
    }

    @PostMapping("/dispatch")
    public ResponseEntity<ApiResponseDTO<Object>> dispatchAlert(
            @RequestBody AlertEntity alert,
            @RequestHeader(value = "X-Request-ID", required = false) String requestId) {
        Object result = alertService.dispatchAlert(alert, requestId);
        return ResponseEntity.ok(ApiResponseDTO.ok(result));
    }
}
