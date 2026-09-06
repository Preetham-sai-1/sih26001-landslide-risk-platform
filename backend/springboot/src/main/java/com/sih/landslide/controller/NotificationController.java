package com.sih.landslide.controller;

import com.sih.landslide.dto.ApiResponseDTO;
import com.sih.landslide.entity.NotificationEntity;
import com.sih.landslide.service.NotificationService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;

import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/notifications")
@CrossOrigin(origins = "*")
public class NotificationController {

    private final NotificationService notificationService;

    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @GetMapping
    public ResponseEntity<ApiResponseDTO<List<NotificationEntity>>> getAllNotifications() {
        return ResponseEntity.ok(ApiResponseDTO.ok(notificationService.getAllNotifications()));
    }

    @PostMapping("/test")
    public ResponseEntity<ApiResponseDTO<Object>> sendTestNotification(Authentication authentication) {
        String role = (authentication != null && authentication.getAuthorities() != null && !authentication.getAuthorities().isEmpty())
                ? authentication.getAuthorities().iterator().next().getAuthority()
                : "ADMIN";

        Map<String, Object> result = notificationService.sendTestNotification(role);
        return ResponseEntity.ok(ApiResponseDTO.ok(result));
    }
}
