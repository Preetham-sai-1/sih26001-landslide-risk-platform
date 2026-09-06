package com.sih.landslide.config;

import com.sih.landslide.service.FastApiProxyService;
import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.stereotype.Component;

@Component("fastapi")
public class FastApiHealthIndicator implements HealthIndicator {

    private final FastApiProxyService proxyService;

    public FastApiHealthIndicator(FastApiProxyService proxyService) {
        this.proxyService = proxyService;
    }

    @Override
    public Health health() {
        boolean healthy = proxyService.isFastApiHealthy();
        if (healthy) {
            return Health.up()
                    .withDetail("service", "FastAPI ML/GIS Engine")
                    .withDetail("port", 8000)
                    .build();
        }
        return Health.down()
                .withDetail("service", "FastAPI ML/GIS Engine")
                .withDetail("error", "FastAPI server unreachable")
                .build();
    }
}
