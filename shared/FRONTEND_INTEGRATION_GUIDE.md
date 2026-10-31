# 🛡️ ScamSentry AI — Frontend Integration Guide

> **Target Developer:** Sartaj (Frontend Lead)  
> **Backend Developer:** Avaish (Backend Lead)  
> **Backend Server:** `http://localhost:8000`  
> **Architecture Concept:** `CHECK → QUICK REPORT → COMMUNITY VERIFICATION → GET SAFETY GUIDANCE → PROTECT OTHERS`  
> **Last Updated:** October 31, 2026 (Quick Reporting & Community Signal Progression)

---

## 1. Core Architecture & Verification Principles

Following mentor feedback, ScamSentry AI separates **community intelligence signals** from **legal accusations**:

1. **One Report ≠ Confirmed Scam:**  
   An initial report flags an identifier as `UNDER_REVIEW`. It is **never** labeled as a confirmed scam. This prevents false accusations and malicious report-bombing.
2. **Quick Report Flow:**  
   Users only need to provide the **Suspicious Identifier** and **Scam Category**. Detailed descriptions and evidence links are completely **optional**, making reporting fast and frictionless.
3. **Multi-Signal Progression:**  
   Risk confidence increases **only** when multiple independent reporters (different salted client fingerprints), geographic spread, and consistent scam categories corroborate the signal.
4. **Immediate User Value (Safety Guidance):**  
   Reporting users are immediately given tailored next-step safety actions (e.g. freezing UPI references, revoking app permissions, changing credentials) to protect themselves and others.
5. **Community Impact:**  
   Every report serves as an early warning for others. There are **zero financial bounties** for reporting, avoiding financial incentives for fake reports.

### Community Evidence vs. Pattern-Based Risk Signals

ScamSentry AI combines two distinct layers of intelligence:

| Layer | Source | Weight | Capability |
| :--- | :--- | :--- | :--- |
| **Community Evidence** | Independent user reports, salted client fingerprints, multi-city geographic spread | **Strongest** | Confirms active scam campaigns and escalates status to `SUSPICIOUS` or `KNOWN_SCAM`. |
| **Pattern Risk Signals** | Structural URL anomalies, brand impersonation, deceptive keywords, suspicious UPI handles, report surges | **Supporting / Early Warning** | Detects suspicious traits even on identifiers with **zero** previous reports. |

> [!IMPORTANT]
> **Core Safety Rule:**  
> **Pattern detection provides an early warning. It does not independently prove that an identifier is fraudulent.**  
> The system must NEVER automatically claim an identifier is definitely a scam based only on patterns. An unknown identifier with suspicious patterns remains `NO_REPORTS` with a `LOW` confidence warning.

### Safe Copy Guidelines for Frontend
- ✅ **Use:** `"Potential risk detected"`, `"Suspicious patterns found"`, `"This identifier requires caution"`, `"Not enough evidence to confirm fraud"`, `"Reported by community members"`, `"Under review"`
- ❌ **Avoid:** `"This is definitely a scam"`, `"This person is a criminal"`, `"Legally confirmed scammer"`, `"Guilty of fraud"`

---

## 2. Local Development Setup & Environment Variables

### Backend Server URL
The FastAPI backend server runs locally on:
```text
http://localhost:8000
```

### Vite Frontend Configuration
In your `frontend/` directory, set the API base URL in `.env` or `.env.local`:
```env
# frontend/.env or frontend/.env.local
VITE_API_BASE_URL=http://localhost:8000
```

In your React/Vite API client:
```typescript
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(errorBody.detail || `Request failed with status ${response.status}`);
  }

  return response.json();
}
```

### CORS Configuration
The backend explicitly permits local Vite development:
- `http://localhost:5173` (Standard Vite dev server)
- `http://127.0.0.1:5173`
- `http://localhost:3000` / `http://127.0.0.1:3000`
- `http://localhost:8000`
- **Supported Methods:** `GET`, `POST`, `OPTIONS`
- **Credentials:** Allowed (`allow_credentials=True`)

> **Path Dual-Routing:**  
> All API endpoints are mounted on **both** `/api/<endpoint>` and root `/<endpoint>` (e.g. `POST /api/lookup` and `POST /lookup` work identically).

---

## 3. Interactive Demo Queries Cheatsheet

Use these exact queries during hackathon presentations and local UI testing to demonstrate the full verification progression:

