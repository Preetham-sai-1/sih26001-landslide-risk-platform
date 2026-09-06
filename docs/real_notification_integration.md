# SIH26001 — Real SMS & Automated Voice Alert Integration

**Project**: SIH26001 Landslide Early Warning & Risk Platform  
**Baseline**: `86c705c`  
**Configured Recipient**: `ALERT_RECIPIENT_PHONE=+919391594979`  
**Status**: Real SMS & Voice Provider Layer Fully Implemented & Verified  

---

## 1. Provider Selection & Architecture

The notification system uses a zero-external-dependency HTTP provider implementation built on Java 21/25 `java.net.http.HttpClient` targeting the **Twilio REST API**.

```
+-------------------------------------------------------------------------+
|                              REACT FRONTEND                             |
|        Triggers DISPATCH ALERT / Broadcast Emergency Payload            |
+-------------------------------------------------------------------------+
                                    | REST API (Basic Auth / Security)
                                    v
+-------------------------------------------------------------------------+
|                  SPRING BOOT API GATEWAY & CONTROLLER                   |
|                  (NotificationController / AlertService)                 |
+-------------------------------------------------------------------------+
                                    |
                                    v
+-------------------------------------------------------------------------+
|                           NOTIFICATION SERVICE                          |
|    - Validates Role Permissions (ADMIN / AUTHORITY allowed; VIEWER 403)  |
|    - Enforces Idempotency (Alert + Recipient + Channel within 10m window)|
|    - Formats Safety Messages ("Predicted risk — not a confirmed landslide") |
+-------------------------------------------------------------------------+
                                    |
            +-----------------------+-----------------------+
            |                                               |
            v                                               v
+-----------------------+                       +-----------------------+
|      SmsProvider      |                       |     VoiceProvider     |
| (Twilio SMS Endpoint) |                       | (Twilio Call TwiML)   |
+-----------------------+                       +-----------------------+
            |                                               |
            +-----------------------+-----------------------+
                                    |
                                    v
+-------------------------------------------------------------------------+
|                      POSTGRESQL / H2 PERSISTENCE                        |
|  - Table: notifications                                                 |
|  - Tracks: id, alert_id, requested_at, recipient, channel, provider,    |
|    provider_message_id, message, status, failure_reason, delivered_at   |
+-------------------------------------------------------------------------+
```

---

## 2. Environment Variables & Credentials Security

Provider credentials are managed strictly through backend environment variables:
- `ALERT_PROVIDER`: Provider name (`TWILIO` or `DEMO`).
- `ALERT_PROVIDER_ACCOUNT_ID`: Provider Account SID (e.g. `AC...`).
- `ALERT_PROVIDER_AUTH_TOKEN`: Provider Auth Token.
- `ALERT_SMS_SENDER`: Provider Phone Number / Sender ID.
- `ALERT_RECIPIENT_PHONE`: Configured test recipient (`+919391594979`).

**Security Rule**: Provider credentials are never hard-coded in Java code, exposed to React, or committed to Git. If provider credentials are missing, the system falls back to `DEMO` mode with explicit `DEMO_QUEUED` status and clear failure reasons ("No real SMS provider credentials configured").

---

## 3. Safety Message Formatting Rules

### SMS Payload Formatting
- **Title**: `SIH26001 ALERT`
- **Zone**: Target sector / grid
- **District/State**: Target District, Target State
- **Risk Severity**: `HIGH` / `CRITICAL`
- **Probability**: `88.4%` (if available)
- **Hazard Score**: `8.5/10` (if available)
- **Rainfall**: `124 mm / 24h`
- **Verification Status**: `UNVERIFIED` / `VERIFICATION`
- **Mandatory Safety Disclaimer**: `"Predicted risk — not a confirmed landslide"`

### Voice Call Text-To-Speech (TwiML) Formatting
- **Unconfirmed / Predicted State**:
  > *"SIH26001 emergency warning. High landslide risk has been predicted near Haflong Sector, Dima Hasao. Current predicted risk is 88.4 percent. Verification status is unverified. This prediction is not a confirmed landslide. Please initiate field verification."*
- **Confirmed Incident State**:
  > *"SIH26001 emergency warning. CONFIRMED LANDSLIDE DISASTER EVENT VERIFIED near Haflong Sector, Dima Hasao. Emergency response teams deployed. Please take immediate shelter."*

> [!IMPORTANT]
> The system **NEVER** says "landslide detected" or "confirmed landslide" unless the incident verification status is explicitly `CONFIRMED`.

---

## 4. Role Authorization & Idempotency Rules

1. **Role Access Control**:
   - `ADMIN` & `AUTHORITY`: Full permission to dispatch alerts and send test SMS/Voice calls.
   - `FIELD_OFFICER`: Forbidden (403) from broadcasting emergency alerts.
   - `VIEWER`: Forbidden (403) from dispatching alerts.
2. **Idempotency Window**:
   - Checks `notification_id` by matching `(alert_id, recipient, channel)` within a 10-minute window. Duplicate requests return the existing notification record without sending duplicate SMS/Call payloads.

---

## 5. Endpoints Implemented

1. `POST /api/v1/alerts/dispatch`:
   - Dispatches emergency broadcast alert, persists alert entity, and automatically triggers `SMS` + `VOICE` notifications via `NotificationService`.
2. `POST /api/v1/notifications/test`:
   - Admin/Authority test endpoint to send test SMS and Voice call directly to `ALERT_RECIPIENT_PHONE` (`+919391594979`).
3. `GET /api/v1/notifications`:
   - Returns full audit list of all dispatched notifications stored in the database.

---

## 6. Build & Test Execution Results

- **Spring Boot Maven Suite**: **`BUILD SUCCESS` (11/11 Passed, 0 Failures, 0 Errors)**
  - `LandslidePlatformApplicationTests`: 6/6 Passed
  - `NotificationServiceTest`: 5/5 Passed (testing Demo mode, Twilio credentials, idempotency, role rejection, and safety text rules).
- **React Frontend Build**: **`PASSED`** (`npm run build` completed in 3.63s).
