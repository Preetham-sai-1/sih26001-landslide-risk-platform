package com.sih.landslide;

import com.sih.landslide.dto.ApiResponseDTO;
import com.sih.landslide.entity.AlertEntity;
import com.sih.landslide.entity.FieldReportEntity;
import com.sih.landslide.entity.IncidentEntity;
import com.sih.landslide.model.enums.IncidentStatus;
import com.sih.landslide.service.AlertService;
import com.sih.landslide.service.FieldReportService;
import com.sih.landslide.service.IncidentService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
class LandslidePlatformApplicationTests {

    @Autowired
    private FieldReportService fieldReportService;

    @Autowired
    private AlertService alertService;

    @Autowired
    private IncidentService incidentService;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Test
    void contextLoads() {
        assertNotNull(fieldReportService);
        assertNotNull(alertService);
        assertNotNull(incidentService);
        assertNotNull(passwordEncoder);
    }

    @Test
    void testPasswordEncoder() {
        String encoded = passwordEncoder.encode("admin123");
        assertTrue(passwordEncoder.matches("admin123", encoded));
        assertFalse(passwordEncoder.matches("wrongpass", encoded));
    }

    @Test
    void testFieldReportPersistenceAndIdempotency() {
        FieldReportEntity report = new FieldReportEntity();
        report.setLocationName("Test Haflong Cut Slope");
        report.setState("Assam");
        report.setDistrict("Dima Hasao");
        report.setIncidentType("Debris Slide");
        report.setSeverity("High");
        report.setLatitude(25.188);
        report.setLongitude(93.019);

        Map<String, Object> firstRes = fieldReportService.saveReport(report, "REQ-1001");
        assertFalse((Boolean) firstRes.get("is_duplicate"));

        // Second duplicate request with same X-Request-ID
        Map<String, Object> dupRes = fieldReportService.saveReport(report, "REQ-1001");
        assertTrue((Boolean) dupRes.get("is_duplicate"));
    }

    @Test
    void testAlertDispatchAndIdempotency() {
        AlertEntity alert = new AlertEntity();
        alert.setTargetState("Meghalaya");
        alert.setTargetDistrict("East Khasi Hills");
        alert.setHazardLevel("CRITICAL");
        alert.setMessage("TEST EVACUATION BROADCAST");

        Map<String, Object> firstRes = alertService.dispatchAlert(alert, "ALERT-REQ-999");
        assertFalse((Boolean) firstRes.get("is_duplicate"));

        // Duplicate dispatch
        Map<String, Object> dupRes = alertService.dispatchAlert(alert, "ALERT-REQ-999");
        assertTrue((Boolean) dupRes.get("is_duplicate"));
    }

    @Test
    void testIncidentStateMachineTransitions() {
        IncidentEntity incident = incidentService.getOrCreateIncident("ner_grid_056061", "HIGH");
        assertEquals(IncidentStatus.HIGH, incident.getStatus());

        // Legal transition HIGH -> VERIFICATION
        IncidentEntity verified = incidentService.transitionIncident("ner_grid_056061", IncidentStatus.VERIFICATION, "Field Inspector Roy", "Cracks confirmed");
        assertEquals(IncidentStatus.VERIFICATION, verified.getStatus());

        // Legal transition VERIFICATION -> CONFIRMED with officer actor
        IncidentEntity confirmed = incidentService.transitionIncident("ner_grid_056061", IncidentStatus.CONFIRMED, "Disaster Management Officer", "Physical landslide verified");
        assertEquals(IncidentStatus.CONFIRMED, confirmed.getStatus());

        // Illegal transition CONFIRMED -> WATCH
        assertThrows(IllegalArgumentException.class, () -> {
            incidentService.transitionIncident("ner_grid_056061", IncidentStatus.WATCH, "System", "Invalid backwards transition");
        });
    }

    @Test
    void testPredictionCannotDirectlyConfirmIncident() {
        // Attempting to directly transition from NORMAL to CONFIRMED without officer actor
        assertThrows(IllegalArgumentException.class, () -> {
            IncidentEntity incident = new IncidentEntity("INC-TEST", "grid_test", IncidentStatus.NORMAL, "SAFE");
            incident.transitionTo(IncidentStatus.CONFIRMED, null, "ML Auto Prediction");
        });
    }
}
