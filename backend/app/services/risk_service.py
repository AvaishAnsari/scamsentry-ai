"""Risk assessment and verdict calculation engine for ScamSentry AI.

This service uses a deterministic, rule-based formula combining:
1. Verified community evidence (independent reporters, recency, location spread, category diversity)
2. Scam pattern heuristics (impersonation, keywords, structural anomalies)
3. Verified official registry overrides
"""

from collections import Counter
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from app.models.scam_report import ScamReport
from app.services.pattern_detection_service import analyze_scam_patterns


@dataclass
class RiskAssessment:
    """Calculated risk assessment containing score, verdict, supporting metadata, and pattern signals."""

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
    risk_signals: List[Dict[str, Any]] = field(default_factory=list)
    pattern_risk_score: int = 0
    pattern_summary: str = ""
    recommended_action: str = "VERIFY_THROUGH_OFFICIAL_CHANNEL"


def calculate_risk(
    accepted_reports: List[ScamReport],
    is_verified_business: bool = False,
    verified_business_name: Optional[str] = None,
    raw_query: Optional[str] = None,
    target_type: Optional[str] = None,
    normalized_val: Optional[str] = None,
) -> RiskAssessment:
    """Calculate deterministic risk score, verdict, and pattern risk signals.

    VERIFICATION PROGRESSION:
    ------------------------
    1. NO_REPORTS        : 0 accepted reports. (Base score: 0). Heuristic patterns may generate
                          cautious risk signals without claiming fraud.
    2. UNDER_REVIEW      : Exactly 1 report or single reporter. (Base score: 25, Confidence: LOW).
                          One report does NOT confirm fraud; prevents false accusations.
    3. SUSPICIOUS        : 2–4 independent reporters or moderate risk score. (Confidence: MEDIUM).
    4. KNOWN_SCAM/HIGH   : >= 5 independent reports or >= 3 reports with score >= 60. (Confidence: HIGH).
    5. VERIFIED_BUSINESS : Officially verified or toll-free entity. (Score: 5, Confidence: HIGH).
    """
    query_str = raw_query or ""
    t_type = target_type or "phone"
    norm_val = normalized_val or query_str

    # 1. Verified business registry check
    if is_verified_business:
        biz_name = verified_business_name or "Official verified entity"
        pattern_res = analyze_scam_patterns(
            raw_query=query_str,
            target_type=t_type,
            normalized_val=norm_val,
            accepted_reports=accepted_reports,
            is_verified=True,
            community_risk_score=5,
            community_verdict="VERIFIED_BUSINESS",
        )
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
            risk_signals=[s.model_dump() for s in pattern_res.risk_signals],
            pattern_risk_score=pattern_res.pattern_risk_score,
            pattern_summary=pattern_res.pattern_summary,
            recommended_action=pattern_res.recommended_action,
        )

    report_count = len(accepted_reports)

    # 2. No Community Reports Case
    if report_count == 0:
        pattern_res = analyze_scam_patterns(
            raw_query=query_str,
            target_type=t_type,
            normalized_val=norm_val,
            accepted_reports=[],
            is_verified=False,
            community_risk_score=0,
            community_verdict="NO_REPORTS",
        )

        has_signals = len(pattern_res.risk_signals) > 0
        conf_level = "LOW" if has_signals else "NONE"

        message = (
            "No community reports recorded for this identifier so far. "
            "Note: silence does not guarantee safety."
        )

        return RiskAssessment(
            risk_score=0,
            verdict="NO_REPORTS",
            verification_status="NO_REPORTS",
            risk_level="safe",
            confidence_level=conf_level,
            report_count=0,
            independent_report_count=0,
            first_reported=None,
            last_reported=None,
            top_category=None,
            distinct_areas_count=0,
            message=message,
            risk_signals=[s.model_dump() for s in pattern_res.risk_signals],
            pattern_risk_score=pattern_res.pattern_risk_score,
            pattern_summary=pattern_res.pattern_summary,
            recommended_action=pattern_res.recommended_action,
        )

    # 3. Independent Reporters Calculation
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

    # 4. Single Report / Single Reporter Guard (UNDER_REVIEW)
    if report_count == 1 or independent_report_count <= 1:
        pattern_res = analyze_scam_patterns(
            raw_query=query_str,
            target_type=t_type,
            normalized_val=norm_val,
            accepted_reports=accepted_reports,
            is_verified=False,
            community_risk_score=25,
            community_verdict="UNDER_REVIEW",
        )
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
            risk_signals=[s.model_dump() for s in pattern_res.risk_signals],
            pattern_risk_score=pattern_res.pattern_risk_score,
            pattern_summary=pattern_res.pattern_summary,
            recommended_action=pattern_res.recommended_action,
        )

    # 5. Base Count Factor (Keyed to Independent Reporters)
    if independent_report_count == 2:
        count_factor = 25
    elif independent_report_count < 5:
        count_factor = 35
    else:
        count_factor = 45

    # 6. Trust Score Factor (Scaled 0–25)
    total_trust = sum(r.trust_score for r in accepted_reports)
    avg_trust = total_trust / report_count
    trust_factor = avg_trust * 0.25

    # 7. Recency Factor (Scaled 0–20)
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

    # 8. Area Spread Factor (Scaled 0–10)
    if distinct_areas_count >= 3:
        area_factor = 10
    elif distinct_areas_count == 2:
        area_factor = 5
    else:
        area_factor = 0

    # 9. Category Consistency Bonus (Up to 10 points)
    category_consistency = 0
    if categories:
        most_common_cat, cat_count = Counter(categories).most_common(1)[0]
        if (cat_count / len(categories)) >= 0.7:
            category_consistency = 10

    # 10. Run Pattern Detection Analysis
    computed_community_score = count_factor + trust_factor + recency_factor + area_factor + category_consistency
    tentative_score = int(min(100, max(0, round(computed_community_score))))

    pattern_res = analyze_scam_patterns(
        raw_query=query_str,
        target_type=t_type,
        normalized_val=norm_val,
        accepted_reports=accepted_reports,
        is_verified=False,
        community_risk_score=tentative_score,
        community_verdict="SUSPICIOUS" if tentative_score < 60 else "KNOWN_SCAM",
    )

    # Pattern boost: supporting evidence contributes up to 10 points to final score
    pattern_boost = min(10, round(pattern_res.pattern_risk_score * 0.10))
    final_score = int(min(100, max(0, round(computed_community_score + pattern_boost))))

    # 11. Multi-Signal Verdict & Verification Determination
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
        risk_signals=[s.model_dump() for s in pattern_res.risk_signals],
        pattern_risk_score=pattern_res.pattern_risk_score,
        pattern_summary=pattern_res.pattern_summary,
        recommended_action=pattern_res.recommended_action,
    )
