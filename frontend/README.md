# 🛡️ ScamSentry AI — Frontend Application

Public safety and community fraud defense client application built with React 18, TypeScript, Vite, and Tailwind CSS.

## 🚀 Quick Start

### 1. Install Dependencies
```bash
cd frontend
npm install
```

### 2. Run Development Server
```bash
npm run dev
```
The application will launch at `http://localhost:3000`.

### 3. Build & Typecheck
```bash
npm run build
npm run typecheck
```

---

## 🎨 UI/UX Design System v1.1 Implementation
- **Typography:** Inter sans-serif
- **Brand Blue:** `#1F4FC4` (Tint: `#E8EEFB`)
- **Risk Red:** `#B42318` (Tint: `#FDEDEB`)
- **Risk Amber:** `#8F5300` (Tint: `#FFF3DD`)
- **Safe Green:** `#17692F` (Tint: `#E7F4EA`)
- **Surface:** `#F5F6F8`, **Cards:** `#FFFFFF`, **Ink:** `#1B2230`

---

## 🧭 Navigation & Routes
- `/`: Landing page with live 1930 emergency banner, hero lookup, real-time platform statistics, and quick guidance.
- `/check`: Multi-vector fraud lookup supporting Indian Phone numbers (`+91`), UPI handles, and URLs.
- `/report`: 3-step anonymous reporting wizard (`What happened` → `Where and when` → `Review`).
- `/report/done`: Submission confirmation and fund recovery guidance.
- `/map`: 7-day regional cluster map with 24h/7d/30d filters and accessible table view.
- `/alerts`: Surge & new attack pattern anomalies with local area PIN subscription.
- `/how-it-works`: In-depth breakdown of the four verdicts (`KNOWN_SCAM`, `SUSPICIOUS`, `NO_REPORTS`, `VERIFIED_BUSINESS`) and anti-abuse architecture.

---

## 🔌 API Integration & Mock Fallback Layer
- Reads from `VITE_API_BASE_URL` (default: `http://localhost:8000`).
- Matches the schemas defined in `shared/API_CONTRACT.md`.
- **Resilient Fallback Mode:** If the backend server is offline or restarting during development, the frontend automatically falls back to built-in simulation data, allowing uninterrupted UI development and demonstrations.

