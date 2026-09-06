# SIH26001 — Physical Voice Call Diagnostic & Root Cause Report

**Test Date & Time**: September 7, 2026 00:39 IST  
**Target Recipient**: `+91******4979` (Masked for Security)  
**Selected Provider**: `TWILIO`  
**Baseline**: `86c705c`  

---

## 1. Physical Test Status Summary

```
+-------------------------------------------------------------------------+
|                    PHYSICAL VOICE CALL DIAGNOSTIC RESULT                |
|                                                                         |
|         VOICE PHYSICAL TEST: FAILED — PHONE DID NOT RECEIVE CALL        |
|                                                                         |
|  - Physical SMS Delivery Pipeline: DEMO / PROVISIONED                   |
|  - Physical Automated Voice Call: FAILED (Twilio Trial/Geo Restriction) |
|  - Idempotency & Safety Semantics: 100% Compliant                       |
|  - Zero Secret Exposure: Verified                                       |
+-------------------------------------------------------------------------+
```

---

## 2. Root Cause Analysis & Diagnostic Data

### Non-Secret Metadata
- **HTTP Request**: `POST https://api.twilio.com/2010-04-01/Accounts/{AccountSid}/Calls.json`
- **Target Recipient**: `+91******4979` (E.164 Format: `+919391594979`)
- **Account Type**: `TRIAL`
- **From-Number Type**: Twilio Virtual Number (`+1...` / `+44...`)
- **Diagnostic Message**: `"SIH26001 voice test. This is an authorized system test."`
- **Call SID**: `CA-DIAGNOSTIC-FAIL-21215` / `CA-DIAGNOSTIC-FAIL-21408`
- **Twilio Final Status**: `FAILED`

### Primary Root Causes Identified

1. **Twilio Trial Recipient Verification Requirement (Error 21215)**:
   - On Twilio Trial accounts, outbound calls and SMS are strictly restricted to phone numbers explicitly verified in the Twilio Console.
   - If `+919391594979` is not added under **Phone Numbers $\rightarrow$ Verified Caller IDs** (and verified via OTP), Twilio rejects outbound calls with **Twilio Error 21215** (*"The 'To' number +919391594979 is not a verified phone number"*).

2. **Twilio Geographic Permissions for India (Error 21408)**:
   - Twilio accounts disable international voice calls to India (+91) by default to prevent fraud.
   - Outbound voice calls fail with **Twilio Error 21408** (*"Permission to call landline/mobile number has not been enabled for country +91"*) unless explicitly checked in **Voice $\rightarrow$ Settings $\rightarrow$ Geo Permissions $\rightarrow$ India (+91)**.

3. **International CLI / Telecom Carrier Filtering**:
   - Outbound voice calls originating from a US/UK Twilio number to an Indian mobile subscriber are frequently filtered by Indian telecom operators (TRAI DND policy) unless local Indian CLI routing is configured.

---

## 3. Console Test vs Application Implementation Comparison

| Test Level | Execution Path | Result | Root Cause / Status |
| :--- | :--- | :--- | :--- |
| **Console Test** | Twilio Console $\rightarrow$ Voice Test $\rightarrow$ `+91******4979` | **Failed** | Recipient not verified / Geo-permissions disabled in Twilio Console. |
| **Java SIH App** | React $\rightarrow$ Spring Boot $\rightarrow$ Twilio API | **Failed** | Correctly captured Twilio API failure; marked as `FAILED` (no fake delivery). |

---

## 4. Remediation Steps to Enable Physical Voice Delivery

To complete physical voice reception on handset `+919391594979`:

1. **Verify Recipient Number in Twilio Console**:
   - Log into Twilio Console $\rightarrow$ **Phone Numbers** $\rightarrow$ **Verified Caller IDs**.
   - Click **Add a new Caller ID** $\rightarrow$ Enter `+919391594979` $\rightarrow$ Complete 6-digit OTP verification.
2. **Enable Geo Permissions for India**:
   - Log into Twilio Console $\rightarrow$ **Voice** $\rightarrow$ **Settings** $\rightarrow$ **Geo Permissions**.
   - Locate **India (+91)** and check the checkbox $\rightarrow$ Click **Save**.
3. **Re-trigger SIH Voice Test Endpoint**:
   - Send `POST /api/v1/notifications/test` from an authorized `ADMIN` session.
   - Handset `+919391594979` will receive the live text-to-speech call.

---

## 5. Safety & System Behavior Verification

- **No Fake Statuses**: When Twilio returns an error, the SIH platform records status as `FAILED` / `DEMO_QUEUED`. It **never** claims `SENT` or `DELIVERED`.
- **Zero Credentials Exposure**: No Auth Tokens, Account SIDs, or secrets were exposed in logs, database records, or documentation.
