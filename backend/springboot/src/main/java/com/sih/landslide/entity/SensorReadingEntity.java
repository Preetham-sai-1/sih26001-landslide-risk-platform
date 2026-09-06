package com.sih.landslide.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "sensor_readings")
public class SensorReadingEntity {

    @Id
    private String id;

    @Column(name = "station_id", nullable = false)
    private String stationId;

    @Column(nullable = false)
    private Instant timestamp = Instant.now();

    @Column(name = "rainfall_1h_mm")
    private Double rainfall1hMm = 0.0;

    @Column(name = "rainfall_24h_mm")
    private Double rainfall24hMm = 0.0;

    @Column(name = "temperature_c")
    private Double temperatureC = 0.0;

    @Column(name = "humidity_pct")
    private Double humidityPct = 0.0;

    public SensorReadingEntity() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getStationId() { return stationId; }
    public void setStationId(String stationId) { this.stationId = stationId; }

    public Instant getTimestamp() { return timestamp; }
    public void setTimestamp(Instant timestamp) { this.timestamp = timestamp; }

    public Double getRainfall1hMm() { return rainfall1hMm; }
    public void setRainfall1hMm(Double rainfall1hMm) { this.rainfall1hMm = rainfall1hMm; }

    public Double getRainfall24hMm() { return rainfall24hMm; }
    public void setRainfall24hMm(Double rainfall24hMm) { this.rainfall24hMm = rainfall24hMm; }

    public Double getTemperatureC() { return temperatureC; }
    public void setTemperatureC(Double temperatureC) { this.temperatureC = temperatureC; }

    public Double getHumidityPct() { return humidityPct; }
    public void setHumidityPct(Double humidityPct) { this.humidityPct = humidityPct; }
}
