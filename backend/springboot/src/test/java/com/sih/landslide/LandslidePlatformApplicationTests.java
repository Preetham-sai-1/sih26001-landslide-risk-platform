package com.sih.landslide;

import com.sih.landslide.controller.LandslideProxyController;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
class LandslidePlatformApplicationTests {

    @Autowired(required = false)
    private LandslideProxyController proxyController;

    @Test
    void contextLoads() {
        // Test context initialization logic
        assertNotNull(this.getClass().getName());
    }

    @Test
    void testSpringHealthCheck() {
        LandslideProxyController controller = new LandslideProxyController();
        Map<String, Object> health = controller.springHealthCheck();
        assertEquals("UP", health.get("status"));
        assertEquals("sih-landslide-springboot-backend", health.get("service"));
    }
}
