package com.sih.landslide.controller;

import com.sih.landslide.service.FastApiProxyService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/v1/spring")
@CrossOrigin(origins = "*")
public class LandslideProxyController {

    private final FastApiProxyService proxyService;

    public LandslideProxyController(FastApiProxyService proxyService) {
        this.proxyService = proxyService;
    }

    public LandslideProxyController() {
        this.proxyService = null;
    }

    @GetMapping("/health")
    public Map<String, Object> springHealthCheck() {
        Map<String, Object> response = new HashMap<>();
        response.put("service", "sih-landslide-springboot-backend");
        response.put("status", "UP");
        response.put("architecture", "React -> Spring Boot -> PostgreSQL/PostGIS & FastAPI ML Engine");
        response.put("timestamp", new Date().toString());
        return response;
    }

    @GetMapping("/zones")
    public ResponseEntity<Object> proxyZones(
            @RequestParam(required = false) String state,
            @RequestParam(required = false) String risk_level) {
        StringBuilder query = new StringBuilder("/zones");
        if (state != null || risk_level != null) {
            query.append("?state=").append(state != null ? state : "").append("&risk_level=").append(risk_level != null ? risk_level : "");
        }
        if (proxyService != null) {
            return ResponseEntity.ok(proxyService.getFromFastApi(query.toString()));
        }
        Map<String, Object> fallback = new HashMap<>();
        fallback.put("status", "OFFLINE_FALLBACK");
        return ResponseEntity.status(503).body(fallback);
    }

    @GetMapping("/ml/predict/{gridId}")
    public ResponseEntity<Object> proxyMlPredict(
            @PathVariable String gridId,
            @RequestParam(defaultValue = "0.0") Double live_r1h,
            @RequestParam(defaultValue = "0.0") Double surge_mm) {
        String path = "/ml/predict/" + gridId + "?live_r1h=" + live_r1h + "&surge_mm=" + surge_mm;
        if (proxyService != null) {
            return ResponseEntity.ok(proxyService.getFromFastApi(path));
        }
        Map<String, Object> fallback = new HashMap<>();
        fallback.put("grid_id", gridId);
        fallback.put("risk_level", "VERY HIGH");
        return ResponseEntity.ok(fallback);
    }
}
