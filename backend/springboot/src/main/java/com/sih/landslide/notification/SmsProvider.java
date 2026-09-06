package com.sih.landslide.notification;

public interface SmsProvider {
    NotificationResult sendSms(String recipient, String message);
}
