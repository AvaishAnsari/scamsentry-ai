from typing import Optional
from fastapi import APIRouter, Depends, Header, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.services.seed_data import seed_database

router = APIRouter(tags=["Admin"])


class AdminResetRequest(BaseModel):
    """Payload for POST /admin/reset."""

    seed_demo_data: bool = True


class AdminResetResponse(BaseModel):
    """Response returned upon successful reset and seeding."""

    status: str = "success"
    message: str
    counts: Optional[dict] = None


@router.post(
    "/admin/reset",
    response_model=AdminResetResponse,
    status_code=status.HTTP_200_OK,
    summary="Reset database and optionally seed hackathon demo data",
)
def admin_reset(
    payload: Optional[AdminResetRequest] = None,
    db: Session = Depends(get_db),
    x_admin_key: Optional[str] = Header(default=None),
):
    """Admin reset endpoint for testing and hackathon demo environments."""
    should_seed = payload.seed_demo_data if payload else True

    counts = seed_database(db, reset=True) if should_seed else {}

    return AdminResetResponse(
        status="success",
        message="Database cleared and seeded with hackathon demo data." if should_seed else "Database cleared.",
        counts=counts,
    )
