from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.services.map_service import get_map_activity

router = APIRouter(tags=["Map"])


class AreaMapItem(BaseModel):
    area_id: int
    name: str
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    report_count: int
    risk_level: str  # CRITICAL | HIGH | MEDIUM | LOW | NONE
    dominant_category: Optional[str] = None


class MapSummary(BaseModel):
    total_reports: int
    total_active_areas: int
    highest_activity_area: Optional[str] = None
    requested_days: int


class MapDataEnvelope(BaseModel):
    days: int
    summary: MapSummary
    areas: List[AreaMapItem] = Field(default_factory=list)


class MapResponse(BaseModel):
    success: bool = True
    timeframe_days: int
    total_incidents: int
    summary: MapSummary
    areas: List[AreaMapItem] = Field(default_factory=list)
    hotspots: List[Dict[str, Any]] = Field(default_factory=list)
    data: MapDataEnvelope


@router.get(
    "/map",
    response_model=MapResponse,
    status_code=status.HTTP_200_OK,
    summary="Get aggregated scam activity by area",
)
def get_scam_map(
    request: Request,
    db: Session = Depends(get_db),
    days: Optional[str] = Query(default="7", description="Number of days to inspect (1 to 90)"),
    city: Optional[str] = Query(default=None, description="Filter by city name"),
    state: Optional[str] = Query(default=None, description="Filter by state name"),
    category: Optional[str] = Query(default=None, description="Filter by scam category"),
):
    """Retrieve privacy-preserving aggregated scam report statistics grouped by geographic Area."""
    # Validate 'days' query parameter
    days_val = 7
    if days is not None and not hasattr(days, "default"):
        days_str = str(days).strip()
        try:
            days_val = int(days_str)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid 'days' parameter. Must be an integer between 1 and 90.",
            )

        if days_val < 1 or days_val > 90:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid 'days' parameter. Must be between 1 and 90.",
            )

    city_str = city if isinstance(city, str) else None
    state_str = state if isinstance(state, str) else None
    cat_str = category if isinstance(category, str) else None

    result = get_map_activity(
        db=db,
        days=days_val,
        city=city_str,
        state=state_str,
        category=cat_str,
    )
    return result
