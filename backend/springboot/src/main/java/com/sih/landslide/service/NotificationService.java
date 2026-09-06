package com.sih.landslide.service;

import com.sih.landslide.entity.AuditLogEntity;
import com.sih.landslide.entity.NotificationEntity;
import com.sih.landslide.notification.NotificationResult;
import com.sih.landslide.notification.TwilioNotificationProvider;
import com.sih.landslide.repository.AuditLogRepository;
import com.sih.landslide.repository.NotificationRepository;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;
import java.time.Instant;
import java.util.*;

@Service
public class NotificationService {

    @Value("${ALERT_RECIPIENT_PHONE:+919391594979}")
    private String recipientPhone;

    @Value("${ALERT_PROVIDER:TWILIO}")
    private String providerName;

    private final TwilioNotificationProvider twilioProvider;
    private final NotificationRepository notificationRepository;
    private final AuditLogRepository auditLogRepository;

    public NotificationService(
            TwilioNotificationProvider twilioProvider,
            NotificationRepository notificationRepository,
            AuditLogRepository auditLogRepository) {
        this.twilioProvider = twilioProvider;
        this.notificationRepository = notificationRepository;
        this.auditLogRepository = auditLogRepository;
    }

    public List<NotificationEntity> dispatchAlertNotifications(
            String alertId,
            String zone,
            String district,
            String state,
            String severity,
            Double prob,
            Double hazardScore,
            String rainfall,
            String verificationStatus,
            String userRole,
            boolean forceVoice) {

        // 1. Role Authorization Check
        validateRoleAuthorization(userRole);

        List<NotificationEntity> results = new ArrayList<>();
        Instant tenMinutesAgo = Instant.now().minus(Duration.ofMinutes(10));
        String targetPhone = (recipientPhone != null && !recipientPhone.isEmpty()) ? recipientPhone : "+919391594979";

        // Determine required channels based on severity & forceVoice
        boolean sendSms = true;
        boolean sendVoice = forceVoice || "CRITICAL".equalsIgnoreCase(severity) || "VERY HIGH".equalsIgnoreCase(severity);

        // 2. Dispatch SMS
        if (sendSms) {
            String smsMessage = formatSmsMessage(zone, district, state, severity, prob, hazardScore, rainfall, verificationStatus);
            NotificationEntity smsNotif = dispatchChannel(alertId, targetPhone, "SMS", smsMessage, tenMinutesAgo, userRole);
            results.add(smsNotif);
        }

        // 3. Dispatch Voice Call
        if (sendVoice) {
            String voiceMessage = formatVoiceMessage(zone, district, state, severity, prob, verificationStatus);
            NotificationEntity voiceNotif = dispatchChannel(alertId, targetPhone, "VOICE", voiceMessage, tenMinutesAgo, userRole);
            results.add(voiceNotif);
        }

        return results;
    }

    public Map<String, Object> sendTestNotification(String userRole) {
        validateRoleAuthorization(userRole);

        String targetPhone = (recipientPhone != null && !recipientPhone.isEmpty()) ? recipientPhone : "+919391594979";
        String testAlertId = "TEST-ALT-" + UUID.randomUUID().toString().substring(0, 6);

        String testSmsMessage = formatSmsMessage(
                "Haflong Sector", "Dima Hasao", "Assam",
                "HIGH", 88.4, 8.5, "124 mm / 24h", "UNVERIFIED"
        );
        NotificationEntity smsNotif = dispatchChannel(testAlertId, targetPhone, "SMS", testSmsMessage, Instant.now().minusSeconds(1), userRole);

        String testVoiceMessage = "SIH26001 voice test. This is an authorized system test.";
        NotificationEntity voiceNotif = dispatchChannel(testAlertId, targetPhone, "VOICE", testVoiceMessage, Instant.now().minusSeconds(1), userRole);

        Map<String, Object> response = new HashMap<>();
        response.put("recipient", targetPhone);
        response.put("provider", twilioProvider.hasCredentials() ? providerName : "DEMO");
        response.put("is_demo", !twilioProvider.hasCredentials());
        response.put("sms_notification", smsNotif);
        response.put("voice_notification", voiceNotif);
        return response;
    }

    public List<NotificationEntity> getAllNotifications() {
        return notificationRepository.findAllByOrderByRequestedAtDesc();
    }

