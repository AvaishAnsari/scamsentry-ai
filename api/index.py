import os
import sys
from pathlib import Path

# Add backend directory to sys.path so 'app.*' imports resolve cleanly on Vercel
_CURRENT_DIR = Path(__file__).resolve().parent
_ROOT_DIR = _CURRENT_DIR.parent
_BACKEND_DIR = _ROOT_DIR / "backend"

if str(_BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(_BACKEND_DIR))

# Signal Vercel serverless environment to core configuration
os.environ["VERCEL"] = "1"

# Import core database and models
from app.core.database import Base, SessionLocal, engine
import app.models  # noqa: F401 - ensure models registered with Base.metadata
from app.services.seed_data import seed_if_empty

# Initialize tables and seed deterministic demo data on cold start
try:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_if_empty(db)
    finally:
        db.close()
except Exception as exc:
    # Gracefully log without crashing ASGI entrypoint if DB connection is initializing
    print(f"[ScamSentry Vercel Init] Database initialization notice: {exc}")

# Import the FastAPI application instance
from app.main import app  # noqa: E402
