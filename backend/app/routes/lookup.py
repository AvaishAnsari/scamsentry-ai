from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field, model_validator
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.area import Area  # noqa: F401 - ensure Area relationship loads cleanly
from app.models.identifier import Identifier
from app.models.scam_report import ScamReport
from app.services.identifier_service import (
    IdentifierValidationError,
    normalize_identifier,
)
from app.services.risk_service import calculate_risk

router = APIRouter(tags=["Lookup"])


class LookupRequest(BaseModel):
    """Payload for POST /lookup."""

    query: Optional[str] = Field(None, description="Identifier to look up (Phone, UPI, URL)")
    value: Optional[str] = Field(None, description="Alternative alias for query")
    type: Optional[str] = Field(None, description="Optional type hint: 'phone', 'upi', 'url'")

    @model_validator(mode="after")
    def validate_has_input(self):
        target = self.query or self.value
        if not target or not target.strip():
            raise ValueError("Input identifier ('query' or 'value') is required and cannot be empty.")
        return self


class RecentReportItem(BaseModel):
    """Sanitized public summary of an accepted scam report."""

    category: str
    description: Optional[str] = None
    city: Optional[str] = None
    reported_at: Optional[str] = None


class LookupResponse(BaseModel):
    """Standardized response schema for identifier lookup."""

    success: bool = True
    query: str
    target_type: str
    normalized_value: str
    verdict: str  # NO_REPORTS | SUSPICIOUS | KNOWN_SCAM | VERIFIED_BUSINESS
    risk_level: str  # safe | suspicious | high
    risk_score: int  # 0 to 100
    report_count: int
    first_reported: Optional[str] = None
    last_reported: Optional[str] = None
    top_category: Optional[str] = None
    recent_reports: List[RecentReportItem] = Field(default_factory=list)
    distinct_areas_count: int = 0
    message: str


def execute_lookup(raw_input: str, expected_type: Optional[str], db: Session) -> LookupResponse:
    """Core lookup pipeline: detection -> normalization -> query -> risk scoring -> verdict."""
    raw = raw_input.strip() if raw_input else ""
    if not raw:
        raise HTTPException(status_code=400, detail="Identifier cannot be empty.")

    # 1. Detect and normalize identifier
    try:
        normalized = normalize_identifier(raw, expected_type=expected_type)
    except IdentifierValidationError as e:
        raise HTTPException(status_code=400, detail=e.message)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # 2. Query normalized identifier record in database
    stmt = select(Identifier).where(
        Identifier.identifier_type == normalized.identifier_type,
        Identifier.normalized_value == normalized.normalized_value,
    )
    identifier_record = db.execute(stmt).scalar_one_or_none()

    # Known verified business entities & toll-free registry
    verified_registry = {
        "18001234567": "National Banking / Consumer Toll-Free Helpline",
        "1800222244": "State Bank of India Toll-Free Helpline",
        "1930": "National Cyber Crime Reporting Helpline",
    }
    is_verified = (
        normalized.normalized_value in verified_registry
        or (normalized.identifier_type == "phone" and normalized.normalized_value.startswith("1800"))
    )
    biz_name = verified_registry.get(
        normalized.normalized_value, "Official Toll-Free / Verified Business Helpline"
    )

    # 3. If identifier is not in DB, return clean verdict (VERIFIED_BUSINESS or NO_REPORTS)
    if identifier_record is None:
        if is_verified:
            assessment = calculate_risk([], is_verified_business=True, verified_business_name=biz_name)
        else:
            assessment = calculate_risk([])
        return LookupResponse(
            success=True,
            query=raw,
            target_type=normalized.identifier_type,
            normalized_value=normalized.normalized_value,
            verdict=assessment.verdict,
            risk_level=assessment.risk_level,
            risk_score=assessment.risk_score,
            report_count=0,
            first_reported=None,
            last_reported=None,
            top_category=None,
            recent_reports=[],
            distinct_areas_count=0,
            message=assessment.message,
        )

    # 4. Fetch only accepted reports (excluding rejected, duplicate, rate_limited)
    reports_stmt = (
        select(ScamReport)
        .where(
            ScamReport.identifier_id == identifier_record.id,
            ScamReport.status == "accepted",
        )
        .order_by(ScamReport.created_at.desc())
    )
    accepted_reports = db.execute(reports_stmt).scalars().all()

    # 5. Calculate deterministic risk score & verdict
    if is_verified and len(accepted_reports) == 0:
        assessment = calculate_risk(accepted_reports, is_verified_business=True, verified_business_name=biz_name)
    else:
        assessment = calculate_risk(accepted_reports)

    # 6. Build sanitized recent reports preview
    recent_items: List[RecentReportItem] = []
    for r in accepted_reports[:5]:
        recent_items.append(
            RecentReportItem(
                category=r.scam_type,
                description=r.description,
                city=r.area.city if r.area else None,
                reported_at=r.created_at.isoformat() if r.created_at else None,
            )
        )

    return LookupResponse(
        success=True,
        query=raw,
        target_type=normalized.identifier_type,
        normalized_value=normalized.normalized_value,
        verdict=assessment.verdict,
        risk_level=assessment.risk_level,
        risk_score=assessment.risk_score,
        report_count=assessment.report_count,
        first_reported=assessment.first_reported.isoformat() if assessment.first_reported else None,
        last_reported=assessment.last_reported.isoformat() if assessment.last_reported else None,
        top_category=assessment.top_category,
        recent_reports=recent_items,
        distinct_areas_count=assessment.distinct_areas_count,
        message=assessment.message,
    )


@router.post("/lookup", response_model=LookupResponse)
def lookup_post(
    request: LookupRequest,
    db: Session = Depends(get_db),
):
    """Check a suspicious phone number, UPI ID, or URL via POST."""
    raw_target = request.query or request.value or ""
    return execute_lookup(raw_target, request.type, db)


@router.get("/lookup", response_model=LookupResponse)
def lookup_get(
    query: str = Query(..., description="Phone number, UPI ID, or URL to inspect"),
    type: Optional[str] = Query(None, description="Optional type hint: 'phone', 'upi', 'url'"),
    db: Session = Depends(get_db),
):
    """Check a suspicious phone number, UPI ID, or URL via GET."""
    return execute_lookup(query, type, db)
