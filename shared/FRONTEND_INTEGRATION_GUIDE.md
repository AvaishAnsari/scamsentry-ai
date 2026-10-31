# 🛡️ ScamSentry AI — Frontend Integration Guide

> **Target Developer:** Sartaj (Frontend Lead)  
> **Backend Developer:** Avaish (Backend Lead)  
> **Backend Server:** `http://localhost:8000`  
> **Last Verified:** October 31, 2026 (Milestone 4 & Integration Review Complete)

---

## 1. Local Development Setup & Environment Variables

### Backend Server URL
The FastAPI backend server runs locally on:
```text
http://localhost:8000
```

### Vite Frontend Configuration
In your `frontend/` directory, set the API base URL in your `.env` or `.env.local` file:
```env
# frontend/.env or frontend/.env.local
VITE_API_BASE_URL=http://localhost:8000
```

In your React/Vite API client (e.g. `src/api/client.js` or `src/utils/api.ts`):
```typescript
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

// Example fetch wrapper
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
The backend explicitly permits local Vite and React development:
- `http://localhost:5173` (Standard Vite dev server)
- `http://127.0.0.1:5173`
- `http://localhost:3000` (React dev server fallback)
- `http://127.0.0.1:3000`
- `http://localhost:8000` (Direct origin)
- **Supported Methods:** `GET`, `POST`, `OPTIONS`
- **Supported Headers:** All standard headers (`Content-Type`, `Authorization`, `X-Forwarded-For`, etc.)
- **Credentials:** Allowed (`allow_credentials=True`)

> **Path Dual-Routing Notice:**  
> All API endpoints are mounted on **both** `/api/<endpoint>` and root `/<endpoint>` (e.g. `POST /api/lookup` and `POST /lookup` both work identically). You do not need to worry about route prefix discrepancies.

---

## 2. Interactive Demo Queries Cheatsheet

Use these exact queries during hackathon presentations and local UI testing:

| Query Scenario | Exact Search Input | Expected Target Type | Expected Verdict | Expected Risk Level | Expected Score | Seed Reports | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Known Scam Phone** | `+91 98765 43210` (or `98765 43210`) | `phone` | `KNOWN_SCAM` | `high` | 95 / 100 | 127 reports | Digital arrest, KYC fraud, and loan scams across 16 areas |
| **Suspicious Phone** | `+91 91234 56789` (or `91234 56789`) | `phone` | `SUSPICIOUS` | `suspicious` | 59 / 100 | 2 reports | 2 accepted reports in Bengaluru (UPI fraud / customer care) |
| **Phishing URL** | `sbi-kyc-update.in/login` | `url` | `KNOWN_SCAM` | `high` | 96 / 100 | 43 reports | Fake SBI netbanking login portal collecting credentials |
| **Unreported UPI** | `kyc.update92@okaxis` | `upi` | `NO_REPORTS` | `safe` | 0 / 100 | 0 reports | New or unflagged UPI VPA; displays warning disclaimer |
| **Verified Business**| `1800 123 4567` | `phone` | `VERIFIED_BUSINESS`| `safe` | 5 / 100 | 0 reports | Official banking toll-free consumer helpline |

---

## 3. API Endpoints Specification

### 1. Health Check
Checks if the backend API service is running and healthy.

- **URL:** `GET /health` (also available at `GET /api/health`)
- **Method:** `GET`
- **Request Body:** None
- **Query Parameters:** None

#### Success Response (`200 OK`)
```json
{
  "status": "ok",
  "service": "ScamSentry AI",
  "message": "API is running"
}
```

#### Frontend Notes
Use this in the navbar or footer to display a live service indicator (🟢 **Service Online**).

---

