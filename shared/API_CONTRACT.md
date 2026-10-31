# 🛡️ ScamSentry AI — API Contract

> **Base URL:** `http://localhost:8000`  
> **Content-Type:** `application/json`  
> **Target Audience:** Backend (Avaish) & Frontend (Sartaj)

---

## Overview

This contract defines the official REST API interface between the FastAPI backend and the React frontend. It provides simple, predictable JSON structures optimized for rapid 24-hour hackathon development.

---

## 1. Health Check

### `GET /health`
Verifies that the backend service is running and accessible.

- **Purpose:** Liveness and diagnostic probe.
- **Method:** `GET`
- **Request Parameters / Body:** None

#### Success Response
- **Status Code:** `200 OK`
```json
{
  "status": "ok",
  "service": "ScamSentry AI",
  "message": "API is running"
}
```

#### Error Response
- **Status Code:** `500 Internal Server Error`
```json
{
  "detail": "Internal server error"
}
```

---

## 2. Submit Scam Report

### `POST /reports`
Allows users to anonymously report a suspicious phone number, UPI ID, or URL.

- **Purpose:** Crowd-sourced scam reporting with geo-tagging and category classification.
- **Method:** `POST`
- **Request Headers:**
  - `Content-Type: application/json`

#### Request Body
```json
{
  "target_type": "phone",
  "target_value": "+919876543210",
  "scam_category": "fake_job",
  "description": "Asked to deposit ₹5,000 for Telegram task job.",
  "city": "Mumbai",
  "state": "Maharashtra",
  "pincode": "400001",
  "latitude": 19.0760,
  "longitude": 72.8777
}
```

> **Field Notes:**
> - `target_type`: `"phone"` | `"upi"` | `"url"` (Required)
> - `target_value`: Sanitized phone number, UPI VPA (e.g., `user@bank`), or domain/URL (Required)
> - `scam_category`: `"fake_job"` | `"lottery"` | `"electricity_bill"` | `"kyc_fraud"` | `"impersonation"` | `"other"` (Required)
> - `description`: Brief text explaining the incident (Required)
> - `city`, `state`: Geographic identifiers (Required)
> - `pincode`: Optional 6-digit postal code
> - `latitude`, `longitude`: Optional coordinates for precise map plotting

#### Success Response
- **Status Code:** `201 Created`
```json
{
  "status": "success",
  "message": "Report submitted successfully",
  "report_id": "rep_102938"
}
```

#### Error Responses
- **Status Code:** `400 Bad Request`
```json
{
  "detail": "Invalid target_value format for target_type 'phone'"
}
```
- **Status Code:** `429 Too Many Requests`
```json
{
  "detail": "Rate limit exceeded. Too many reports submitted from this client."
}
```

---

## 3. Scam Lookup & Verification

### `GET /lookup`
Checks whether an identifier (phone, UPI ID, or URL) has been reported and returns its aggregated risk assessment.

- **Purpose:** "Check before you trust" verification search.
- **Method:** `GET`
- **Query Parameters:**
  - `query` (string, required): The phone number, UPI ID, or URL to inspect.
  - `type` (string, optional): `"phone"` | `"upi"` | `"url"`

#### Success Response
- **Status Code:** `200 OK`
```json
{
  "query": "+919876543210",
  "target_type": "phone",
  "risk_level": "high",
  "risk_score": 85,
  "report_count": 14,
  "first_reported": "2026-10-25T10:00:00Z",
  "last_reported": "2026-10-31T09:30:00Z",
  "top_category": "fake_job",
  "recent_reports": [
    {
      "category": "fake_job",
      "description": "Asked to deposit ₹5,000 for Telegram task job.",
      "city": "Mumbai",
      "reported_at": "2026-10-31T09:30:00Z"
    }
  ]
}
```

> **Risk Level Values:** `"safe"` (score 0–19), `"suspicious"` (score 20–59), `"high"` (score 60–100).

#### Error Responses
- **Status Code:** `400 Bad Request`
```json
{
  "detail": "Query parameter 'query' is required"
}
```

---

## 4. Community Scam Map

### `GET /map`
Retrieves aggregated scam clusters and incident counts for interactive map visualization.

