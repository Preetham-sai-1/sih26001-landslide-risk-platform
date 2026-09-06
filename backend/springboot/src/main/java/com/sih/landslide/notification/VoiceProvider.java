package com.sih.landslide.notification;

public interface VoiceProvider {
    NotificationResult sendVoiceCall(String recipient, String textToSpeechMessage);
}
