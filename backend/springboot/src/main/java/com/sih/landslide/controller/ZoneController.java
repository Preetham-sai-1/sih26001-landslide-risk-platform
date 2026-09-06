package com.sih.landslide.controller;

import com.sih.landslide.dto.ApiResponseDTO;
import com.sih.landslide.entity.ZoneEntity;
import com.sih.landslide.repository.ZoneRepository;
import com.sih.landslide.service.FastApiProxyService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/v1")
@CrossOrigin(origins = "*")
public class ZoneController {

    private final FastApiProxyService proxyService;
    private final ZoneRepository zoneRepository;

    public ZoneController(FastApiProxyService proxyService, ZoneRepository zoneRepository) {
        this.proxyService = proxyService;
        this.zoneRepository = zoneRepository;
    }

    @GetMapping("/zones")
    public ResponseEntity<ApiResponseDTO<Object>> getZones(
            @RequestParam(required = false) String state,
            @RequestParam(required = false) String risk_level) {
        StringBuilder query = new StringBuilder("/zones");
        boolean hasParam = false;
        if (state != null && !state.trim().isEmpty()) {
            query.append("?state=").append(state);
            hasParam = true;
        }
        if (risk_level != null && !risk_level.trim().isEmpty()) {
            query.append(hasParam ? "&" : "?").append("risk_level=").append(risk_level);
        }
        Object result = proxyService.getFromFastApi(query.toString());
        return ResponseEntity.ok(ApiResponseDTO.ok(result));
    }

    @GetMapping("/zones/spatial/nearby")
    public ResponseEntity<ApiResponseDTO<List<ZoneEntity>>> getNearbyZones(
            @RequestParam Double lat,
            @RequestParam Double lon,
            @RequestParam(defaultValue = "50.0") Double radiusKm) {
        List<ZoneEntity> nearby = zoneRepository.findNearbyZones(lat, lon, radiusKm);
        return ResponseEntity.ok(ApiResponseDTO.ok(nearby));
    }

    @GetMapping("/zones/spatial/nearest")
    public ResponseEntity<ApiResponseDTO<ZoneEntity>> getNearestZone(
            @RequestParam Double lat,
            @RequestParam Double lon) {
        Optional<ZoneEntity> nearest = zoneRepository.findNearestZone(lat, lon);
        return ResponseEntity.ok(ApiResponseDTO.ok(nearest.orElse(null)));
    }

    @GetMapping("/zones/{gridId}")
    public ResponseEntity<ApiResponseDTO<Object>> getZoneDetails(@PathVariable String gridId) {
        Object details = proxyService.getFromFastApi("/zones/" + gridId);
        return ResponseEntity.ok(ApiResponseDTO.ok(details));
    }

    @GetMapping("/forecast")
    public ResponseEntity<ApiResponseDTO<Object>> getForecast(
            @RequestParam(defaultValue = "+12H") String horizon,
            @RequestParam(required = false) String state) {
        StringBuilder query = new StringBuilder("/forecast?horizon=").append(horizon);
        if (state != null && !state.trim().isEmpty()) {
            query.append("&state=").append(state);
        }
        Object result = proxyService.getFromFastApi(query.toString());
        return ResponseEntity.ok(ApiResponseDTO.ok(result));
    }
}
