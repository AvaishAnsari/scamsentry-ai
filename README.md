# 🛡️ ScamSentry AI

> **Explain the Scam. Connect the Clues. Protect the User.**  
> *A community-powered scam map and real-time fraud intelligence network tailored for India.*

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI_0.110+-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/Frontend-React_18_%2B_Vite-61DAFB.svg?logo=react&logoColor=black)](https://vitejs.dev/)
[![TypeScript](https://img.shields.io/badge/Language-TypeScript_5.5-3178C6.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Styling-Tailwind_CSS_3.4-38B2AC.svg?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Chrome Extension](https://img.shields.io/badge/Extension-Manifest_V3-4285F4.svg?logo=googlechrome&logoColor=white)](https://developer.chrome.com/docs/extensions/mv3/)
[![Tests](https://img.shields.io/badge/Tests-66%2F66_Passing-success.svg)](https://pytest.org)
[![Status](https://img.shields.io/badge/Status-Hackathon_Final_Integrated-brightgreen.svg)](#-hackathon-demo--showcase-scenarios)

---

## 📌 Problem Statement

Digital financial fraud in India has reached crisis levels across UPI payment traps, fake KYC phishing, impersonation ("Digital Arrest") scams, and predatory loan apps. Citizens currently face three critical vulnerabilities:

1. **Pre-Transaction Blindness:** No frictionless way to check if an unknown caller, UPI VPA, or link has already defrauded other citizens before transferring funds or entering OTPs.
2. **Hyperlocal Blind Spots:** Lack of visibility into whether a specific neighborhood or pincode is experiencing an active syndicate outbreak.
3. **Bureaucratic Reporting Delay:** Official cybercrime portals are retrospective and time-consuming; there is no instant, anonymous community warning mechanism that immediately protects neighbors.

---

## 💡 Solution Overview

**ScamSentry AI** acts as a crowd-corroborated, AI-assisted frontline defense:

```
┌─────────────────┐      ┌───────────────────────────┐      ┌─────────────────────────┐
│ Citizen Lookup  │ ───► │  ScamSentry Risk Engine   │ ◄─── │ Chrome Extension (MV3)  │
│ Phone / UPI /   │      │  • Multi-Vector Corrob    │      │ Active Tab URL Scans &  │
│ Website Links   │      │  • Pattern Heuristics     │      │ 1-Click Investigation   │
└─────────────────┘      │  • Anomaly Surge Model    │      └─────────────────────────┘
                         └─────────────┬─────────────┘
                                       │
        ┌──────────────────────────────┼──────────────────────────────┐
        ▼                              ▼                              ▼
┌──────────────────┐         ┌───────────────────┐         ┌──────────────────────┐
│ Investigation    │         │ Hyperlocal Map    │         │ Real-Time Surge      │
│ Mode Deep-Dive   │         │ 7-Day Clusters    │         │ Anomaly Alerts Feed  │
└──────────────────┘         └───────────────────┘         └──────────────────────┘
```

1. **Multi-Vector Risk Lookup:** Instantly searches Phone Numbers, UPI IDs, and Web URLs with canonical normalization and community trust scoring.
2. **Investigation Mode:** Deep-dive forensic interface explaining the "Why", displaying multi-signal evidence, visual connection graphs, and emergency cybercrime 1930 protocols.
3. **Chrome Browser Guard (Manifest V3):** Automatically inspects active browsing tab URLs in real-time, displays instant safety banners, and connects seamlessly to Investigation Mode.
4. **Pattern Detection & Behavioral Heuristics:** Automated pattern analysis detecting brand impersonation (e.g., "SBI"), lookalike domains, excessive hyphens, credential urgency keywords, report spikes, and geographic spread.
5. **Hyperlocal 7-Day Scam Map:** Live interactive map visualizing fraud intensity across metropolitan hotspots and pincodes.
6. **Intelligent Anomaly Alerts:** Statistical anomaly detection engine flagging geographic or pattern-based reporting surges.
7. **Anti-Abuse Guardrails:** Built-in rate limiting (5 reports/hr per reporter fingerprint), duplicate prevention, and trust-weighted verification statuses to resist report bombing.

---

## 🚀 Key Features

### 🔍 1. Universal Multi-Vector Lookup
- Normalizes diverse Indian formats: E.164 phones (`+919876543210`), UPI VPAs (`merchant@okaxis`), and domains/URLs.
- Evaluates risk score (0–100), verification status (`NO_REPORTS`, `UNDER_REVIEW`, `SUSPICIOUS`, `HIGH_RISK`), and confidence levels.
- Surfaces honest, transparent empty states when no community reports exist — never fabricating false safety assurances.

### 🕵️‍♂️ 2. ScamSentry Investigation Mode
- **Forensic Evidence Panel:** Breaks down the specific heuristic signals that triggered suspicion (e.g., *Brand Impersonation*, *Suspicious Keywords*, *Report Spike*).
- **Visual Connection Graph:** Interactive SVG radial graph showing cross-indicator relationships (linked UPI IDs, variant domains, and known syndicates).
- **Intelligence Source Strip:** Explicitly differentiates between Live Database records and Dev Mock Fallbacks.
- **Emergency Helpline Protocol (1930):** One-click guide assisting users who have already lost money with banking freeze steps and Cyber Crime Portal filing.

### 🧩 3. Chrome Browser Extension (Manifest V3)
- Instant active-tab URL inspection with badge indicators.
- Live API connectivity to `http://localhost:8000/api/lookup`.
- One-click **"Investigate Why"** action directly opening the website's Investigation Mode for the inspected URL.
- Development Mock Mode toggle and Quick Test URL presets for offline demonstration.

### 🗺️ 4. Hyperlocal Scam Map & Surge Alerts
- Visualizes 7-day clusters across Bengaluru metro zones (HSR Layout, Koramangala, Indiranagar, Whitefield, etc.).
- Real-time alert feed notifying citizens of localized spikes (e.g., *Sudden Spike in Digital Arrest scams*).

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Backend** | Python 3.10+, FastAPI, SQLAlchemy, Pydantic v2, SQLite (Zero-config demo DB) |
| **Server** | Uvicorn (ASGI) with WatchFiles hot-reloading |
| **Testing** | Pytest (66 comprehensive unit and integration tests passing) |
| **Frontend** | React 18, Vite, TypeScript 5.5, Tailwind CSS 3.4, Lucide React Icons |
| **Mapping** | Leaflet, React-Leaflet with custom map markers |
| **Browser Extension** | Chrome Extension Manifest V3, Service Worker, Vanilla JS & CSS |

---

## 📁 Repository Structure

```text
scamsentry-ai/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI application entry point, CORS & lifecycle
│   │   ├── core/                # Database configuration & session dependencies
│   │   ├── models/              # SQLAlchemy models (Identifier, ScamReport, Area, Alert)
│   │   ├── routes/              # Route controllers (/lookup, /reports, /map, /alerts, /admin)
│   │   └── services/            # Risk scoring, pattern detection, anomaly engine & seed data
│   ├── tests/                   # 66 comprehensive Pytest test cases
│   ├── requirements.txt         # Backend Python dependencies
│   ├── DATABASE.md              # Database schema documentation
│   └── setup_demo.py            # Standalone database reset & seed utility
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/          # TopNav, BottomNav, AppShell, Footer
│   │   │   ├── lookup/          # LookupForm, ResultCard, VerdictBadge
│   │   │   ├── investigation/   # EvidencePanel, VisualConnectionGraph, Summary, EmergencyModal
│   │   │   ├── map/             # ScamMap, AreaListView, AreaPanel
│   │   │   └── report/          # Multi-step ReportWizard
│   │   ├── pages/               # HomePage, LookupPage, InvestigationPage, MapPage, AlertsPage
│   │   ├── services/            # Centralized API service & rich mock datasets
│   │   └── types/               # TypeScript interfaces for API contracts & Investigation Mode
│   ├── package.json             # Frontend dependencies and build scripts
│   └── vite.config.ts           # Vite dev server configuration & API proxy
│
├── browser-extension/
│   ├── manifest.json            # Chrome Extension Manifest V3 configuration
│   ├── popup/                   # Extension popup UI (HTML, CSS, JS)
│   ├── background/              # Background service worker
│   └── icons/                   # Extension shield icons
│
├── shared/
│   ├── API_CONTRACT.md          # Shared REST API specifications
│   └── FRONTEND_INTEGRATION_GUIDE.md # Technical frontend-to-backend integration reference
│
├── setup_demo.py                # Root helper for deterministic demo database seeding
└── README.md                    # Project documentation
```

---

## 🌐 API Endpoints Reference

All endpoints are available both under `/api/*` and root paths:

| Method | Endpoint | Description | Status |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Service health & liveness check | ✅ Active |
| `POST` | `/api/lookup` | Universal risk lookup (Phone, UPI, URL) with pattern signals | ✅ Active |
| `POST` | `/api/reports` | Submit an anonymous scam incident with rate-limit protection | ✅ Active |
| `GET` | `/api/map` | Retrieve 7-day scam clusters and area hotspots for map | ✅ Active |
| `GET` | `/api/alerts` | Get statistical anomaly & surge alerts | ✅ Active |
| `POST` | `/api/admin/reset` | Deterministically reset & seed demo database | ✅ Active |

---

## 🏁 Quickstart Guide (Run Locally)

### Prerequisites
- Python 3.10+
- Node.js 18+ & npm
- Google Chrome (for browser extension)

---

### Step 1: Start Backend (FastAPI on Port 8000)

```powershell
# Navigate to backend directory
cd backend

# Create and activate virtual environment (Windows)
python -m venv .venv
.venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start FastAPI development server
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

> **Note on Fresh Start:** On first startup, the database automatically initializes `scamsentry.db` and seeds 21 areas, 9 canonical test identifiers, 184 realistic scam reports, and 5 anomaly alerts.

Verify backend health: [http://127.0.0.1:8000/api/health](http://127.0.0.1:8000/api/health)  
Interactive Swagger API Docs: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

---

### Step 2: Start Frontend Web Platform (Port 3000)

Open a **second terminal**:

```powershell
# Navigate to frontend directory
cd frontend

# Install npm dependencies
npm install

# Start Vite development server
npm run dev
```

Open the platform in your browser: **[http://localhost:3000](http://localhost:3000)**

---

### Step 3: Load Chrome Browser Extension

1. Open Google Chrome and go to `chrome://extensions`.
2. Toggle on **Developer mode** in the top-right corner.
3. Click the **Load unpacked** button in the top-left corner.
4. Select the `browser-extension/` directory from this repository:
   ```text
   E:\Project\DeepDefence\scamsentry-ai\browser-extension
   ```
5. Pin the **ScamSentry AI** shield icon to your Chrome toolbar.

---

## 🧪 Hackathon Demo — Showcase Scenarios

Use these pre-seeded test indicators during demonstrations to showcase all risk levels:

| Indicator / Query | Type | Expected Verdict | Risk Score | Highlights to Demonstrate |
|---|---|---|---|---|
| `sbi-kyc-update.in/login` | **URL** | `KNOWN_SCAM` | **100** | 44 reports, 9 evidence signals (Brand Impersonation, Suspicious Keywords), "Investigate Why" button |
| `+91 91234 56789` | **Phone** | `SUSPICIOUS` | **63** | 2 recent community reports, UPI fraud vector |
| `fraud.merchant@okaxis` | **UPI** | `UNDER_REVIEW` | **25** | Single uncorroborated report, cautionary guidance |
| `https://example.com` | **URL** | `NO_REPORTS` | **0** | Clean baseline, transparent zero-evidence messaging |
| `fake-kyc-hdfc.in` | **Report** | `UNDER_REVIEW` | — | Test Quick Warning submission via `POST /api/reports` |
| **Bengaluru Map View** | **Map** | — | — | 184 incidents across 16 active hotspots (HSR Layout surge) |
| **Surge Alerts Feed** | **Alerts**| `HIGH / SPIKE`| — | 5 anomaly alerts with preventative security guidance |

---

## 🧪 Test Suite & Verification

The project includes full end-to-end automated test suites:

### Backend Tests (66/66 Passing)
```bash
cd backend
python -m pytest tests/
```
```text
============================= 66 passed in 2.04s ==============================
```

### Frontend Typecheck & Build
```bash
cd frontend
npm run typecheck    # 0 TypeScript errors
npm run build        # Production bundle built in 4.7s
```

---

## 👥 Team & Roles

Developed for the Hackathon by:

- **Avaish Ansari** — *Backend Architecture, FastAPI Core, Database Schema, Pattern Heuristics, Anomaly Detection & Testing*
- **Sartaj** — *Frontend Architecture, UI/UX Design, Investigation Mode, Chrome Extension (MV3), Component Library & Integration*

---

## 📜 License

This project is licensed under the MIT License — see the repository root for details.
