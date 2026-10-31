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

### Safe Copy Guidelines for Frontend
- ✅ **Use:** `"Reported by community members"`, `"Under review"`, `"Multiple independent reports detected"`, `"High risk based on community signals"`
- ❌ **Avoid:** `"This person is a criminal"`, `"Legally confirmed scammer"`, `"Guilty of fraud"`

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

| Scenario | Exact Search Input | Type | Verdict / Status | Confidence | Score | Reports | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Known Scam Phone** | `+91 98765 43210` | `phone` | `KNOWN_SCAM` (`HIGH_RISK`) | `HIGH` | 95 / 100 | 127 | High volume across 16 areas (Digital arrest, KYC fraud, loan scams) |
| **Suspicious Phone** | `+91 91234 56789` | `phone` | `SUSPICIOUS` | `MEDIUM` | 59 / 100 | 2 | 2 independent community reports in Bengaluru |
| **Under Review UPI** | `fraud.merchant@okaxis` | `upi` | `UNDER_REVIEW` | `LOW` | 25 / 100 | 1 | 1 initial report; NOT confirmed fraud |
| **Unreported UPI** | `kyc.update92@okaxis` | `upi` | `NO_REPORTS` | `NONE` | 0 / 100 | 0 | Unflagged identifier; displays safety disclaimer |
| **Verified Business**| `1800 123 4567` | `phone` | `VERIFIED_BUSINESS` | `HIGH` | 5 / 100 | 0 | Official banking toll-free consumer helpline |
| **Phishing URL** | `sbi-kyc-update.in/login` | `url` | `KNOWN_SCAM` (`HIGH_RISK`) | `HIGH` | 96 / 100 | 43 | Fake SBI netbanking login portal collecting credentials |

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

#### Success Response (`200 OK`) — Known Scam Example
```json
{
  "success": true,
  "query": "+91 98765 43210",
  "target_type": "phone",
  "normalized_value": "+919876543210",
  "verdict": "KNOWN_SCAM",
  "verification_status": "HIGH_RISK",
  "confidence_level": "HIGH",
  "risk_level": "high",
  "risk_score": 95,
  "report_count": 127,
  "independent_report_count": 127,
  "first_reported": "2026-08-01T04:30:00Z",
  "last_reported": "2026-10-31T09:45:00Z",
  "top_category": "digital_arrest",
  "distinct_areas_count": 16,
  "message": "High-risk based on 127 independent community reports and detected patterns. Primary reported category: digital arrest.",
  "community_impact_message": "Community reports serve as early warning signals to help others check before they trust.",
  "safety_guidance": [
    "Police, CBI, ED, and customs officials NEVER conduct 'digital arrests' or demand bail money over video calls.",
    "Disconnect the call immediately and do not transfer funds to 'verification' or 'safe' accounts.",
    "Contact your local police station or dial the National Cyber Crime Helpline at 1930 immediately."
  ],
  "recent_reports": [
    {
      "category": "digital_arrest",
      "description": "Pretended to be CBI/Police on video call demanding bail deposit.",
      "city": "Bengaluru",
      "reported_at": "2026-10-31T09:45:00Z"
    }
  ]
}
```

#### Success Response (`200 OK`) — Under Review Example (1 Report)
```json
{
  "success": true,
  "query": "fraud.merchant@okaxis",
  "target_type": "upi",
  "normalized_value": "fraud.merchant@okaxis",
  "verdict": "UNDER_REVIEW",
  "verification_status": "UNDER_REVIEW",
  "confidence_level": "LOW",
  "risk_level": "low",
  "risk_score": 25,
  "report_count": 1,
  "independent_report_count": 1,
  "first_reported": "2026-10-30T10:00:00Z",
  "last_reported": "2026-10-30T10:00:00Z",
  "top_category": "fake_job",
  "distinct_areas_count": 1,
  "message": "This identifier has received an initial community report and is currently under review. One report does not confirm fraud; additional independent signals are required.",
  "community_impact_message": "Community reports serve as early warning signals to help others check before they trust.",
  "safety_guidance": [
    "Do not pay registration, training, or deposit fees—legitimate employers never charge candidates.",
    "Verify job offers through official company careers websites rather than Telegram or WhatsApp.",
    "Never share sensitive documents (Aadhaar, PAN, bank passbooks) with unverified recruiters."
  ],
  "recent_reports": []
}
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
