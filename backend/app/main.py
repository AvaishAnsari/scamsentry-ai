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
from app.routes.admin import router as admin_router
from app.routes.alerts import router as alerts_router
from app.routes.lookup import router as lookup_router
from app.routes.map import router as map_router
from app.routes.reports import router as reports_router


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

# CORS configuration: Permits local Vite (5173) and local React (3000) development
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ],
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register route handlers (available both under /api and root for maximum client compatibility)
app.include_router(lookup_router, prefix="/api")
app.include_router(lookup_router)
app.include_router(reports_router, prefix="/api")
app.include_router(reports_router)
app.include_router(map_router, prefix="/api")
app.include_router(map_router)
app.include_router(alerts_router, prefix="/api")
app.include_router(alerts_router)
app.include_router(admin_router, prefix="/api")
app.include_router(admin_router)


@app.get("/health", tags=["Health"])
@app.get("/api/health", tags=["Health"])
def health_check():
    return {
        "status": "ok",
        "service": "ScamSentry AI",
        "message": "API is running",
    }
