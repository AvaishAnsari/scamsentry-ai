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
    verdict: str  # NO_REPORTS | SUSPICIOUS | KNOWN_SCAM | VERIFIED_BUSINESS
    risk_level: str  # safe | suspicious | high
    report_count: int
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
    """Calculate deterministic risk score and verdict for a set of accepted scam reports.

    RISK FORMULA SPECIFICATION:
    --------------------------
    Total Score = min(100, Base Count Factor + Trust Factor + Recency Factor + Area Spread Factor)

    1. Base Count Factor (Max 45 points):
       - 0 reports: 0 pts
       - 1 report: 15 pts
       - 2 reports: 25 pts
       - 3–4 reports: 35 pts
       - 5+ reports: 45 pts

    2. Trust Score Factor (Max 25 points):
       - Average internal trust score of accepted reports (0–100) scaled by 0.25.
       - e.g., avg trust 80 -> 20 pts; avg trust 50 -> 12.5 pts.

    3. Recency Factor (Max 20 points):
       - Most recent report within last 48 hours: +20 pts
       - Most recent report within last 7 days: +15 pts
       - Most recent report within last 30 days: +10 pts
       - Older than 30 days: +5 pts

    4. Area Spread Factor (Max 10 points):
       - Reports originating across >= 3 distinct geographic areas: +10 pts
       - Reports originating across 2 distinct areas: +5 pts
       - Single area: 0 pts

    VERDICT RULES:
    -------------
    - VERIFIED_BUSINESS: Explicitly flagged verified entity with named source. Score: 0-10.
    - NO_REPORTS: Exactly 0 accepted reports (Score: 0).
    - SUSPICIOUS: 1-2 reports or risk score between 20 and 59.
    - KNOWN_SCAM: >= 3 reports or risk score >= 60.

    RISK LEVEL TIERS:
    ----------------
    - "safe": 0–19
    - "suspicious": 20–59
    - "high": 60–100
    """
    if is_verified_business:
        biz_name = verified_business_name or "Official verified entity"
        return RiskAssessment(
            risk_score=5,
            verdict="VERIFIED_BUSINESS",
            risk_level="safe",
            report_count=len(accepted_reports),
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
            risk_level="safe",
            report_count=0,
            first_reported=None,
            last_reported=None,
            top_category=None,
            distinct_areas_count=0,
            message="No community reports recorded for this identifier so far. Note: silence does not guarantee safety.",
        )

    # 1. Base Count Factor
    if report_count == 1:
        count_factor = 15
    elif report_count == 2:
        count_factor = 25
    elif report_count < 5:
        count_factor = 35
    else:
        count_factor = 45

    # 2. Trust Score Factor
    total_trust = sum(r.trust_score for r in accepted_reports)
    avg_trust = total_trust / report_count
    trust_factor = avg_trust * 0.25

    # Chronological timestamps
    sorted_reports = sorted(accepted_reports, key=lambda r: r.created_at, reverse=True)
    latest_report = sorted_reports[0]
    first_report = sorted_reports[-1]

    # 3. Recency Factor
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

    # 4. Area Spread Factor
    area_ids = {r.area_id for r in accepted_reports if r.area_id is not None}
    distinct_areas_count = len(area_ids)
    if distinct_areas_count >= 3:
        area_factor = 10
    elif distinct_areas_count == 2:
        area_factor = 5
    else:
        area_factor = 0

    # Total Score calculation
    computed_score = count_factor + trust_factor + recency_factor + area_factor
    final_score = int(min(100, max(0, round(computed_score))))

    # Top reported category
    categories = [r.scam_type for r in accepted_reports if r.scam_type]
    top_category = Counter(categories).most_common(1)[0][0] if categories else None

    # Verdict determination
    if final_score >= 60 or report_count >= 3:
        verdict = "KNOWN_SCAM"
        risk_level = "high"
        message = (
            f"High risk. Reported by {report_count} user(s) as a potential scam. "
            f"Most frequent category: {top_category or 'general fraud'}."
        )
    else:
        verdict = "SUSPICIOUS"
        risk_level = "suspicious"
        message = (
            f"Medium risk. Flagged in {report_count} recent community report(s). "
            f"Exercise caution and avoid sharing OTPs or credentials."
        )

    return RiskAssessment(
        risk_score=final_score,
        verdict=verdict,
        risk_level=risk_level,
        report_count=report_count,
        first_reported=first_report.created_at,
        last_reported=latest_report.created_at,
        top_category=top_category,
        distinct_areas_count=distinct_areas_count,
        message=message,
    )
