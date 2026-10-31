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
#   2. Default: absolute path to backend/scamsentry.db
#
# Using an absolute path here fixes the CWD-relative path bug.
# The same database file is used whether you run uvicorn from:
#   - the project root:  uvicorn backend.app.main:app
#   - the backend/ dir:  uvicorn app.main:app
# ---------------------------------------------------------------------------
_default_db_path = _BACKEND_DIR / "scamsentry.db"
DATABASE_URL: str = os.getenv(
    "DATABASE_URL",
    f"sqlite:///{_default_db_path}",
)

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

