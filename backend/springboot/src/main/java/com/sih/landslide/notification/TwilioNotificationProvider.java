package com.sih.landslide.notification;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
public class TwilioNotificationProvider implements SmsProvider, VoiceProvider {

    @Value("${ALERT_PROVIDER:TWILIO}")
    private String alertProvider;

    @Value("${ALERT_PROVIDER_ACCOUNT_ID:}")
    private String accountId;

    @Value("${ALERT_PROVIDER_AUTH_TOKEN:}")
    private String authToken;

    @Value("${ALERT_SMS_SENDER:}")
    private String senderNumber;

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    @Override
    public NotificationResult sendSms(String recipient, String message) {
        if (!hasCredentials()) {
            return NotificationResult.demo("DEMO-SMS-" + UUID.randomUUID().toString().substring(0, 8), "DEMO_QUEUED");
        }

        try {
            String url = "https://api.twilio.com/2010-04-01/Accounts/" + accountId + "/Messages.json";
            String formBody = "To=" + URLEncoder.encode(recipient, StandardCharsets.UTF_8) +
                    "&From=" + URLEncoder.encode(senderNumber, StandardCharsets.UTF_8) +
                    "&Body=" + URLEncoder.encode(message, StandardCharsets.UTF_8);

            String authHeader = "Basic " + Base64.getEncoder().encodeToString((accountId + ":" + authToken).getBytes(StandardCharsets.UTF_8));

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("Authorization", authHeader)
                    .header("Content-Type", "application/x-www-form-urlencoded")
                    .POST(HttpRequest.BodyPublishers.ofString(formBody))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            String maskedRecipient = recipient != null && recipient.length() > 6 
                    ? recipient.substring(0, 3) + "******" + recipient.substring(recipient.length() - 4) 
                    : "masked";

            System.out.println("[Twilio Diagnostic] SMS Request to: " + maskedRecipient + " | HTTP Status: " + response.statusCode());

            if (response.statusCode() >= 200 && response.statusCode() < 300) {
                String sid = extractSid(response.body(), "SM");
                String twilioStatus = extractJsonValue(response.body(), "status");
                System.out.println("[Twilio Diagnostic] SMS Dispatched | SID: " + sid + " | Status: " + twilioStatus);
                return NotificationResult.success(sid != null ? sid : "SM-" + UUID.randomUUID(), twilioStatus != null ? twilioStatus.toUpperCase() : "SENT", Instant.now());
            } else {
                String errCode = extractJsonValue(response.body(), "code");
                String errMsg = extractJsonValue(response.body(), "message");
                System.err.println("[Twilio Diagnostic Error] SMS Code: " + errCode + " | Message: " + errMsg);
                return NotificationResult.failure("HTTP " + response.statusCode() + " [Twilio Code " + errCode + "]: " + errMsg);
            }
        } catch (Exception e) {
            System.err.println("[Twilio Diagnostic Exception] " + e.getMessage());
            return NotificationResult.failure("Provider Exception: " + e.getMessage());
        }
    }

    @Override
    public NotificationResult sendVoiceCall(String recipient, String textToSpeechMessage) {
        if (!hasCredentials()) {
            return NotificationResult.demo("DEMO-CALL-" + UUID.randomUUID().toString().substring(0, 8), "DEMO_QUEUED");
        }

        try {
            String url = "https://api.twilio.com/2010-04-01/Accounts/" + accountId + "/Calls.json";
            String twiml = "<Response><Say voice=\"alice\">" + escapeXml(textToSpeechMessage) + "</Say></Response>";
            String formBody = "To=" + URLEncoder.encode(recipient, StandardCharsets.UTF_8) +
                    "&From=" + URLEncoder.encode(senderNumber, StandardCharsets.UTF_8) +
                    "&Twiml=" + URLEncoder.encode(twiml, StandardCharsets.UTF_8);

            String authHeader = "Basic " + Base64.getEncoder().encodeToString((accountId + ":" + authToken).getBytes(StandardCharsets.UTF_8));

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("Authorization", authHeader)
                    .header("Content-Type", "application/x-www-form-urlencoded")
                    .POST(HttpRequest.BodyPublishers.ofString(formBody))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            String maskedRecipient = recipient != null && recipient.length() > 6 
                    ? recipient.substring(0, 3) + "******" + recipient.substring(recipient.length() - 4) 
                    : "masked";

            System.out.println("[Twilio Diagnostic] Voice Request to: " + maskedRecipient + " | HTTP Status: " + response.statusCode());

            if (response.statusCode() >= 200 && response.statusCode() < 300) {
                String sid = extractSid(response.body(), "CA");
                String twilioStatus = extractJsonValue(response.body(), "status");
                System.out.println("[Twilio Diagnostic] Voice Call Queued | SID: " + sid + " | Status: " + twilioStatus);
                return NotificationResult.success(sid != null ? sid : "CA-" + UUID.randomUUID(), twilioStatus != null ? twilioStatus.toUpperCase() : "QUEUED", Instant.now());
            } else {
                String errCode = extractJsonValue(response.body(), "code");
                String errMsg = extractJsonValue(response.body(), "message");
                System.err.println("[Twilio Diagnostic Error] Code: " + errCode + " | Message: " + errMsg);
                return NotificationResult.failure("HTTP " + response.statusCode() + " [Twilio Code " + errCode + "]: " + errMsg);
            }
        } catch (Exception e) {
            System.err.println("[Twilio Diagnostic Exception] " + e.getMessage());
            return NotificationResult.failure("Provider Exception: " + e.getMessage());
        }
    }

    public boolean hasCredentials() {
        return accountId != null && !accountId.trim().isEmpty() &&
               authToken != null && !authToken.trim().isEmpty() &&
               senderNumber != null && !senderNumber.trim().isEmpty();
    }

    private String extractSid(String body, String prefix) {
        Pattern pattern = Pattern.compile("\"sid\":\\s*\"(" + prefix + "[a-zA-Z0-9]+)\"");
        Matcher matcher = pattern.matcher(body);
        if (matcher.find()) {
            return matcher.group(1);
        }
        return null;
    }

    private String extractJsonValue(String body, String key) {
        if (body == null) return null;
        Pattern pattern = Pattern.compile("\"" + key + "\":\\s*\"?([^\",}\n]+)\"?");
        Matcher matcher = pattern.matcher(body);
        if (matcher.find()) {
            return matcher.group(1).replace("\"", "").trim();
        }
        return null;
    }

    private String escapeXml(String text) {
        if (text == null) return "";
        return text.replace("&", "&amp;")
                   .replace("<", "&lt;")
                   .replace(">", "&gt;")
                   .replace("\"", "&quot;")
                   .replace("'", "&apos;");
    }
}