    private NotificationEntity dispatchChannel(
            String alertId,
            String recipient,
            String channel,
            String message,
            Instant cutoff,
            String userRole) {

        // Idempotency Check: Alert + Recipient + Channel within 10 min window
        Optional<NotificationEntity> existing = notificationRepository
                .findByAlertIdAndRecipientAndChannelAndRequestedAtAfter(alertId, recipient, channel, cutoff);
        if (existing.isPresent()) {
            return existing.get();
        }

        NotificationEntity notif = new NotificationEntity();
        notif.setId("NOTIF-2026-" + UUID.randomUUID().toString().substring(0, 8));
        notif.setAlertId(alertId);
        notif.setRecipient(recipient);
        notif.setChannel(channel);
        notif.setRequestedAt(Instant.now());
        notif.setMessage(message);
        notif.setProvider(twilioProvider.hasCredentials() ? providerName : "DEMO");

        NotificationResult result;
        if ("SMS".equalsIgnoreCase(channel)) {
            result = twilioProvider.sendSms(recipient, message);
        } else {
            result = twilioProvider.sendVoiceCall(recipient, message);
        }

        notif.setStatus(result.getStatus());
        notif.setProviderMessageId(result.getProviderMessageId());
        notif.setFailureReason(result.getFailureReason());
        notif.setDeliveredAt(result.getDeliveredAt());

        NotificationEntity saved = notificationRepository.save(notif);

        // Audit Log
        auditLogRepository.save(new AuditLogEntity(
                Instant.now(),
                "NOTIFICATION_DISPATCH",
                "ALERT_" + channel,
                userRole,
                "Dispatched " + channel + " to " + recipient + " via " + notif.getProvider() + " (Status: " + notif.getStatus() + ")"
        ));

        return saved;
    }

    private void validateRoleAuthorization(String role) {
        if (role == null) return; // Default spring context
        String normalized = role.toUpperCase().replace("ROLE_", "");
        if ("VIEWER".equals(normalized)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "VIEWER role is forbidden from dispatching alerts");
        }
        if ("FIELD_OFFICER".equals(normalized)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "FIELD_OFFICER role cannot broadcast emergency alerts");
        }
    }

    public String formatSmsMessage(
            String zone,
            String district,
            String state,
            String severity,
            Double prob,
            Double score,
            String rainfall,
            String verificationStatus) {

        StringBuilder sb = new StringBuilder();
        sb.append("SIH26001 ALERT\n");
        sb.append("Zone: ").append(zone != null ? zone : "Target Sector").append("\n");
        sb.append("District/State: ").append(district != null ? district : "NER").append(", ").append(state != null ? state : "India").append("\n");
        sb.append("Risk Severity: ").append(severity != null ? severity : "HIGH").append("\n");
        if (prob != null) {
            sb.append(String.format(Locale.US, "Probability: %.1f%%\n", prob));
        }
        if (score != null) {
            sb.append(String.format(Locale.US, "Hazard Score: %.1f/10\n", score));
        }
        if (rainfall != null && !rainfall.isEmpty()) {
            sb.append("Rainfall: ").append(rainfall).append("\n");
        }
        sb.append("Verification: ").append(verificationStatus != null ? verificationStatus : "UNVERIFIED").append("\n");
        sb.append("Predicted risk - not a confirmed landslide");
        return sb.toString();
    }

    public String formatVoiceMessage(
            String zone,
            String district,
            String state,
            String severity,
            Double prob,
            String verificationStatus) {

        boolean isConfirmed = "CONFIRMED".equalsIgnoreCase(verificationStatus) || "CONFIRMED LANDSLIDE".equalsIgnoreCase(verificationStatus);

        if (isConfirmed) {
            return "SIH26001 emergency warning. CONFIRMED LANDSLIDE DISASTER EVENT VERIFIED near " +
                    (zone != null ? zone : "target sector") + ", " + (district != null ? district : "NER") +
                    ". Emergency response teams deployed. Please take immediate shelter.";
        } else {
            String probText = prob != null ? String.format(Locale.US, "%.1f percent", prob) : (severity != null ? severity : "High");
            return "SIH26001 emergency warning. High landslide risk has been predicted near " +
                    (zone != null ? zone : "target sector") + ", " + (district != null ? district : "NER") +
                    ". Current predicted risk is " + probText +
                    ". Verification status is " + (verificationStatus != null ? verificationStatus : "unverified") +
                    ". This prediction is not a confirmed landslide. Please initiate field verification.";
        }
    }
}
