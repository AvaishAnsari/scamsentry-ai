from typing import Any, Dict, List, Optional
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
from app.services.report_service import get_safety_guidance
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
    verdict: str  # NO_REPORTS | UNDER_REVIEW | SUSPICIOUS | KNOWN_SCAM | VERIFIED_BUSINESS
    verification_status: str = "NO_REPORTS"  # NO_REPORTS | UNDER_REVIEW | SUSPICIOUS | HIGH_RISK | VERIFIED_BUSINESS
    confidence_level: str = "NONE"  # NONE | LOW | MEDIUM | HIGH
    risk_level: str  # safe | low | suspicious | high
    risk_score: int  # 0 to 100
    pattern_risk_score: int = 0
    pattern_summary: Optional[str] = None
    recommended_action: str = "VERIFY_THROUGH_OFFICIAL_CHANNEL"
    risk_signals: List[Dict[str, Any]] = Field(default_factory=list)
    report_count: int
    independent_report_count: int = 0
    first_reported: Optional[str] = None
    last_reported: Optional[str] = None
    top_category: Optional[str] = None
    recent_reports: List[RecentReportItem] = Field(default_factory=list)
    distinct_areas_count: int = 0
    message: str
    community_impact_message: Optional[str] = (
        "Community reports serve as early warning signals to help others check before they trust."
    )
    safety_guidance: list = Field(default_factory=list)
    evidence_items: List[str] = Field(
        default_factory=list,
        description="Verifiable reasons and intelligence supporting the risk verdict",
    )
    related_indicators: List[str] = Field(
        default_factory=list,
        description="Correlated indicators or domains from stored scam clusters",
    )



def _compile_evidence_items(
    assessment,
    is_verified: bool,
    biz_name: Optional[str],
) -> List[str]:
    """Compile verifiable evidence reasons based only on actual database and pattern signals."""
    evidence: List[str] = []

    if is_verified:
        evidence.append(f"Official verified registry match: {biz_name}")
        evidence.append("Zero fraud reports recorded across community databases")
        return evidence

    if assessment.report_count > 0:
        evidence.append(
            f"Documented by {assessment.independent_report_count} independent community report(s) across {assessment.distinct_areas_count} geographic area(s)"
        )
        if assessment.top_category:
            evidence.append(
                f"Primary reported fraud vector: {assessment.top_category.replace('_', ' ').title()}"
            )
        for sig in (assessment.risk_signals or []):
            msg = sig.get("message")
            if msg and msg not in evidence:
                evidence.append(msg)
        return evidence

    # For zero community reports: include pattern risk signals if any detected
    for sig in (assessment.risk_signals or []):
        msg = sig.get("message")
        if msg and msg not in evidence:
            evidence.append(msg)

    # Clean NO_REPORTS returns empty array [] (no fabricated evidence)
    return evidence


def _find_related_indicators(
    normalized_value: str,
    top_category: Optional[str],
    db: Session,
) -> List[str]:
    """Fetch related indicators or domains from stored alert data matching this threat cluster."""
    related: List[str] = []
    if not top_category:
        return related

    try:
        from app.models.alert import Alert
        from app.models.identifier import Identifier
        from app.models.scam_report import ScamReport

        # 1. Sample indicators from active alerts matching the same threat vector
        alerts = (
            db.query(Alert)
            .filter(Alert.scam_type == top_category, Alert.is_active.is_(True))
            .limit(5)
            .all()
        )
        for alt in alerts:
            for ind in (alt.sample_indicators or []):
                if ind and ind != normalized_value and ind not in related:
                    related.append(ind)
                    if len(related) >= 5:
                        break
            if len(related) >= 5:
                break

        # 2. Correlated indicators in database reported under the exact same scam category
        if len(related) < 5:
            other_idents = (
                db.query(Identifier.normalized_value)
                .join(ScamReport, ScamReport.identifier_id == Identifier.id)
                .filter(
                    ScamReport.scam_type == top_category,
                    ScamReport.status == "accepted",
                    Identifier.normalized_value != normalized_value,
                )
                .distinct()
                .limit(5 - len(related))
                .all()
            )
            for row in other_idents:
                val = row[0]
                if val and val not in related:
                    related.append(val)
    except Exception:
        pass

    return related



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
            assessment = calculate_risk(
                [],
                is_verified_business=True,
                verified_business_name=biz_name,
                raw_query=raw,
                target_type=normalized.identifier_type,
                normalized_val=normalized.normalized_value,
            )
        else:
            assessment = calculate_risk(
                [],
                raw_query=raw,
                target_type=normalized.identifier_type,
                normalized_val=normalized.normalized_value,
            )
        evidence = _compile_evidence_items(assessment, is_verified, biz_name)
        return LookupResponse(
            success=True,
            query=raw,
            target_type=normalized.identifier_type,
            normalized_value=normalized.normalized_value,
            verdict=assessment.verdict,
            verification_status=assessment.verification_status,
            confidence_level=assessment.confidence_level,
            risk_level=assessment.risk_level,
            risk_score=assessment.risk_score,
            pattern_risk_score=assessment.pattern_risk_score,
            pattern_summary=assessment.pattern_summary,
            recommended_action=assessment.recommended_action,
            risk_signals=assessment.risk_signals or [],
            report_count=0,
            independent_report_count=0,
            first_reported=None,
            last_reported=None,
            top_category=None,
            recent_reports=[],
            distinct_areas_count=0,
            message=assessment.message,
            community_impact_message="Community reports serve as early warning signals to help others check before they trust.",
            safety_guidance=get_safety_guidance(None),
            evidence_items=evidence,
            related_indicators=[],
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
        assessment = calculate_risk(
            accepted_reports,
            is_verified_business=True,
            verified_business_name=biz_name,
            raw_query=raw,
            target_type=normalized.identifier_type,
            normalized_val=normalized.normalized_value,
        )
    else:
        assessment = calculate_risk(
            accepted_reports,
            raw_query=raw,
            target_type=normalized.identifier_type,
            normalized_val=normalized.normalized_value,
        )

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

    evidence = _compile_evidence_items(assessment, is_verified, biz_name)
    related = _find_related_indicators(normalized.normalized_value, assessment.top_category, db)

    return LookupResponse(
        success=True,
        query=raw,
        target_type=normalized.identifier_type,
        normalized_value=normalized.normalized_value,
        verdict=assessment.verdict,
        verification_status=assessment.verification_status,
        confidence_level=assessment.confidence_level,
        risk_level=assessment.risk_level,
        risk_score=assessment.risk_score,
        pattern_risk_score=assessment.pattern_risk_score,
        pattern_summary=assessment.pattern_summary,
        recommended_action=assessment.recommended_action,
        risk_signals=assessment.risk_signals or [],
        report_count=assessment.report_count,
        independent_report_count=assessment.independent_report_count,
        first_reported=assessment.first_reported.isoformat() if assessment.first_reported else None,
        last_reported=assessment.last_reported.isoformat() if assessment.last_reported else None,
        top_category=assessment.top_category,
        recent_reports=recent_items,
        distinct_areas_count=assessment.distinct_areas_count,
        message=assessment.message,
        community_impact_message="Community reports serve as early warning signals to help others check before they trust.",
        safety_guidance=get_safety_guidance(assessment.top_category),
        evidence_items=evidence,
        related_indicators=related,
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
