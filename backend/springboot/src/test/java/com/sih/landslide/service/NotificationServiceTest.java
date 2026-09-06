package com.sih.landslide.service;

import com.sih.landslide.entity.NotificationEntity;
import com.sih.landslide.repository.NotificationRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
class NotificationServiceTest {

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private NotificationRepository notificationRepository;

    @Test
    void testDemoNotificationDispatchAndPersistence() {
        List<NotificationEntity> notifs = notificationService.dispatchAlertNotifications(
                "TEST-ALT-001",
                "Haflong Test Sector",
                "Dima Hasao",
                "Assam",
                "CRITICAL",
                89.2,
                8.9,
                "150 mm / 24h",
                "UNVERIFIED",
                "ADMIN",
                true
        );

        assertNotNull(notifs);
        assertEquals(2, notifs.size()); // SMS + Voice

        NotificationEntity sms = notifs.stream().filter(n -> "SMS".equalsIgnoreCase(n.getChannel())).findFirst().orElse(null);
        assertNotNull(sms);
        assertEquals("TEST-ALT-001", sms.getAlertId());
        assertTrue(sms.getMessage().contains("Predicted risk - not a confirmed landslide"));
        assertFalse(sms.getMessage().contains("landslide detected"));

        NotificationEntity voice = notifs.stream().filter(n -> "VOICE".equalsIgnoreCase(n.getChannel())).findFirst().orElse(null);
        assertNotNull(voice);
        assertTrue(voice.getMessage().contains("This prediction is not a confirmed landslide"));
        assertFalse(voice.getMessage().contains("landslide detected"));
    }

    @Test
    void testConfirmedIncidentWording() {
        String voiceMsg = notificationService.formatVoiceMessage(
                "Haflong Sector", "Dima Hasao", "Assam", "CRITICAL", 95.0, "CONFIRMED"
        );
        assertTrue(voiceMsg.contains("CONFIRMED LANDSLIDE DISASTER EVENT VERIFIED"));
    }

    @Test
    void testIdempotentNotificationSuppression() {
        String alertId = "IDEM-ALT-777";
        List<NotificationEntity> firstCall = notificationService.dispatchAlertNotifications(
                alertId, "Test Zone", "District X", "State Y", "CRITICAL", 85.0, 7.5, "100 mm", "UNVERIFIED", "AUTHORITY", true
        );
        assertEquals(2, firstCall.size());

        List<NotificationEntity> secondCall = notificationService.dispatchAlertNotifications(
                alertId, "Test Zone", "District X", "State Y", "CRITICAL", 85.0, 7.5, "100 mm", "UNVERIFIED", "AUTHORITY", true
        );
        assertEquals(2, secondCall.size());
        assertEquals(firstCall.get(0).getId(), secondCall.get(0).getId()); // Returned existing idempotent record
    }

    @Test
    void testUnauthorizedRoleRejection() {
        assertThrows(ResponseStatusException.class, () -> {
            notificationService.dispatchAlertNotifications(
                    "UNAUTH-ALT", "Test Zone", "District X", "State Y", "CRITICAL", 85.0, 7.5, "100 mm", "UNVERIFIED", "VIEWER", false
            );
        });

        assertThrows(ResponseStatusException.class, () -> {
            notificationService.dispatchAlertNotifications(
                    "UNAUTH-ALT", "Test Zone", "District X", "State Y", "CRITICAL", 85.0, 7.5, "100 mm", "UNVERIFIED", "FIELD_OFFICER", false
            );
        });
    }

    @Test
    void testSendTestNotification() {
        Map<String, Object> testRes = notificationService.sendTestNotification("ADMIN");
        assertNotNull(testRes);
        assertEquals("+919391594979", testRes.get("recipient"));
        assertNotNull(testRes.get("sms_notification"));
        assertNotNull(testRes.get("voice_notification"));
    }
}
