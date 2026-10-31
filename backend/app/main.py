import sys
from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Ensure backend directory is in sys.path for robust imports from any working directory
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.core.database import Base, engine
import app.models  # noqa: F401 - ensure all models are registered with Base.metadata


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize all database tables safely on application startup
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title="ScamSentry AI API",
    description="Community Scam Map & Verification API for India",
    version="0.1.0",
    lifespan=lifespan,
)

# Enable CORS for frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", tags=["Health"])
def health_check():
    return {
        "status": "ok",
        "service": "ScamSentry AI",
        "message": "API is running",
    }
