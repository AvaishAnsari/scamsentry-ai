# 🛡️ ScamSentry AI

> **Tagline:** Check before you trust. Report before others fall victim.

*A community-powered scam map and real-time fraud intelligence network tailored for India.*

---

> [!NOTE]
> **Hackathon Status:** This project is being actively and incrementally developed during a 24-hour hackathon. Features and endpoints are being rolled out step-by-step.

---

## 📌 Problem Statement

Digital fraud in India is escalating exponentially across UPI payments, phishing SMS links, fake job offers, and impersonation calls. Innocent citizens often have no simple way to:
- Verify whether an unknown caller, UPI address, or link has already harmed others before they transfer money or share credentials.
- Know whether a specific neighborhood or district is currently being targeted by concentrated scam syndicates.
- Warn fellow citizens rapidly without navigating cumbersome, bureaucratic complaint portals.

Existing systems operate retrospectively and lack real-time community warning signals.

---

## 💡 Solution Overview

**ScamSentry AI** bridges this gap by acting as a community-driven frontline defense:
1. **Instant Trust Check:** Search any phone number, UPI ID, or URL to see its community risk score and report history.
2. **Frictionless Anonymous Reporting:** Crowdsource fraud attempts instantly while preserving reporter privacy.
3. **Hyperlocal Scam Map:** Visualize geographic hotspots and scam trends from the last 7 days.
4. **Intelligent Anomaly Alerts:** Alert users only when high-confidence surges or novel scam patterns emerge, preventing alert fatigue.
5. **Anti-Abuse & Guardrails:** Designed to resist report bombing, spam, and malicious defamation through rate limiting, verification heuristics, and trust scoring.

---

## 🚀 Core Features

- **Multi-Vector Lookup:** Unified search for Phone Numbers, UPI IDs, and Web URLs.
- **Anonymous Reporting:** Quick reporting flow capturing scam category, narrative, and city/coordinates.
- **7-Day Regional Map:** Geographic view displaying scam clusters by intensity and category.
- **Anomaly Detection & Surge Alerts:** Automated triggers for sudden surges in fraud reports within an area or attack pattern.
- **Anti-Abuse Protection:** Duplicate report filtering, frequency bounding, and rate limiting to defend against report bombing.

---

## 🛠️ Technology Stack

### Backend
- **Framework:** Python 3.10+ / [FastAPI](https://fastapi.tiangolo.com/)
- **Database:** SQLite (lightweight and zero-config for hackathon agility), extensible to PostgreSQL
- **Server:** [Uvicorn](https://www.uvicorn.org/) ASGI server
- **Validation:** Pydantic v2

### Frontend
- **Framework:** React 18 / [Vite](https://vitejs.dev/)
- **Styling:** Tailwind CSS
- **Mapping:** Leaflet / React-Leaflet
- **State & Data Fetching:** Native React Hooks / Fetch API

---

## 📁 Project Structure

```text
ScamSentry AI/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI entry point & core routes
│   │   ├── routes/              # Modular API route handlers
│   │   ├── models/              # Database & Pydantic schemas
│   │   ├── services/            # Anti-abuse, scoring & anomaly logic
│   │   └── core/                # Config, database setup & security
│   ├── requirements.txt         # Minimal backend dependencies
│   └── .env.example             # Backend environment template
│
├── frontend/                    # React + Vite + Tailwind frontend application
│
├── shared/
│   └── API_CONTRACT.md          # Shared API specification & schemas
│
├── README.md                    # Project documentation
├── .gitignore                   # Git ignore patterns
└── .env.example                 # Root environment template
```

---

## 🌐 API Endpoints

A summary of the official endpoints specified in [`shared/API_CONTRACT.md`](file:///Users/avaishansari/Documents/CyberForge/ScamSentry%20AI/shared/API_CONTRACT.md):

| Method | Endpoint | Description | Status |
| :--- | :--- | :--- | :--- |
| `GET` | `/health` | Service health check | ✅ Available |
| `POST` | `/reports` | Submit an anonymous scam incident | ⏳ Planned |
| `GET` | `/lookup` | Verify phone, UPI ID, or URL risk score | ⏳ Planned |
| `GET` | `/map` | Retrieve 7-day scam clusters for map | ⏳ Planned |
| `GET` | `/alerts` | Get real-time anomaly & surge alerts | ⏳ Planned |
| `POST` | `/admin/reset` | Clear & seed mock hackathon data | ⏳ Planned |
| `GET` | `/license` | View project license information | ⏳ Planned |
| `POST` | `/license` | Register community/developer API key | ⏳ Planned |

---

## 👥 Team Roles

- **Developer 1 — Avaish:**
  - Backend architecture & database
  - API implementation & validation
  - Trust scoring and anti-abuse logic
  - Anomaly detection engine
  - Integration & deployment

- **Developer 2 — Sartaj:**
  - Frontend architecture & UX/UI design
  - React component library
  - Interactive map interface
  - Real-time alerts dashboard
  - Visual styling & presentation polish

---

## 🏁 Getting Started

### Prerequisites
- Python 3.10 or higher
- Node.js 18+ (for frontend development)
- Git

### Backend Setup

1. **Navigate to the backend directory:**
   ```bash
   cd backend
   ```

2. **Create and activate a virtual environment:**
   ```bash
   # On macOS / Linux
   python3 -m venv .venv
   source .venv/bin/activate

   # On Windows
   python -m venv .venv
   .venv\Scripts\activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up the environment configuration:**
   ```bash
   cp .env.example .env
   ```

5. **Start the FastAPI development server:**
   ```bash
   uvicorn app.main:app --reload
   ```

6. **Verify the server:**
   - Health Check: [http://localhost:8000/health](http://localhost:8000/health)
   - Interactive Docs (Swagger): [http://localhost:8000/docs](http://localhost:8000/docs)