| Scenario | Exact Search Input | Type | Verdict / Status | Confidence | Score | Pattern Risk | Recommended Action | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Known Scam Phone** | `+91 98765 43210` | `phone` | `KNOWN_SCAM` | `HIGH` | 95 / 100 | 85 / 100 | `DO_NOT_SHARE_MONEY` | High volume across 16 areas; reports spike & category diversity |
| **Suspicious Phone** | `+91 91234 56789` | `phone` | `SUSPICIOUS` | `MEDIUM` | 59 / 100 | 45 / 100 | `PROCEED_WITH_CAUTION` | 2 independent community reports in Bengaluru |
| **Under Review UPI** | `fraud.merchant@okaxis` | `upi` | `UNDER_REVIEW` | `LOW` | 25 / 100 | 25 / 100 | `VERIFY_THROUGH_OFFICIAL_CHANNEL` | 1 initial report; NOT confirmed fraud |
| **Suspicious Pattern UPI (0 Reports)** | `kyc.verify123@okaxis` | `upi` | `NO_REPORTS` | `LOW` | 0 / 100 | 35 / 100 | `VERIFY_THROUGH_OFFICIAL_CHANNEL` | Pattern-based warning; resembles impersonated service terminology |
| **Phishing URL (0 Reports)** | `paypal-security-check.xyz` | `url` | `NO_REPORTS` | `LOW` | 0 / 100 | 75 / 100 | `AVOID_CLICKING_LINK` | High-risk TLD, brand imitation, urgency keywords; zero false accusation |
| **Verified Business** | `1800 123 4567` | `phone` | `VERIFIED_BUSINESS` | `HIGH` | 5 / 100 | 0 / 100 | `PROCEED_WITH_CAUTION` | Official banking toll-free consumer helpline; pattern checks bypassed |
| **Phishing URL (Reported)** | `sbi-kyc-update.in/login` | `url` | `KNOWN_SCAM` | `HIGH` | 96 / 100 | 88 / 100 | `AVOID_CLICKING_LINK` | Fake SBI netbanking login portal collecting credentials; 43 reports |

---

## 4. API Endpoints Specification

### 1. Health Check
Checks if the backend API service is running and healthy.

- **URL:** `GET /health` (or `GET /api/health`)
- **Method:** `GET`
- **Request Body:** None

#### Success Response (`200 OK`)
```json
{
  "status": "ok",
  "service": "ScamSentry AI",
  "message": "API is running"
}
```

---

### 2. Identifier Lookup & Community Risk Intelligence
Checks a phone number, UPI ID, or URL and returns risk score (0–100), verification progression status, confidence level, independent report count, category breakdown, actionable safety guidance, and sanitized recent reports.

- **URL:** `POST /api/lookup` (also supports `GET /api/lookup?query=...`)
- **Method:** `POST`
- **Headers:** `Content-Type: application/json`

#### Request Body
```json
{
  "query": "+91 98765 43210",
  "type": "phone"
}
```
*Field Notes:*
- `query` (string, required): Phone number, UPI ID, or URL. (Also accepts `value`).
- `type` (string, optional): `"phone"` | `"upi"` | `"url"` (auto-detected if omitted).

#### Key Response Fields
- `verdict` (`"KNOWN_SCAM"` | `"SUSPICIOUS"` | `"UNDER_REVIEW"` | `"NO_REPORTS"` | `"VERIFIED_BUSINESS"`): Overall classification based primarily on community corroboration.
- `risk_score` (number `0–100`): Overall composite risk score.
- `pattern_risk_score` (number `0–100`): Structural & heuristic pattern risk score.
- `confidence_level` (`"NONE"` | `"LOW"` | `"MEDIUM"` | `"HIGH"`): Confidence in risk assessment. Uncorroborated pattern warnings are always `LOW`.
- `pattern_summary` (string): Neutral, factual summary of pattern detection findings.
- `recommended_action`:
  - `PROCEED_WITH_CAUTION`: General vigilance recommended.
  - `DO_NOT_SHARE_MONEY`: Financial caution advised; do not transfer money or share OTPs.
  - `VERIFY_THROUGH_OFFICIAL_CHANNEL`: Verify sender independently through published official channels.
  - `AVOID_CLICKING_LINK`: Do not click the URL or submit credentials.
  - `REPORT_TO_1930_IF_MONEY_LOST`: Immediate advisory for victims to contact National Cyber Helpline.