### 2. Identifier Lookup & Risk Assessment
Checks a phone number, UPI ID, or URL and returns a transparent risk score (0–100), community report counts, category breakdown, and sanitized recent reports.

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
- `type` (string, optional): `"phone"` | `"upi"` | `"url"`. If omitted, the backend auto-detects the type automatically.

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "query": "+91 98765 43210",
  "target_type": "phone",
  "normalized_value": "+919876543210",
  "verdict": "KNOWN_SCAM",
  "risk_level": "high",
  "risk_score": 95,
  "report_count": 127,
  "first_reported": "2026-08-01T04:30:00Z",
  "last_reported": "2026-10-31T09:45:00Z",
  "top_category": "digital_arrest",
  "distinct_areas_count": 16,
  "message": "High risk. Reported by 127 user(s) as a potential scam. Most frequent category: digital arrest.",
  "recent_reports": [
    {
      "category": "digital_arrest",
      "description": "Pretended to be CBI/Police on video call demanding bail deposit.",
      "city": "Bengaluru",
      "reported_at": "2026-10-31T09:45:00Z"
    },
    {
      "category": "fake_kyc",
      "description": "Sent fake SMS claiming bank account suspended until KYC update.",
      "city": "Bengaluru",
      "reported_at": "2026-10-31T07:15:00Z"
    }
  ]
}
```

#### Verdict Values & UI Guidance
- `KNOWN_SCAM` (Red badge 🔴): `risk_level: "high"`, Score >= 60 or Reports >= 3. Advise user: *Do NOT interact, transfer money, or click links.*
- `SUSPICIOUS` (Amber badge 🟡): `risk_level: "suspicious"`, Score 20–59 or Reports 1–2. Advise user: *Proceed with caution. Do not share OTPs.*
- `NO_REPORTS` (Slate badge ⚪): `risk_level: "safe"`, Score 0, Reports 0. Advise user: *No reports logged yet. Silence does not guarantee safety.*
- `VERIFIED_BUSINESS` (Emerald badge 🟢): `risk_level: "safe"`, Score 5. Advise user: *Verified official entity / toll-free helpline.*

#### Error Responses
- **`400 Bad Request`** (Empty or invalid format):
```json
{
  "detail": "Invalid Indian mobile number '12345'. Must be 10 digits starting with 6, 7, 8, or 9."
}
```

---

### 3. Submit Anonymous Scam Report
Allows community users to report an incident with automatic phone/UPI/URL normalization, rate limiting, duplicate protection, and geo-clustering.

- **URL:** `POST /api/reports` (also available at `POST /reports`)
- **Method:** `POST`
- **Headers:** `Content-Type: application/json`

#### Request Body
```json
{
  "target_value": "+919876543210",
  "target_type": "phone",
  "scam_category": "fake_job",
  "description": "Offered ₹3,000/day for liking YouTube videos. Asked for ₹5,000 deposit via Telegram.",
  "city": "Bengaluru",
  "state": "Karnataka",
  "pincode": "560102",
  "area_name": "HSR Layout",
  "latitude": 12.9121,
  "longitude": 77.6446
}
```
*Field Notes:*
- `target_value` (string, required): Raw input identifier (also accepts `query`).
- `target_type` (string, optional): `"phone"` | `"upi"` | `"url"` (auto-detected if omitted).
- `scam_category` (string, required): One of:
  - `"fake_job"`
  - `"digital_arrest"`
  - `"fake_kyc"`
  - `"electricity_bill"`
  - `"upi_fraud"`
  - `"loan_scam"`
  - `"phishing"`
  - `"impersonation"`
  - `"lottery"`
  - `"other"`
- `description` (string, required): Incident details (**minimum 10 characters**).
- `city`, `state` (string, optional): Geographic names for area grouping.
- `pincode` (string, optional): 6-digit PIN code.
- `latitude`, `longitude` (float, optional): Map coordinates.

#### Success Response (`201 Created`)
```json
{
  "status": "success",
  "message": "Report submitted successfully",
  "report_id": "rep_301",
  "normalized_target": "+919876543210",
  "target_type": "phone"
}
```

#### Duplicate Report Response (`200 OK`)
If the same client fingerprint submits the same identifier and scam category within 24 hours:
```json
{
  "status": "duplicate",
  "message": "Duplicate report detected. You have already submitted a report for this identifier within the last 24 hours.",
  "report_id": "rep_302",
  "normalized_target": "+919876543210",
  "target_type": "phone"
}
```

#### Error Responses
- **`400 Bad Request`** (Missing or invalid input):
```json
{
  "detail": "Report description must be at least 10 characters explaining what happened."
}
```
- **`429 Too Many Requests`** (Rate limit exceeded: max 5 reports / hour):
```json
{
  "detail": "Rate limit exceeded: maximum 5 reports per hour. Please try again later."
}
```

---

### 4. Scam Activity Map
Retrieves aggregated incident counts grouped by area for interactive maps, heatmaps, and city tables.

- **URL:** `GET /api/map` (also available at `GET /map`)
- **Method:** `GET`
- **Query Parameters:**
  - `days` (integer, optional, default: `7`, range: `1` to `90`): Timeframe in days.
  - `city` (string, optional): Filter by city (e.g. `Bengaluru`, `Mumbai`, `Noida`).
  - `state` (string, optional): Filter by state (e.g. `Karnataka`, `Maharashtra`).
  - `category` (string, optional): Filter by scam type (e.g. `digital_arrest`, `electricity_bill`).

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "timeframe_days": 7,
  "total_incidents": 178,
  "summary": {
    "total_reports": 178,
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
    },
    {
      "area": "Koramangala",
      "city": "Bengaluru",
      "state": "Karnataka",
      "pincode": "560034",
      "latitude": 12.9352,
      "longitude": 77.6245,
      "report_count": 28,
      "dominant_category": "upi_fraud",
      "severity": "high"
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
      "total_reports": 178,
      "total_active_areas": 13,
      "highest_activity_area": "HSR Layout",
      "requested_days": 7
    },
    "areas": []
  }
}
```

