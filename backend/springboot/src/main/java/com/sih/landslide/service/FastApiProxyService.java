package com.sih.landslide.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.Map;

@Service
public class FastApiProxyService {

    @Value("${fastapi.base-url:http://localhost:8000/api/v1}")
    private String fastApiBaseUrl;

    private final RestTemplate restTemplate;

    public FastApiProxyService(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    public Object getFromFastApi(String path) {
        String url = fastApiBaseUrl + path;
        try {
            return restTemplate.getForObject(url, Object.class);
        } catch (Exception e) {
            Map<String, Object> degraded = new HashMap<>();
            degraded.put("status", "DEGRADED");
            degraded.put("service", "FastAPI ML/GIS Engine");
            degraded.put("message", "FastAPI ML Engine unreachable: " + e.getMessage());
            degraded.put("prediction_available", false);
            return degraded;
        }
    }

    public Object postToFastApi(String path, Object body) {
        String url = fastApiBaseUrl + path;
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Object> requestEntity = new HttpEntity<>(body, headers);
            return restTemplate.postForObject(url, requestEntity, Object.class);
        } catch (Exception e) {
            Map<String, Object> degraded = new HashMap<>();
            degraded.put("status", "DEGRADED");
            degraded.put("service", "FastAPI ML/GIS Engine");
            degraded.put("message", "FastAPI ML Engine unreachable: " + e.getMessage());
            degraded.put("prediction_available", false);
            return degraded;
        }
    }

    public boolean isFastApiHealthy() {
        try {
            Object res = restTemplate.getForObject(fastApiBaseUrl + "/health", Object.class);
            return res != null;
        } catch (Exception e) {
            return false;
        }
    }
}
