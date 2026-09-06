package com.sih.landslide.controller;

import com.sih.landslide.dto.ApiResponseDTO;
import com.sih.landslide.service.FastApiProxyService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/ml")
@CrossOrigin(origins = "*")
public class MlProxyController {

    private final FastApiProxyService proxyService;

    public MlProxyController(FastApiProxyService proxyService) {
        this.proxyService = proxyService;
    }

    @GetMapping("/predict/{gridId}")
    public ResponseEntity<ApiResponseDTO<Object>> predictGridCell(
            @PathVariable String gridId,
            @RequestParam(defaultValue = "0.0") Double live_r1h,
            @RequestParam(defaultValue = "0.0") Double surge_mm) {
        String path = "/ml/predict/" + gridId + "?live_r1h=" + live_r1h + "&surge_mm=" + surge_mm;
        Object res = proxyService.getFromFastApi(path);
        return ResponseEntity.ok(ApiResponseDTO.ok(res));
    }

    @PostMapping("/predict")
    public ResponseEntity<ApiResponseDTO<Object>> predictCustom(@RequestBody Object body) {
        Object res = proxyService.postToFastApi("/ml/predict", body);
        return ResponseEntity.ok(ApiResponseDTO.ok(res));
    }

    @GetMapping("/explain/{gridId}")
    public ResponseEntity<ApiResponseDTO<Object>> explainGridCell(@PathVariable String gridId) {
        Object res = proxyService.getFromFastApi("/ml/explain/" + gridId);
        return ResponseEntity.ok(ApiResponseDTO.ok(res));
    }

    @GetMapping("/model-info")
    public ResponseEntity<ApiResponseDTO<Object>> getModelInfo() {
        Object res = proxyService.getFromFastApi("/ml/model-info");
        return ResponseEntity.ok(ApiResponseDTO.ok(res));
    }
}
