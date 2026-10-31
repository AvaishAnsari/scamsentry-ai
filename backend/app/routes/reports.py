from typing import Optional
from fastapi import APIRouter, Depends, Header, HTTPException, Request, Response, status
from pydantic import BaseModel, Field, model_validator
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.scam_report import ScamReport
from app.services.identifier_service import IdentifierValidationError
from app.services.report_service import (
    calculate_initial_trust_score,
    check_and_update_rate_limit,
    generate_reporter_fingerprint,
    generate_source_ip_hash,
    get_or_create_area,
    get_or_create_identifier,
    is_duplicate_report,
    validate_and_normalize_category,
)

router = APIRouter(tags=["Reports"])


def extract_client_ip(request: Request, header_val: Optional[str] = None) -> str:
    """Safely extract client IP from header or request object."""
    if isinstance(header_val, str) and header_val.strip():
        return header_val.split(",")[0].strip()
    if request and hasattr(request, "headers"):
        xff = request.headers.get("x-forwarded-for")
        if xff:
            return xff.split(",")[0].strip()
    if request and hasattr(request, "client") and request.client and hasattr(request.client, "host"):
        return request.client.host
    return "127.0.0.1"


class ReportCreateRequest(BaseModel):
    """Payload for submitting an anonymous scam report."""

    target_value: Optional[str] = Field(None, description="Phone, UPI ID, or URL being reported")
    query: Optional[str] = Field(None, description="Alias for target_value")
    value: Optional[str] = Field(None, description="Alias for target_value")
    target_type: Optional[str] = Field(None, description="Optional 'phone', 'upi', 'url'")
    scam_category: str = Field(..., description="Category of scam (e.g. fake_job, digital_arrest, upi_fraud)")
    description: str = Field(..., description="Narrative describing the incident (minimum 10 characters)")
    city: Optional[str] = Field(None, description="City name")
    state: Optional[str] = Field(None, description="State name")
    pincode: Optional[str] = Field(None, description="6-digit postal code")
    area_name: Optional[str] = Field(None, description="Locality or neighborhood name")
    latitude: Optional[float] = Field(None, description="Approximate area centroid latitude")
    longitude: Optional[float] = Field(None, description="Approximate area centroid longitude")

    @model_validator(mode="after")
    def validate_inputs(self):
        target = self.target_value or self.query or self.value
        if not target or not target.strip():
            raise ValueError("Target identifier ('target_value', 'query', or 'value') is required.")

        desc = self.description.strip() if self.description else ""
        if len(desc) < 10:
            raise ValueError("Report description must be at least 10 characters explaining what happened.")

        return self


class ReportCreateResponse(BaseModel):
    """Safe public response returned after report submission."""

    status: str = "success"  # "success" | "duplicate"
    message: str
    report_id: str
    normalized_target: str
    target_type: str


@router.post(
    "/reports",
    response_model=ReportCreateResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Submit anonymous scam report",
)
def create_report(
    payload: ReportCreateRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
    x_forwarded_for: Optional[str] = Header(default=None),
):
    """Submit an anonymous scam report with anti-abuse and rate-limit guardrails."""
    # 1. Determine client IP and User-Agent for privacy-preserving salted fingerprinting
    client_ip = extract_client_ip(
        request, x_forwarded_for if isinstance(x_forwarded_for, str) else None
    )
    user_agent = (
        request.headers.get("user-agent", "unknown")
        if request and hasattr(request, "headers")
        else "unknown"
    )

    fingerprint_hash = generate_reporter_fingerprint(client_ip, user_agent)
    ip_hash = generate_source_ip_hash(client_ip)

    # 2. Check rate limit (Max 5 reports per rolling 1-hour window per anonymous fingerprint)
    allowed, rate_err = check_and_update_rate_limit(
        db, fingerprint_hash, max_reports=5, window_hours=1
    )
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=rate_err or "Rate limit exceeded. Too many reports submitted from this client.",
        )

    # 3. Validate and normalize the reported target identifier
    raw_target = payload.target_value or payload.query or payload.value or ""
    try:
        identifier_record, normalized = get_or_create_identifier(
            db, raw_target, expected_type=payload.target_type
        )
    except IdentifierValidationError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=e.message)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    # 4. Validate and map scam category
    try:
        normalized_category = validate_and_normalize_category(payload.scam_category)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    # 5. Check duplicate submission (Same reporter fingerprint + identifier + category within 24h)
    if is_duplicate_report(
        db, identifier_record.id, fingerprint_hash, normalized_category, window_hours=24
    ):
        # Save duplicate record for audit with status="duplicate" so it does not affect risk score
        dup_report = ScamReport(
            identifier_id=identifier_record.id,
            area_id=None,
            scam_type=normalized_category,
            description=payload.description.strip(),
            status="duplicate",
            trust_score=0,
            reporter_fingerprint_hash=fingerprint_hash,
            source_ip_hash=ip_hash,
        )
        db.add(dup_report)
        db.commit()
        db.refresh(dup_report)

        response.status_code = status.HTTP_200_OK
        return ReportCreateResponse(
            status="duplicate",
            message="Duplicate report detected. You have already submitted a report for this identifier within the last 24 hours.",
            report_id=f"rep_{dup_report.id}",
            normalized_target=normalized.normalized_value,
            target_type=normalized.identifier_type,
        )

    # 6. Retrieve or create Area record if geographic metadata is provided
    area_record = get_or_create_area(
        db=db,
        city=payload.city,
        state=payload.state,
        pincode=payload.pincode,
        area_name=payload.area_name,
        latitude=payload.latitude,
        longitude=payload.longitude,
    )

    # 7. Compute deterministic initial trust score (10–85)
    trust_score = calculate_initial_trust_score(
        description=payload.description,
        category=normalized_category,
        city=payload.city,
        pincode=payload.pincode,
        has_coordinates=(payload.latitude is not None and payload.longitude is not None),
    )

    # 8. Save accepted scam report
    scam_report = ScamReport(
        identifier_id=identifier_record.id,
        area_id=area_record.id if area_record else None,
        scam_type=normalized_category,
        description=payload.description.strip(),
        status="accepted",
        trust_score=trust_score,
        reporter_fingerprint_hash=fingerprint_hash,
        source_ip_hash=ip_hash,
    )
    db.add(scam_report)
    db.commit()
    db.refresh(scam_report)

    return ReportCreateResponse(
        status="success",
        message="Report submitted successfully",
        report_id=f"rep_{scam_report.id}",
        normalized_target=normalized.normalized_value,
        target_type=normalized.identifier_type,
    )