- `risk_signals` (array of objects):
  - `type` (string): e.g. `BRAND_IMPERSONATION`, `SUSPICIOUS_KEYWORD_PATTERN`, `REPORT_SPIKE`, `IP_ADDRESS_URL`, `CATEGORY_DIVERSITY`, `GEOGRAPHIC_SPREAD`.
  - `severity` (`"critical"` | `"high"` | `"medium"` | `"low"`): Severity level of the specific indicator.
  - `message` (string): Human-readable explanation.
  - `confidence` (`"high"` | `"medium"` | `"low"`): Confidence of this specific signal.

#### Success Response (`200 OK`) — Known Scam Phishing URL Example
```json
{
  "success": true,
  "query": "sbi-kyc-update.in/login",
  "target_type": "url",
  "normalized_value": "https://sbi-kyc-update.in/login",
  "verdict": "KNOWN_SCAM",
  "verification_status": "HIGH_RISK",
  "confidence_level": "HIGH",
  "risk_level": "high",
  "risk_score": 96,
  "pattern_risk_score": 88,
  "report_count": 43,
  "independent_report_count": 41,
  "distinct_areas_count": 8,
  "top_category": "phishing",
  "pattern_summary": "Domain name imitates a registered banking institution with verification keywords.",
  "recommended_action": "AVOID_CLICKING_LINK",
  "risk_signals": [
    {
      "type": "BRAND_IMPERSONATION",
      "severity": "high",
      "message": "Domain name appears to imitate a banking-related service ('SBI')",
      "confidence": "high"
    },
    {
      "type": "SUSPICIOUS_KEYWORDS",
      "severity": "medium",
      "message": "URL contains verification-related keywords ('kyc', 'update', 'login')",
      "confidence": "medium"
    },
    {
      "type": "HIGH_COMMUNITY_CORROBORATION",
      "severity": "high",
      "message": "High corroboration: Confirmed by 41 independent community reporters",
      "confidence": "high"
    }
  ],
  "safety_guidance": [
    "Never enter your netbanking password, OTP, or debit card PIN on unverified websites.",
    "Official bank portals will never request KYC renewal via third-party SMS links.",
    "Access netbanking directly by typing the official bank address into your browser."
  ]
}
```

#### Success Response (`200 OK`) — Unknown Identifier with Pattern Signals
```json
{
  "success": true,
  "query": "kyc.verify123@okaxis",
  "target_type": "upi",
  "normalized_value": "kyc.verify123@okaxis",
  "verdict": "NO_REPORTS",
  "verification_status": "NO_REPORTS",
  "confidence_level": "LOW",
  "risk_level": "safe",
  "risk_score": 0,
  "pattern_risk_score": 35,
  "report_count": 0,
  "independent_report_count": 0,
  "pattern_summary": "Some patterns require caution, but there is not enough evidence to confirm fraud.",
  "recommended_action": "VERIFY_THROUGH_OFFICIAL_CHANNEL",
  "risk_signals": [
    {
      "type": "SUSPICIOUS_KEYWORD_PATTERN",
      "severity": "medium",
      "message": "Identifier name resembles commonly impersonated service terminology (e.g. 'kyc', 'verify')",
      "confidence": "low"
    },
    {
      "type": "NUMBERED_SERVICE_HANDLE",
      "severity": "low",
      "message": "Handle combines service keywords with sequential numeric suffix",
      "confidence": "low"
    }
  ],
  "message": "No community reports recorded for this identifier so far. Note: silence does not guarantee safety."
}
```

#### Frontend Display Guidelines: "Why should I be cautious?"
When `risk_signals` are returned or `pattern_risk_score > 0`, the UI renders a dedicated card:
1. **Section Header:** `Why should I be cautious?` + optional `Pattern Risk: {score}/100` badge.
2. **Signals List:** Display `⚠ Suspicious Signals Detected` with each signal's severity badge and descriptive message.
3. **Recommended Action:** Display the recommended next step prominently.
4. **Mandatory Pattern Disclaimer:** For low-confidence signals or 0-report identifiers, always display:
   ```text
   ⚠ Pattern-based warning — this alone does not confirm fraud.
   ```

---

### 3. Quick Report Submission (Fast & Simple)
Submits a community safety signal with minimum effort. Only **Identifier** and **Scam Category** are required; narrative description and evidence references are completely optional.

- **URL:** `POST /api/reports` (or `POST /reports`)
- **Method:** `POST`
- **Headers:** `Content-Type: application/json`

#### Minimal Quick Request Body (Required Fields Only)
```json
{
  "target_value": "fraud.merchant@okaxis",
  "scam_category": "upi_fraud"
}
```

