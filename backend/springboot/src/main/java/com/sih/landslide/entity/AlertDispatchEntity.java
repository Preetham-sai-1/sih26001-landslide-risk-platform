package com.sih.landslide.entity;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;

@Entity
@Table(name = "alerts_dispatch")
public class AlertDispatchEntity {

    @Id
    private String id;

    @Column(nullable = false)
    private String timestamp;

    @Column(name = "target_state", nullable = false)
    @JsonProperty("target_state")
    @JsonAlias({"targetState", "target_state"})
    private String targetState;

    @Column(name = "target_district", nullable = false)
    @JsonProperty("target_district")
    @JsonAlias({"targetDistrict", "target_district"})
    private String targetDistrict;

    @Column(name = "hazard_level", nullable = false)
    @JsonProperty("hazard_level")
    @JsonAlias({"hazardLevel", "hazard_level"})
    private String hazardLevel;

    @Column(name = "sms_sent")
    @JsonProperty("sms_sent")
    @JsonAlias({"smsSent", "sms_sent"})
    private Integer smsSent;

    @Column(name = "sms_delivered")
    @JsonProperty("sms_delivered")
    @JsonAlias({"smsDelivered", "sms_delivered"})
    private Integer smsDelivered;

    @Column(name = "voice_dispatched")
    @JsonProperty("voice_dispatched")
    @JsonAlias({"voiceDispatched", "voice_dispatched"})
    private Integer voiceDispatched;

    @Column(name = "voice_answered_pct")
    @JsonProperty("voice_answered_pct")
    @JsonAlias({"voiceAnsweredPct", "voice_answered_pct"})
    private Double voiceAnsweredPct;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String message;

    @Column(nullable = false)
    private String status;

    public AlertDispatchEntity() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getTimestamp() { return timestamp; }
    public void setTimestamp(String timestamp) { this.timestamp = timestamp; }

    public String getTargetState() { return targetState; }
    public void setTargetState(String targetState) { this.targetState = targetState; }

    public String getTargetDistrict() { return targetDistrict; }
    public void setTargetDistrict(String targetDistrict) { this.targetDistrict = targetDistrict; }

    public String getHazardLevel() { return hazardLevel; }
    public void setHazardLevel(String hazardLevel) { this.hazardLevel = hazardLevel; }

    public Integer getSmsSent() { return smsSent; }
    public void setSmsSent(Integer smsSent) { this.smsSent = smsSent; }

    public Integer getSmsDelivered() { return smsDelivered; }
    public void setSmsDelivered(Integer smsDelivered) { this.smsDelivered = smsDelivered; }

    public Integer getVoiceDispatched() { return voiceDispatched; }
    public void setVoiceDispatched(Integer voiceDispatched) { this.voiceDispatched = voiceDispatched; }

    public Double getVoiceAnsweredPct() { return voiceAnsweredPct; }
    public void setVoiceAnsweredPct(Double voiceAnsweredPct) { this.voiceAnsweredPct = voiceAnsweredPct; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}
