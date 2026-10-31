# ScamSentry AI — Database Setup & Developer Guide

> **Note:** All seed records are **synthetic hackathon demo data** and do not represent real individuals or businesses.

---

## Technology

| Property | Value |
|---|---|
| Engine | SQLite 3 (via SQLAlchemy 2.0 ORM) |
| File location | `backend/scamsentry.db` (absolute path, CWD-independent) |
| ORM | SQLAlchemy 2.0 with `declarative_base` |
| Migration tool | None (tables created via `Base.metadata.create_all`) |

---

## Database File Location

The database **always** lives at:
```
<project-root>/backend/scamsentry.db
```

This is guaranteed by an absolute path resolved from `database.py`'s own filesystem location
(`Path(__file__).resolve().parent.parent.parent / "scamsentry.db"`), so it works correctly
whether you launch `uvicorn` from:

- the **project root**: `uvicorn backend.app.main:app`
- the **backend/ directory**: `uvicorn app.main:app` ✅ (recommended)

---

## Database Tables

| Table | Model | Purpose |
|---|---|---|
| `areas` | `Area` | Geographic zones (city + coordinates) |
| `identifiers` | `Identifier` | Normalized phone / UPI / URL values |
| `scam_reports` | `ScamReport` | Community scam incident reports |
| `alerts` | `Alert` | Detected anomaly/surge alerts |
| `reporter_rate_limits` | `ReporterRateLimit` | Per-reporter anti-abuse rate limits |
| `licence_state` | `LicenceState` | Demo licence record |

---

## How Tables Are Created

Tables are created **automatically on startup** using:
```python
Base.metadata.create_all(bind=engine)
```
This is idempotent — it never drops or modifies existing tables/data.

---

## How Demo Data Is Seeded

### Automatic (first-run only)

On startup, `seed_if_empty(db)` is called. It checks:
```python
existing_areas = db.query(Area).count()
if existing_areas > 0:
    return {}   # data already present — skip seeding
```

This means:
- **Fresh clone / empty DB** → seeds full demo dataset automatically ✅
- **Existing DB with data** → skips seeding, preserves all existing reports ✅
- **Every subsequent restart** → no duplicate data ever ✅

### Demo Data Contents

| Category | Count |
|---|---|
| Geographic areas | 16 (13 Bengaluru zones + Mumbai, Noida, Delhi) |
| Seeded identifiers | 9 (phone, UPI, URL demo cases) |
| Scam reports | ~294 (spread across areas and scam types) |
| Alerts | 5 (spike + new_type alerts) |

### Lookup Demo Scenarios

| Scenario | Identifier | Expected Verdict |
|---|---|---|
| Known Scam Phone | `+91 98765 43210` | `KNOWN_SCAM` |
| Suspicious Phone | `+91 91234 56789` | `SUSPICIOUS` |
| Phishing URL | `sbi-kyc-update.in/login` | `KNOWN_SCAM` |
| Under Review UPI | `fraud.merchant@okaxis` | `UNDER_REVIEW` |
| No Reports / Unknown | Any unlisted identifier | `NO_REPORTS` |

---

## How to Prevent Duplicate Seed Data

`seed_if_empty()` in `backend/app/services/seed_data.py` is the guard.

It is called once per server startup from `main.py`'s lifespan handler.
Seeding only runs when the `areas` table is completely empty.

User-submitted reports **are never cleared** unless you explicitly call the reset endpoint.

---

## How to Reset the Demo Database

### Option A — API endpoint (recommended for hackathon demos)

```bash
curl -X POST http://localhost:8000/api/admin/reset \
     -H "Content-Type: application/json" \
     -d '{"seed_demo_data": true}'
```

### Option B — Direct Python script

```bash
cd backend
source .venv/bin/activate
python -m app.services.seed_data
```

### Option C — Delete the file and restart

```bash
rm backend/scamsentry.db
cd backend && uvicorn app.main:app --reload
# Auto-seeds on first startup
```

---

## How to Verify the Database

```bash
cd backend
source .venv/bin/activate
python3 -c "
import sqlite3
conn = sqlite3.connect('scamsentry.db')
cur = conn.cursor()
cur.execute(\"SELECT name FROM sqlite_master WHERE type='table' ORDER BY name\")
tables = cur.fetchall()
for t in tables:
    cur.execute(f'SELECT COUNT(*) FROM \"{t[0]}\"')
    print(f'{t[0]}: {cur.fetchone()[0]} rows')
conn.close()
"
```

---

## Getting Started (New Developer / Judge)

```bash
# 1. Clone the repository
git clone https://github.com/AvaishAnsari/scamsentry-ai.git
cd scamsentry-ai

# 2. Set up the Python environment
cd backend
python3 -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# 3. (Optional) Copy environment config
cp .env.example .env               # Defaults work out of the box

# 4. Start the backend
uvicorn app.main:app --reload
# Tables created + demo data seeded automatically on first run
# API at http://localhost:8000 | Docs at http://localhost:8000/docs

# 5. Start the frontend (separate terminal)
cd ../frontend
npm install
npm run dev
# UI at http://localhost:3000
```

---

## Running Tests

```bash
cd backend
source .venv/bin/activate
python -m unittest discover tests -v
```

Expected: **63 tests, 0 failures**.

---

## API Smoke Tests

```bash
curl http://localhost:8000/api/health
curl -X POST http://localhost:8000/api/lookup -H "Content-Type: application/json" -d '{"identifier": "+91 98765 43210"}'
curl -X POST http://localhost:8000/api/reports -H "Content-Type: application/json" -d '{"identifier": "+91 99999 12345", "scam_type": "phishing", "description": "Test report"}'
curl "http://localhost:8000/api/map?days=7"
curl http://localhost:8000/api/alerts
```

---

## Important Notes

- `backend/scamsentry.db` is in `.gitignore` — **must not be committed**.
- `backend/.venv/` is also excluded from Git.
- All demo data is synthetic — labelled for hackathon purposes only.
- A single community report does **not** confirm an identifier as a scam.
  Multiple corroborated reports raise the verdict progressively:
  `NO_REPORTS` → `UNDER_REVIEW` → `SUSPICIOUS` → `KNOWN_SCAM`
