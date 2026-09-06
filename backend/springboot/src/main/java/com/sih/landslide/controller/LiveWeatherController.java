package com.sih.landslide.controller;

import com.sih.landslide.dto.ApiResponseDTO;
import com.sih.landslide.service.FastApiProxyService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/live")
@CrossOrigin(origins = "*")
public class LiveWeatherController {

    private final FastApiProxyService proxyService;

    public LiveWeatherController(FastApiProxyService proxyService) {
        this.proxyService = proxyService;
    }

    @GetMapping("/weather")
    public ResponseEntity<ApiResponseDTO<Object>> getLiveWeather() {
        return ResponseEntity.ok(ApiResponseDTO.ok(proxyService.getFromFastApi("/live/weather")));
    }

    @GetMapping("/rainfall")
    public ResponseEntity<ApiResponseDTO<Object>> getLiveRainfall() {
        return ResponseEntity.ok(ApiResponseDTO.ok(proxyService.getFromFastApi("/live/rainfall")));
    }

    @GetMapping("/warnings")
    public ResponseEntity<ApiResponseDTO<Object>> getLiveWarnings() {
        return ResponseEntity.ok(ApiResponseDTO.ok(proxyService.getFromFastApi("/live/warnings")));
    }

    @GetMapping("/status")
    public ResponseEntity<ApiResponseDTO<Object>> getLiveStatus() {
        return ResponseEntity.ok(ApiResponseDTO.ok(proxyService.getFromFastApi("/live/status")));
    }
}
