import os
from pathlib import Path
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# ---------------------------------------------------------------------------
# Backend directory: the folder that contains this file's grandparent (app/core/)
# This is always backend/ regardless of the working directory from which
# uvicorn / pytest is launched.
# ---------------------------------------------------------------------------
_BACKEND_DIR: Path = Path(__file__).resolve().parent.parent.parent

# Load environment variables from backend/.env if available
_env_path = _BACKEND_DIR / ".env"
load_dotenv(dotenv_path=_env_path)

# ---------------------------------------------------------------------------
# Database URL
# Priority:
#   1. DATABASE_URL environment variable (supports PostgreSQL for production)
#   2. Default: absolute path to backend/scamsentry.db (local) or /tmp/scamsentry.db (Vercel)
#
# Note on Vercel: The deployment environment has a read-only root filesystem.
# When running on Vercel without an external DATABASE_URL, SQLite defaults to /tmp
# to prevent readonly filesystem errors during demo execution.
# ---------------------------------------------------------------------------
if os.getenv("VERCEL"):
    _default_db_path = Path("/tmp") / "scamsentry.db"
else:
    _default_db_path = _BACKEND_DIR / "scamsentry.db"

DATABASE_URL: str = os.getenv(
    "DATABASE_URL",
    f"sqlite:///{_default_db_path}",
)

# Normalize legacy postgres:// URI scheme provided by some hosting services to postgresql://
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# SQLite requires 'check_same_thread: False' for multi-threaded FastAPI execution
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    echo=False,
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)

Base = declarative_base()


def get_db():
    """FastAPI dependency yielding a database session per request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

