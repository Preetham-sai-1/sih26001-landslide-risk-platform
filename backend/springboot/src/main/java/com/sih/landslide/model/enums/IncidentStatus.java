package com.sih.landslide.model.enums;

public enum IncidentStatus {
    NORMAL, WATCH, HIGH, CRITICAL, VERIFICATION, CONFIRMED, RESOLVED;

    public boolean canTransitionTo(IncidentStatus next) {
        if (this == next) return true;
        return switch (this) {
            case NORMAL -> next == WATCH || next == HIGH;
            case WATCH -> next == HIGH || next == CRITICAL || next == NORMAL;
            case HIGH -> next == CRITICAL || next == VERIFICATION || next == NORMAL;
            case CRITICAL -> next == VERIFICATION;
            case VERIFICATION -> next == CONFIRMED || next == RESOLVED;
            case CONFIRMED -> next == RESOLVED;
            case RESOLVED -> false;
        };
    }
}
