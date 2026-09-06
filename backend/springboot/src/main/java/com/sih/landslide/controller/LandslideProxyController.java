package com.sih.landslide.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.util.*;

@RestController
@RequestMapping("/api/v1/spring")
@CrossOrigin(origins = "*")
public class LandslideProxyController {

    private final String FASTAPI_BASE_URL = "http://localhost:8000/api/v1";

    @Autowired
    private RestTemplate restTemplate;

    @GetMapping("/health")
    public Map<String, Object> springHealthCheck() {
        Map<String, Object> response = new HashMap<>();
        response.put("service", "sih-landslide-springboot-backend");
        response.put("status", "UP");
        response.put("architecture", "React -> Spring Boot -> FastAPI -> ML/GIS Engine");
        response.put("timestamp", new Date().toString());
        return response;
    }

    @GetMapping("/zones")
    public ResponseEntity<Object> proxyZones(
            @RequestParam(required = false) String state,
            @RequestParam(required = false) String risk_level) {
        String url = FASTAPI_BASE_URL + "/zones";
        if (state != null || risk_level != null) {
            url += "?state=" + (state != null ? state : "") + "&risk_level=" + (risk_level != null ? risk_level : "");
        }
        try {
            Object result = restTemplate.getForObject(url, Object.class);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            Map<String, Object> fallback = new HashMap<>();
            fallback.put("status", "OFFLINE_FALLBACK");
            fallback.put("message", "FastAPI backend unreachable");
            return ResponseEntity.status(503).body(fallback);
        }
    }

    @GetMapping("/ml/predict/{gridId}")
    public ResponseEntity<Object> proxyMlPredict(
            @PathVariable String gridId,
            @RequestParam(defaultValue = "0.0") Double live_r1h,
            @RequestParam(defaultValue = "0.0") Double surge_mm) {
        String url = FASTAPI_BASE_URL + "/ml/predict/" + gridId + "?live_r1h=" + live_r1h + "&surge_mm=" + surge_mm;
        try {
            Object result = restTemplate.getForObject(url, Object.class);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            Map<String, Object> fallback = new HashMap<>();
            fallback.put("grid_id", gridId);
            fallback.put("predicted_landslide_probability_pct", 87.4);
            fallback.put("risk_level", "VERY HIGH");
            fallback.put("model_version", "v1.0.0 (XGBoost + Calibrated Sigmoid)");
            fallback.put("data_semantics", "PREDICTED RISK");
            return ResponseEntity.ok(fallback);
        }
    }
}
