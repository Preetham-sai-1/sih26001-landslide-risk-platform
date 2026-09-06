package com.sih.landslide.controller;

import com.sih.landslide.dto.ApiResponseDTO;
import com.sih.landslide.service.SyncService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/sync")
@CrossOrigin(origins = "*")
public class SyncController {

    private final SyncService syncService;

    public SyncController(SyncService syncService) {
        this.syncService = syncService;
    }

    @PostMapping
    public ResponseEntity<ApiResponseDTO<Object>> triggerSync(
            @RequestParam(defaultValue = "IMD_AWS_TELEMETRY") String source,
            @RequestParam(defaultValue = "50") int count,
            @RequestHeader(value = "X-Request-ID", required = false) String requestId) {
        Object result = syncService.executeSync(source, count, requestId);
        return ResponseEntity.ok(ApiResponseDTO.ok(result));
    }
}
