package com.sih.landslide.controller;

import com.sih.landslide.dto.ApiResponseDTO;
import com.sih.landslide.entity.FieldReportEntity;
import com.sih.landslide.service.FieldReportService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/field-reports")
@CrossOrigin(origins = "*")
public class FieldReportController {

    private final FieldReportService fieldReportService;

    public FieldReportController(FieldReportService fieldReportService) {
        this.fieldReportService = fieldReportService;
    }

    @GetMapping
    public ResponseEntity<ApiResponseDTO<Object>> getFieldReports() {
        return ResponseEntity.ok(ApiResponseDTO.ok(fieldReportService.getAllReports()));
    }

    @PostMapping
    public ResponseEntity<ApiResponseDTO<Object>> submitFieldReport(
            @RequestBody FieldReportEntity report,
            @RequestHeader(value = "X-Request-ID", required = false) String requestId) {
        Object result = fieldReportService.saveReport(report, requestId);
        return ResponseEntity.ok(ApiResponseDTO.ok(result));
    }
}
