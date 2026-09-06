package com.sih.landslide.notification;

import java.time.Instant;

public class NotificationResult {
    private final boolean success;
    private final String providerMessageId;
    private final String status;
    private final String failureReason;
    private final Instant deliveredAt;
    private final boolean isDemo;

    public NotificationResult(boolean success, String providerMessageId, String status, String failureReason, Instant deliveredAt, boolean isDemo) {
        this.success = success;
        this.providerMessageId = providerMessageId;
        this.status = status;
        this.failureReason = failureReason;
        this.deliveredAt = deliveredAt;
        this.isDemo = isDemo;
    }

    public static NotificationResult success(String providerMessageId, String status, Instant deliveredAt) {
        return new NotificationResult(true, providerMessageId, status, null, deliveredAt, false);
    }

    public static NotificationResult demo(String providerMessageId, String status) {
        return new NotificationResult(false, providerMessageId, status, "No real SMS/Voice provider credentials configured (DEMO MODE)", null, true);
    }

    public static NotificationResult failure(String failureReason) {
        return new NotificationResult(false, null, "FAILED", failureReason, null, false);
    }

    public boolean isSuccess() { return success; }
    public String getProviderMessageId() { return providerMessageId; }
    public String getStatus() { return status; }
    public String getFailureReason() { return failureReason; }
    public Instant getDeliveredAt() { return deliveredAt; }
    public boolean isDemo() { return isDemo; }
}