#### Full Request Body (With Optional Context)
```json
{
  "target_value": "+919876543210",
  "target_type": "phone",
  "scam_category": "fake_job",
  "description": "Telegram job scam asking for deposit.",
  "evidence_url": "https://example.com/screenshot.png",
  "evidence_reference": "TXN_987654321",
  "city": "Bengaluru",
  "state": "Karnataka",
  "pincode": "560102"
}
```

*Field Notes:*
- `target_value` (string, required): Phone number, UPI ID, or URL.
- `scam_category` (string, required): One of:
  - `"upi_fraud"`
  - `"fake_job"`
  - `"phishing"`
  - `"digital_arrest"`
  - `"fake_kyc"`
  - `"electricity_bill"`
  - `"loan_scam"`
  - `"investment_fraud"`
  - `"otp_fraud"`
  - `"impersonation"`
  - `"fake_customer_care"`
  - `"lottery"`
  - `"other"`
- `description` (string, **optional**): Brief notes (no minimum length required).
- `evidence_url` (string, **optional**): Screenshot link or image URL.
- `evidence_reference` (string, **optional**): Transaction ID or reference code.
- `city`, `state`, `pincode`, `latitude`, `longitude` (optional).

#### Success Response (`201 Created`)
```json
{
  "status": "success",
  "message": "Report received as a community safety signal. One report alone does not confirm an identifier as a scam. ScamSentry combines independent reports and detected patterns to assess risk.",
  "report_id": "rep_305",
  "normalized_target": "fraud.merchant@okaxis",
  "target_type": "upi",
  "verification_status": "UNDER_REVIEW",
  "confidence_level": "LOW",
  "community_impact_message": "Your report contributes anonymously to ScamSentry's community scam intelligence. One victim's experience can become an early warning for another person.",
  "safety_guidance": [
    "Do not send additional money or approve pending payment/collect requests.",
    "Contact your bank or UPI app support immediately to raise a dispute and freeze the transaction reference.",
    "Report the unauthorized transaction on the National Cyber Crime portal (cybercrime.gov.in) or call 1930."
  ]
}
```

#### Duplicate Report Response (`200 OK`)
If the same client fingerprint submits the same identifier within 24 hours:
```json
{
  "status": "duplicate",
  "message": "Duplicate report detected. You have already submitted a report for this identifier within the last 24 hours.",
  "report_id": "rep_306",
  "normalized_target": "fraud.merchant@okaxis",
  "target_type": "upi",
  "verification_status": "UNDER_REVIEW",
  "confidence_level": "LOW",
  "community_impact_message": "Your report contributes anonymously to ScamSentry's community scam intelligence. One victim's experience can become an early warning for another person.",
  "safety_guidance": [
    "Do not send additional money or approve pending payment/collect requests.",
    "Contact your bank or UPI app support immediately to raise a dispute and freeze the transaction reference.",
    "Report the unauthorized transaction on the National Cyber Crime portal (cybercrime.gov.in) or call 1930."
  ]
}
```

---

### 4. Scam Activity Map
Retrieves aggregated incident counts grouped by area for interactive maps, heatmaps, and city tables.

- **URL:** `GET /api/map` (or `GET /map`)
- **Method:** `GET`
- **Query Parameters:**
  - `days` (integer, optional, default: `7`, range: `1` to `90`)
  - `city` (string, optional)
  - `state` (string, optional)
  - `category` (string, optional)

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "timeframe_days": 7,
  "total_incidents": 179,
  "summary": {
    "total_reports": 179,
    "total_active_areas": 13,
    "highest_activity_area": "HSR Layout",
    "requested_days": 7
  },
  "hotspots": [
    {
      "area": "HSR Layout",
      "city": "Bengaluru",
      "state": "Karnataka",
      "pincode": "560102",
      "latitude": 12.9121,
      "longitude": 77.6446,
      "report_count": 42,
      "dominant_category": "electricity_bill",
      "severity": "critical"
    }
  ],
  "areas": [
    {
      "area_id": 1,
      "name": "HSR Layout",
      "city": "Bengaluru",
      "state": "Karnataka",
      "pincode": "560102",
      "latitude": 12.9121,
      "longitude": 77.6446,
      "report_count": 42,
      "risk_level": "CRITICAL",
      "dominant_category": "electricity_bill"
    }
  ],
  "data": {
    "days": 7,
    "summary": {
      "total_reports": 179,
      "total_active_areas": 13,
      "highest_activity_area": "HSR Layout",
      "requested_days": 7
    },
    "areas": []
  }
}
```

---

### 5. Anomaly & Surge Alerts Feed
Retrieves high-priority surge alerts triggered when abnormal scam spikes or coordinated fraud patterns are detected.

- **URL:** `GET /api/alerts` (or `GET /alerts`)
- **Method:** `GET`
- **Query Parameters:**
  - `days` (default: `7`)
  - `severity` (`critical`, `high`, `medium`, `low`)
  - `city` (string, optional)
  - `limit` (default: `20`)
  - `detect` (boolean, default: `false`)

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "summary": {
    "total_alerts": 5,
    "critical_alerts": 1,
    "high_alerts": 2
  },
  "alerts": [
    {
      "alert_id": 1,
      "id": "alt_1",
      "anomaly_type": "SPIKE",
      "severity": "HIGH",
      "anomaly_score": 4.5,
      "title": "Sudden Spike in Digital Arrest Scams",
      "explanation": "18 reports in 24 hours in HSR Layout, about 4.5× the usual 4 a day. Mostly digital arrest.",
      "affected_area": "HSR Layout",
      "region": "HSR Layout, Bengaluru",
      "incident_count_last_24h": 18,
      "surge_percentage": "+320%",
      "advice": "Do not transfer money or share OTPs with unverified contacts.",
      "sample_indicators": [
        "+91987*****10",
        "b***y@fakeupi"
      ],
      "detected_at": "2026-10-31T09:30:00Z",
      "created_at": "2026-10-31T09:30:00Z"
    }
  ]
}
```

