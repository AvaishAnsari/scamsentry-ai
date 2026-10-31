from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.services.anomaly_service import get_persisted_alerts, run_anomaly_detection

router = APIRouter(tags=["Alerts"])


class AlertItem(BaseModel):
    alert_id: int
    id: str
    anomaly_type: str  # SPIKE | NEW_SCAM_TYPE | IDENTIFIER_SURGE
    severity: str  # CRITICAL | HIGH | MEDIUM | LOW
    anomaly_score: float
    title: str
    explanation: str
    affected_area: str
    region: str
    incident_count_last_24h: int
    surge_percentage: str
    advice: str
    sample_indicators: List[str] = Field(default_factory=list)
    detected_at: Optional[str] = None
    created_at: Optional[str] = None


class AlertSummary(BaseModel):
    total_alerts: int
    critical_alerts: int
    high_alerts: int


class AlertsResponse(BaseModel):
    success: bool = True
    summary: AlertSummary
    alerts: List[AlertItem] = Field(default_factory=list)


class DetectionRunResponse(BaseModel):
    status: str = "success"
    message: str
    results: Dict[str, Any]


@router.get(
    "/alerts",
    response_model=AlertsResponse,
    status_code=status.HTTP_200_OK,
    summary="Get active unusual activity alerts",
)
def get_alerts(
    request: Request,
    db: Session = Depends(get_db),
    days: Optional[str] = Query(default="7", description="Timeframe in days (1 to 90)"),
    severity: Optional[str] = Query(default=None, description="Filter by severity: critical, high, medium, low"),
    city: Optional[str] = Query(default=None, description="Filter by city name"),
    limit: Optional[str] = Query(default="20", description="Maximum alerts to retrieve"),
    detect: Optional[bool] = Query(default=False, description="Run detection engine before fetching"),
):
    """Retrieve active anomaly and surge alerts sorted by severity and recency."""
    # Validate 'days'
    days_val = 7
    if days is not None and not hasattr(days, "default"):
        try:
            days_val = int(str(days).strip())
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

    # Validate 'limit'
    limit_val = 20
    if limit is not None and not hasattr(limit, "default"):
        try:
            limit_val = int(str(limit).strip())
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid 'limit' parameter. Must be a valid integer.",
            )
        if limit_val < 1 or limit_val > 100:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid 'limit' parameter. Must be between 1 and 100.",
            )

    city_str = city if isinstance(city, str) else None
    sev_str = severity if isinstance(severity, str) else None

    # Optionally run detector on demand
    if detect:
        run_anomaly_detection(db)

    return get_persisted_alerts(
        db=db,
        days=days_val,
        severity=sev_str,
        city=city_str,
        limit=limit_val,
    )


@router.post(
    "/alerts/detect",
    response_model=DetectionRunResponse,
    status_code=status.HTTP_200_OK,
    summary="Trigger anomaly detection scan",
)
def trigger_anomaly_detection(
    db: Session = Depends(get_db),
):
    """Explicitly trigger anomaly detection across areas, categories, and identifiers."""
    results = run_anomaly_detection(db)
    return DetectionRunResponse(
        status="success",
        message="Anomaly detection scan completed successfully.",
        results=results,
    )