- **Purpose:** Render heatmaps, markers, and area breakdown (defaults to last 7 days).
- **Method:** `GET`
- **Query Parameters:**
  - `days` (integer, optional, default: `7`): Days of history to inspect.
  - `state` (string, optional): Filter by state.
  - `city` (string, optional): Filter by city.
  - `category` (string, optional): Filter by scam type.

#### Success Response
- **Status Code:** `200 OK`
```json
{
  "timeframe_days": 7,
  "total_incidents": 142,
  "hotspots": [
    {
      "area": "Noida Sector 62",
      "city": "Noida",
      "state": "Uttar Pradesh",
      "latitude": 28.6280,
      "longitude": 77.3649,
      "report_count": 28,
      "dominant_category": "fake_job",
      "severity": "high"
    },
    {
      "area": "Andheri East",
      "city": "Mumbai",
      "state": "Maharashtra",
      "latitude": 19.1136,
      "longitude": 72.8697,
      "report_count": 19,
      "dominant_category": "electricity_bill",
      "severity": "medium"
    }
  ]
}
```

#### Error Response
- **Status Code:** `400 Bad Request`
```json
{
  "detail": "Invalid days parameter. Must be between 1 and 30."
}
```

---

## 5. Anomaly & Surge Alerts

### `GET /alerts`
Fetches high-priority alerts triggered when abnormal scam spikes or coordinated fraud patterns are detected.

- **Purpose:** "Receive alerts only when unusual scam activity is detected."
- **Method:** `GET`
- **Query Parameters:**
  - `city` (string, optional): Filter alerts by city.
  - `limit` (integer, optional, default: `10`): Max alerts to retrieve.

#### Success Response
- **Status Code:** `200 OK`
```json
{
  "alerts": [
    {
      "id": "alt_01",
      "title": "Sudden Spike in Electricity Bill Scams",
      "region": "Bengaluru, Karnataka",
      "severity": "critical",
      "incident_count_last_24h": 45,
      "surge_percentage": "+320%",
      "sample_indicators": ["98765xxxxx", "billpay@fakeupi"],
      "advice": "Do not call back unauthorized numbers threatening immediate power disconnection.",
      "detected_at": "2026-10-31T08:00:00Z"
    }
  ]
}
```

---

## 6. Admin Reset & Demo Seeding

### `POST /admin/reset`
Resets the database and optionally seeds consistent demo data for hackathon demonstrations.

- **Purpose:** Development, rapid testing, and demo environment resets.
- **Method:** `POST`
- **Request Headers:**
  - `X-Admin-Key` (string, optional): Master key for protected environments.
- **Request Body:**
```json
{
  "seed_demo_data": true
}
```

#### Success Response
- **Status Code:** `200 OK`
```json
{
  "status": "success",
  "message": "Database cleared and seeded with hackathon demo data."
}
```

#### Error Response
- **Status Code:** `401 Unauthorized`
```json
{
  "detail": "Invalid or missing admin credentials"
}
```

---

## 7. License Information

### `GET /license`
Returns project license terms and open-source usage permissions.

- **Purpose:** Open source compliance and information.
- **Method:** `GET`
- **Request Parameters / Body:** None

#### Success Response
- **Status Code:** `200 OK`
```json
{
  "license": "MIT",
  "project": "ScamSentry AI",
  "copyright": "Copyright (c) 2026 ScamSentry AI Team",
  "terms": "Free for public safety and community scam verification."
}
```

---

## 8. License & API Key Registration

### `POST /license`
Registers or verifies developer/community access credentials for institutional integration.

- **Purpose:** Issue API keys or register consumer apps.
- **Method:** `POST`
- **Request Body:**
```json
{
  "organization_name": "Cyber Defense Club",
  "contact_email": "contact@cyberdefense.org",
  "intended_use": "community_dashboard"
}
```

#### Success Response
- **Status Code:** `201 Created`
```json
{
  "status": "success",
  "api_key": "sentry_live_test_key_xxxx",
  "tier": "community",
  "rate_limit_per_minute": 60
}
```

#### Error Response
- **Status Code:** `400 Bad Request`
```json
{
  "detail": "organization_name and contact_email are required"
}
```