---

### 6. Trigger Anomaly Detection Scan
Explicitly runs the anomaly detection pipeline to detect new spikes, emerging categories, and identifier surges across the database.

- **URL:** `POST /api/alerts/detect`
- **Method:** `POST`

#### Success Response (`200 OK`)
```json
{
  "status": "success",
  "message": "Anomaly detection scan completed successfully.",
  "results": {
    "anomalies_detected": 4,
    "alerts_created": 1,
    "alerts_updated": 3,
    "spikes": 2,
    "new_types": 1,
    "surges": 1
  }
}
```

---

### 7. Demo Reset & Re-seeding Utility
Allows the frontend to reset and repopulate the database with the hackathon dataset at any time during practice or between demo runs.

- **URL:** `POST /api/admin/reset`
- **Method:** `POST`
- **Request Body:** `{ "seed_demo_data": true }`

#### Success Response (`200 OK`)
```json
{
  "status": "success",
  "message": "Database cleared and seeded with hackathon demo data.",
  "counts": {
    "areas": 16,
    "identifiers": 9,
    "reports": 291,
    "alerts": 5
  }
}
```

---

## 5. Immediate Safety Guidance by Category

The backend automatically attaches actionable safety steps (`safety_guidance`) to both report submissions and lookup results based on the primary category:

| Category | Top Safety Recommendation |
| :--- | :--- |
| **`upi_fraud`** | Freeze transaction reference with bank/UPI app immediately; dispute via cybercrime.gov.in / 1930. |
| **`fake_job`** | Never pay registration or deposit fees; verify through official corporate careers pages. |
| **`phishing`** | Change passwords immediately on accounts entered; turn on 2FA via authenticator app. |
| **`digital_arrest`** | Law enforcement NEVER conducts arrests or demands bail on video calls; disconnect and call 1930. |
| **`fake_kyc`** | Utilities/banks never demand screen-sharing apps (AnyDesk, TeamViewer) to update KYC. |
| **`electricity_bill`**| Utility boards never cut power within 30 minutes via SMS or personal WhatsApp messages. |
| **`loan_scam`** | Never pay upfront 'insurance' fees; borrow only from RBI-registered NBFCs. |
| **`investment_fraud`**| Guaranteed high returns are a hallmark of fraud; verify advisors on sebi.gov.in. |
| **`otp_fraud`** | Never share OTPs or PINs; bank executives will NEVER ask for password reset codes. |

---

## 6. Privacy & Anti-Abuse Protections Summary

1. **Zero Personally Identifiable Information (PII) Stored:** No plain-text IPs or device IDs.
2. **Salted Reporter Fingerprints:** Reports use salted SHA-256 (`SHA256(ip + user_agent + daily_salt)`).
3. **Independent Reporter Weighting:** Multiple reports from the same client fingerprint count as only 1 independent reporter signal, preventing artificial rating inflation.
4. **Rate Limiting:** Anonymous reporters are limited to 5 submissions per rolling 1-hour window (subsequent attempts return `429 Too Many Requests`).
5. **Duplicate Protection:** Re-submitting the same identifier within 24 hours returns `status: "duplicate"` (HTTP `200`) without polluting community risk scores.