#### Area Severity Thresholds
- `CRITICAL` (>= 35 reports in window): Immediate active fraud surge.
- `HIGH` (20 – 34 reports in window): Frequent syndicate activity.
- `MEDIUM` (5 – 19 reports in window): Moderate activity.
- `LOW` (1 – 4 reports in window): Sporadic reports.
- `NONE` (0 reports in window).

---

### 5. Anomaly & Surge Alerts Feed
Retrieves high-priority surge alerts triggered when abnormal scam spikes or coordinated fraud patterns are detected.

- **URL:** `GET /api/alerts` (also available at `GET /alerts`)
- **Method:** `GET`
- **Query Parameters:**
  - `days` (integer, optional, default: `7`, range: `1` to `90`): History window.
  - `severity` (string, optional): `"critical"` | `"high"` | `"medium"` | `"low"`.
  - `city` (string, optional): Filter by city (e.g. `Bengaluru`).
  - `limit` (integer, optional, default: `20`, max: `100`).
  - `detect` (boolean, optional, default: `false`): If `true`, runs the detection engine before returning.

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

#### Anomaly Types
- `SPIKE`: Area report count significantly exceeds the 7-day rolling baseline (>= 2.0x surge).
- `NEW_SCAM_TYPE`: New fraud category appearing in an area for the first time in 30 days.
- `IDENTIFIER_SURGE`: Sudden multi-report surge targeting a specific phone number, UPI ID, or URL within 48 hours.

---

### 6. Trigger Anomaly Detection Scan
Explicitly runs the anomaly detection pipeline to detect new spikes, emerging categories, and identifier surges across the database.

- **URL:** `POST /api/alerts/detect` (also available at `POST /alerts/detect`)
- **Method:** `POST`
- **Request Body:** None (or `{}`)

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

### 7. Demo Reset & Re-seeding Utility (For Rehearsals)
Allows the frontend to reset and repopulate the database with the hackathon dataset at any time during practice or between demo runs.

- **URL:** `POST /api/admin/reset`
- **Method:** `POST`
- **Request Body:**
```json
{
  "seed_demo_data": true
}
```

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

## 4. Privacy & Anti-Abuse Protections Summary

1. **Zero Personally Identifiable Information (PII) Stored:**  
   The backend does not store reporter IP addresses or client identifiers in plain text.
2. **Salted Reporter Fingerprinting:**  
   Reports are salt-hashed using SHA-256 (`SHA256(ip + user_agent + daily_salt)`).
3. **No Sensitive Reporter Data in Responses:**  
   API responses never expose reporter IPs, hashes, or identities.
4. **Identifier Masking in Alerts:**  
   Public indicator lists mask digits and UPI handles (e.g., `+91987*****10`, `b***y@fakeupi`).
5. **Rate Limiting:**  
   Anonymous reporters are limited to 5 submissions per rolling 1-hour window. Subsequent attempts return HTTP `429 Too Many Requests`.
6. **Duplicate Protection:**  
   Repeated reports from the same client for the same identifier within 24 hours return `status: "duplicate"` (HTTP `200`) without polluting community risk scores.

---

## 5. Support & Live Communication

- **Backend Contact:** Avaish (Backend Lead)
- **Local Swagger UI:** `http://localhost:8000/docs`
- **ReDoc Interactive Spec:** `http://localhost:8000/redoc`
