package com.sih.landslide.controller;

import com.sih.landslide.dto.ApiResponseDTO;
import com.sih.landslide.service.FastApiProxyService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auto-alerts")
@CrossOrigin(origins = "*")
public class AutoAlertController {

    private final FastApiProxyService proxyService;

    public AutoAlertController(FastApiProxyService proxyService) {
        this.proxyService = proxyService;
    }

    @GetMapping
    public ResponseEntity<ApiResponseDTO<Object>> getAutoAlerts() {
        return ResponseEntity.ok(ApiResponseDTO.ok(proxyService.getFromFastApi("/auto-alerts")));
    }

    @PostMapping("/evaluate")
    public ResponseEntity<ApiResponseDTO<Object>> evaluateAutoAlert(@RequestBody Object body) {
        return ResponseEntity.ok(ApiResponseDTO.ok(proxyService.postToFastApi("/auto-alerts/evaluate", body)));
    }

    @PostMapping("/{alertId}/acknowledge")
    public ResponseEntity<ApiResponseDTO<Object>> acknowledgeAutoAlert(@PathVariable String alertId) {
        return ResponseEntity.ok(ApiResponseDTO.ok(proxyService.postToFastApi("/auto-alerts/" + alertId + "/acknowledge", new Object())));
    }

    @PostMapping("/{alertId}/resolve")
    public ResponseEntity<ApiResponseDTO<Object>> resolveAutoAlert(@PathVariable String alertId) {
        return ResponseEntity.ok(ApiResponseDTO.ok(proxyService.postToFastApi("/auto-alerts/" + alertId + "/resolve", new Object())));
    }

    @PostMapping("/toggle")
    public ResponseEntity<ApiResponseDTO<Object>> toggleAutoAlerting(@RequestParam boolean enabled) {
        return ResponseEntity.ok(ApiResponseDTO.ok(proxyService.postToFastApi("/auto-alerts/toggle?enabled=" + enabled, new Object())));
    }

    @PostMapping("/demo-sequence")
    public ResponseEntity<ApiResponseDTO<Object>> runDemoSequence(@RequestParam(defaultValue = "ner_grid_056061") String grid_id) {
        return ResponseEntity.ok(ApiResponseDTO.ok(proxyService.postToFastApi("/auto-alerts/demo-sequence?grid_id=" + grid_id, new Object())));
    }
}
