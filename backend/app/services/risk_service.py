"""Risk assessment and verdict calculation engine for ScamSentry AI.

This service uses a deterministic, rule-based formula designed for hackathon agility
and transparency. Risk scores range from 0 to 100 based on verified community evidence.
"""

from collections import Counter
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import List, Optional
from app.models.scam_report import ScamReport


@dataclass
class RiskAssessment:
    """Calculated risk assessment containing score, verdict, and supporting metadata."""

    risk_score: int  # 0 to 100
    verdict: str  # NO_REPORTS | UNDER_REVIEW | SUSPICIOUS | KNOWN_SCAM | VERIFIED_BUSINESS
    verification_status: str  # NO_REPORTS | UNDER_REVIEW | SUSPICIOUS | HIGH_RISK | VERIFIED_BUSINESS
    risk_level: str  # safe | low | suspicious | high
    confidence_level: str  # NONE | LOW | MEDIUM | HIGH
    report_count: int
    independent_report_count: int
    first_reported: Optional[datetime]
    last_reported: Optional[datetime]
    top_category: Optional[str]
    distinct_areas_count: int
    message: str


def calculate_risk(
    accepted_reports: List[ScamReport],
    is_verified_business: bool = False,
    verified_business_name: Optional[str] = None,
) -> RiskAssessment:
    """Calculate deterministic risk score and verdict for community scam reports.

    VERIFICATION PROGRESSION:
    ------------------------
    1. NO_REPORTS        : 0 accepted reports. (Score: 0, Confidence: NONE)
    2. UNDER_REVIEW      : Exactly 1 report or single reporter. (Score: 25, Confidence: LOW)
                          One report does NOT confirm fraud; prevents false accusations.
    3. SUSPICIOUS        : 2–4 independent reporters or moderate risk score. (Confidence: MEDIUM)
    4. KNOWN_SCAM/HIGH   : >= 5 independent reports or >= 3 reports with score >= 60. (Confidence: HIGH)
    5. VERIFIED_BUSINESS : Officially verified or toll-free entity. (Score: 5, Confidence: HIGH)
    """
    if is_verified_business:
        biz_name = verified_business_name or "Official verified entity"
        return RiskAssessment(
            risk_score=5,
            verdict="VERIFIED_BUSINESS",
            verification_status="VERIFIED_BUSINESS",
            risk_level="safe",
            confidence_level="HIGH",
            report_count=len(accepted_reports),
            independent_report_count=0,
            first_reported=None,
            last_reported=None,
            top_category=None,
            distinct_areas_count=0,
            message=f"Verified business entity ({biz_name}). Low risk.",
        )

    report_count = len(accepted_reports)
    if report_count == 0:
        return RiskAssessment(
            risk_score=0,
            verdict="NO_REPORTS",
            verification_status="NO_REPORTS",
            risk_level="safe",
            confidence_level="NONE",
            report_count=0,
            independent_report_count=0,
            first_reported=None,
            last_reported=None,
            top_category=None,
            distinct_areas_count=0,
            message="No community reports recorded for this identifier so far. Note: silence does not guarantee safety.",
        )

    # 1. Independent Reporters Calculation
    # Distinct salted reporter fingerprints ensure duplicate submissions by one person
    # cannot artificially inflate scam confidence.
    distinct_fingerprints = {
        r.reporter_fingerprint_hash for r in accepted_reports if r.reporter_fingerprint_hash
    }
    distinct_ips = {
        r.source_ip_hash for r in accepted_reports if r.source_ip_hash
    }
    if distinct_fingerprints:
        independent_report_count = len(distinct_fingerprints)
    elif distinct_ips:
        independent_report_count = len(distinct_ips)
    else:
        independent_report_count = report_count

    # Chronological timestamps
    sorted_reports = sorted(accepted_reports, key=lambda r: r.created_at, reverse=True)
    latest_report = sorted_reports[0]
    first_report = sorted_reports[-1]

    # Top reported category
    categories = [r.scam_type for r in accepted_reports if r.scam_type]
    top_category = Counter(categories).most_common(1)[0][0] if categories else None

    # Area spread
    area_ids = {r.area_id for r in accepted_reports if r.area_id is not None}
    distinct_areas_count = len(area_ids)

    # 2. Single Report / Single Reporter Guard (UNDER_REVIEW)
    # A single user report must NOT automatically mean that an identifier is confirmed scam!
    if report_count == 1 or independent_report_count <= 1:
        return RiskAssessment(
            risk_score=25,
            verdict="UNDER_REVIEW",
            verification_status="UNDER_REVIEW",
            risk_level="low",
            confidence_level="LOW",
            report_count=report_count,
            independent_report_count=independent_report_count,
            first_reported=first_report.created_at,
            last_reported=latest_report.created_at,
            top_category=top_category,
            distinct_areas_count=distinct_areas_count,
            message="This identifier has received an initial community report and is currently under review. One report does not confirm fraud; additional independent signals are required.",
        )

    # 3. Base Count Factor (Keyed to Independent Reporters)
    if independent_report_count == 2:
        count_factor = 25
    elif independent_report_count < 5:
        count_factor = 35
    else:
        count_factor = 45

    # 4. Trust Score Factor (Scaled 0–25)
    total_trust = sum(r.trust_score for r in accepted_reports)
    avg_trust = total_trust / report_count
    trust_factor = avg_trust * 0.25

    # 5. Recency Factor (Scaled 0–20)
    now = datetime.now(timezone.utc)
    latest_created = latest_report.created_at
    if latest_created.tzinfo is None:
        latest_created = latest_created.replace(tzinfo=timezone.utc)

    hours_ago = (now - latest_created).total_seconds() / 3600.0
    if hours_ago <= 48:
        recency_factor = 20
    elif hours_ago <= 24 * 7:
        recency_factor = 15
    elif hours_ago <= 24 * 30:
        recency_factor = 10
    else:
        recency_factor = 5

    # 6. Area Spread Factor (Scaled 0–10)
    if distinct_areas_count >= 3:
        area_factor = 10
    elif distinct_areas_count == 2:
        area_factor = 5
    else:
        area_factor = 0

    # 7. Category Consistency Bonus (Up to 10 points)
    # Multiple independent reporters flagging the same category indicates coordinated campaign
    category_consistency = 0
    if categories:
        most_common_cat, cat_count = Counter(categories).most_common(1)[0]
        if (cat_count / len(categories)) >= 0.7:
            category_consistency = 10

    # Total Score calculation
    computed_score = count_factor + trust_factor + recency_factor + area_factor + category_consistency
    final_score = int(min(100, max(0, round(computed_score))))

    # 8. Multi-Signal Verdict & Verification Determination
    if independent_report_count >= 5 or (independent_report_count >= 3 and final_score >= 60):
        verdict = "KNOWN_SCAM"
        verification_status = "HIGH_RISK"
        risk_level = "high"
        confidence_level = "HIGH"
        cat_disp = top_category.replace("_", " ") if top_category else "scam"
        message = (
            f"High-risk based on {independent_report_count} independent community reports and detected patterns. "
            f"Primary reported category: {cat_disp}."
        )
    else:
        verdict = "SUSPICIOUS"
        verification_status = "SUSPICIOUS"
        risk_level = "suspicious"
        confidence_level = "MEDIUM"
        message = (
            f"Multiple independent community reports ({independent_report_count} reporters) indicate a potential scam pattern. "
            f"Exercise caution and avoid sharing OTPs or credentials."
        )

    return RiskAssessment(
        risk_score=final_score,
        verdict=verdict,
        verification_status=verification_status,
        risk_level=risk_level,
        confidence_level=confidence_level,
        report_count=report_count,
        independent_report_count=independent_report_count,
        first_reported=first_report.created_at,
        last_reported=latest_report.created_at,
        top_category=top_category,
        distinct_areas_count=distinct_areas_count,
        message=message,
    )
