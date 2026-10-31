"""Scam Pattern Detection & Risk Signal Engine for ScamSentry AI.

Analyzes phone numbers, UPI IDs, emails, and URLs for suspicious heuristics,
behavioral spikes, and impersonation indicators.

SAFETY CONSTRAINT:
Pattern detection produces risk signals and early warning indicators.
It NEVER automatically confirms an identifier as a scam on patterns alone
without strong corroborating independent community evidence.
"""

from collections import Counter
from datetime import datetime, timezone
import re
from typing import Any, Dict, List, Optional
from urllib.parse import urlsplit
from pydantic import BaseModel, Field

from app.models.scam_report import ScamReport


class RiskSignal(BaseModel):
    """Structured suspicious indicator detected by the pattern engine."""

    type: str = Field(..., description="Canonical signal type identifier")
    severity: str = Field(..., description="Signal severity: 'low', 'medium', 'high', 'critical'")
    message: str = Field(..., description="Human-readable explanation of the detected pattern")
    confidence: str = Field(default="medium", description="Signal confidence: 'low', 'medium', 'high'")


class PatternAnalysisResult(BaseModel):
    """Aggregate result from the scam pattern detection engine."""

    pattern_risk_score: int = Field(0, description="Pattern heuristic risk score from 0 to 100")
    confidence_level: str = Field("NONE", description="Overall pattern confidence: 'NONE', 'LOW', 'MEDIUM', 'HIGH'")
    pattern_summary: str = Field(..., description="High-level narrative summary of pattern assessment")
    risk_signals: List[RiskSignal] = Field(default_factory=list, description="List of detected risk signals")
    recommended_action: str = Field(
        "VERIFY_THROUGH_OFFICIAL_CHANNEL",
        description="Recommended safety action for user guidance",
    )


# Suspicious terminology dictionaries
SUSPICIOUS_URL_KEYWORDS = [
    "login", "verify", "verification", "kyc", "update", "reward",
    "refund", "secure", "account", "bonus", "claim", "helpdesk",
    "portal", "pan", "sim", "otp", "banking", "authenticate", "passbook",
]

SUSPICIOUS_UPI_KEYWORDS = [
    "kyc", "verify", "verification", "update", "auth", "pan",
    "refund", "claim", "cashback", "reward", "lottery", "prize", "bonus", "settlement",
    "support", "helpline", "care", "helpdesk", "customer", "service", "desk",
    "police", "cbi", "rbi", "cyber", "dept", "official", "telecom", "customs",
    "secure", "security", "safe",
]

SUSPICIOUS_EMAIL_KEYWORDS = [
    "support", "security", "verification", "helpline", "banking",
    "service", "account", "alert", "fraud", "team", "care", "billing",
]

KNOWN_BRANDS = [
    "sbi", "hdfc", "icici", "axis", "pnb", "bob", "canara", "kotak",
    "paytm", "phonepe", "googlepay", "gpay", "bhim",
    "aadhaar", "uidai", "incometax", "parivahan", "epfo",
    "bescom", "tatapower", "mahadiscom",
    "jio", "airtel", "vi", "bsnl",
    "amazon", "flipkart", "netflix", "paypal",
]

OFFICIAL_BRAND_DOMAINS = {
    "sbi": ["sbi.co.in", "onlinesbi.sbi", "bank.sbi", "onlinesbi.com"],
    "hdfc": ["hdfcbank.com", "hdfc.com"],
    "icici": ["icicibank.com"],
    "axis": ["axisbank.com"],
    "paytm": ["paytm.com"],
    "phonepe": ["phonepe.com"],
    "amazon": ["amazon.in", "amazon.com"],
    "flipkart": ["flipkart.com"],
    "netflix": ["netflix.com"],
    "paypal": ["paypal.com"],
    "uidai": ["uidai.gov.in"],
    "incometax": ["incometax.gov.in"],
    "jio": ["jio.com"],
    "airtel": ["airtel.in"],
}

HIGH_RISK_TLDS = {
    "xyz", "top", "tk", "ml", "ga", "cf", "gq", "click",
    "live", "work", "buzz", "club", "fit", "rest", "surf",
    "icu", "cam", "vip", "cfd", "monster",
}

FREE_WEBMAILS = {
    "gmail.com", "yahoo.com", "outlook.com", "hotmail.com",
    "icloud.com", "protonmail.com", "zoho.com", "aol.com", "mail.com",
}


def _analyze_community_signals(accepted_reports: List[ScamReport]) -> List[RiskSignal]:
    """Analyze behavioral spikes, multi-category spread, and location distribution from report history."""
    signals: List[RiskSignal] = []
    if not accepted_reports:
        return signals

    report_count = len(accepted_reports)
    now = datetime.now(timezone.utc)

    # 1. Independent reporters calculation
    distinct_fingerprints = {
        r.reporter_fingerprint_hash for r in accepted_reports if r.reporter_fingerprint_hash
    }
    distinct_ips = {
        r.source_ip_hash for r in accepted_reports if r.source_ip_hash
    }
    independent_count = len(distinct_fingerprints) or len(distinct_ips) or report_count

    if independent_count >= 5:
        signals.append(
            RiskSignal(
                type="HIGH_COMMUNITY_CORROBORATION",
                severity="high",
                message=f"High corroboration: Confirmed by {independent_count} independent community reporters",
                confidence="high",
            )
        )
    elif independent_count >= 2:
        signals.append(
            RiskSignal(
                type="MULTIPLE_INDEPENDENT_REPORTS",
                severity="medium",
                message=f"Multiple independent community reports ({independent_count} reporters) logged",
                confidence="medium",
            )
        )
    elif report_count == 1:
        signals.append(
            RiskSignal(
                type="INITIAL_COMMUNITY_WARNING",
                severity="low",
                message="Single uncorroborated community warning registered; currently under community review",
                confidence="low",
            )
        )

    # 2. Category Diversity Signal (same identifier used across multiple scam campaigns)
    categories = [r.scam_type for r in accepted_reports if r.scam_type]
    unique_categories = set(categories)
    if len(unique_categories) >= 2:
        cat_names = ", ".join(sorted(c.replace("_", " ") for c in unique_categories)[:3])
        signals.append(
            RiskSignal(
                type="CATEGORY_DIVERSITY",
                severity="high",
                message=f"Identifier reported across multiple distinct scam vectors ({cat_names})",
                confidence="high",
            )
        )

    # 3. Reporting Spike Signal (sudden influx of reports within last 24h)
    recent_24h_reports = 0
    for r in accepted_reports:
        created = r.created_at
        if created:
            if created.tzinfo is None:
                created = created.replace(tzinfo=timezone.utc)
            if (now - created).total_seconds() <= 86400:
                recent_24h_reports += 1

    if recent_24h_reports >= 5 or (report_count >= 3 and (recent_24h_reports / report_count) >= 0.5):
        signals.append(
            RiskSignal(
                type="REPORT_SPIKE",
                severity="high",
                message=f"Unusual reporting spike detected ({recent_24h_reports} reports in the last 24 hours)",
                confidence="high",
            )
        )

    # 4. Geographic Spread Signal (same identifier attacking victims across multiple regions)
    area_ids = {r.area_id for r in accepted_reports if r.area_id is not None}
    if len(area_ids) >= 3:
        signals.append(
            RiskSignal(
                type="GEOGRAPHIC_SPREAD",
                severity="medium",
                message=f"Reports received from multiple geographic locations across India ({len(area_ids)} distinct areas)",
                confidence="medium",
            )
        )

    return signals


def _analyze_phone_patterns(raw_query: str, normalized_val: str) -> List[RiskSignal]:
    """Analyze telephone number heuristics."""
    signals: List[RiskSignal] = []
    digits = re.sub(r"\D", "", raw_query)

    # Toll-free helpline
    if digits.startswith("1800") or digits == "1930":
        return signals

    # Repetitive digit patterns (e.g., 9999999999 or 0000000000)
    if len(digits) >= 10:
        local_10 = digits[-10:]
        if len(set(local_10)) <= 2:
            signals.append(
                RiskSignal(
                    type="SUSPICIOUS_PHONE_REPETITION",
                    severity="low",
                    message="Phone number contains highly repetitive or synthetic digit patterns",
                    confidence="low",
                )
            )

    return signals


def _analyze_upi_patterns(raw_query: str, normalized_val: str) -> List[RiskSignal]:
    """Analyze UPI Virtual Payment Address naming patterns."""
    signals: List[RiskSignal] = []
    val = normalized_val.lower()
    if "@" not in val:
        return signals

    handle, psp = val.split("@", 1)

    # Check for impersonation terms in handle
    matched_keywords = [kw for kw in SUSPICIOUS_UPI_KEYWORDS if kw in handle]
    if matched_keywords:
        sample_terms = ", ".join(f"'{k}'" for k in matched_keywords[:2])
        signals.append(
            RiskSignal(
                type="SUSPICIOUS_KEYWORD_PATTERN",
                severity="medium" if len(matched_keywords) >= 2 else "low",
                message=f"Identifier name resembles commonly impersonated service terminology (e.g. {sample_terms})",
                confidence="low",
            )
        )

    # Check for known brand names in handle on third-party PSPs
    for brand in KNOWN_BRANDS:
        if brand in handle:
            # If the brand is sbi but PSP is okaxis or paytm (e.g. sbi-support@okaxis)
            if brand not in psp:
                signals.append(
                    RiskSignal(
                        type="BRAND_NAME_IN_HANDLE",
                        severity="medium",
                        message=f"UPI handle references banking or corporate brand '{brand.upper()}' on third-party provider '@{psp}'",
                        confidence="low",
                    )
                )
                break

    # Number padding in handle (e.g., kyc.update999@upi)
    if re.search(r"\d{3,}", handle) and matched_keywords:
        signals.append(
            RiskSignal(
                type="NUMBERED_SERVICE_HANDLE",
                severity="low",
                message="Handle combines service keywords with sequential numeric suffix",
                confidence="low",
            )
        )

    return signals


def _analyze_email_patterns(raw_query: str, normalized_val: str) -> List[RiskSignal]:
    """Analyze email address structure and impersonation indicators."""
    signals: List[RiskSignal] = []
    val = normalized_val.lower()
    if "@" not in val:
        return signals

    local_part, domain = val.split("@", 1)

    # Impersonation keywords in local part
    matched_keywords = [kw for kw in SUSPICIOUS_EMAIL_KEYWORDS if kw in local_part]

    # Brand names in local part
    matched_brands = [b for b in KNOWN_BRANDS if b in local_part]

    # Free webmail sending official-sounding alerts
    if domain in FREE_WEBMAILS and (matched_brands or matched_keywords):
        subject = matched_brands[0].upper() if matched_brands else "Banking/Official"
        signals.append(
            RiskSignal(
                type="FREE_WEBMAIL_BRAND_MISMATCH",
                severity="medium",
                message=f"Official {subject} terminology sent from a generic public email domain (@{domain})",
                confidence="medium",
            )
        )
    elif matched_brands:
        # Check if domain belongs to official brand
        is_official = False
        for b in matched_brands:
            official_domains = OFFICIAL_BRAND_DOMAINS.get(b, [])
            if any(domain == od or domain.endswith(f".{od}") for od in official_domains):
                is_official = True
                break

        if not is_official:
            signals.append(
                RiskSignal(
                    type="EMAIL_BRAND_IMPERSONATION",
                    severity="medium",
                    message=f"Email username references brand '{matched_brands[0].upper()}' on unrelated domain '{domain}'",
                    confidence="medium",
                )
            )

    # Excessive hyphens or numbers
    if local_part.count("-") >= 2 or len(re.findall(r"\d", local_part)) >= 5:
        signals.append(
            RiskSignal(
                type="EXCESSIVE_HYPHENS_NUMBERS",
                severity="low",
                message="Email address contains unusual hyphens or number padding",
                confidence="low",
            )
        )

    return signals


def _analyze_url_patterns(raw_query: str, normalized_val: str) -> List[RiskSignal]:
    """Analyze website URLs for phishing heuristics and domain spoofing."""
    signals: List[RiskSignal] = []
    raw = normalized_val.lower()

    try:
        parsed = urlsplit(raw if raw.startswith(("http://", "https://")) else f"https://{raw}")
    except Exception:
        return signals

    hostname = (parsed.hostname or "").lower()
    path = parsed.path.lower()
    query = parsed.query.lower()

    if not hostname:
        return signals

    # 1. IP-address based URL
    if re.match(r"^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$", hostname):
        signals.append(
            RiskSignal(
                type="IP_ADDRESS_URL",
                severity="high",
                message="Website uses a raw numerical IP address instead of a registered domain name",
                confidence="medium",
            )
        )
        return signals

    # Extract domain and labels
    labels = hostname.split(".")
    tld = labels[-1] if labels else ""

    # 2. Brand impersonation detection
    for brand in KNOWN_BRANDS:
        if brand in hostname:
            official_domains = OFFICIAL_BRAND_DOMAINS.get(brand, [])
            is_legit = any(hostname == od or hostname.endswith(f".{od}") for od in official_domains)
            if not is_legit:
                signals.append(
                    RiskSignal(
                        type="BRAND_IMPERSONATION",
                        severity="high",
                        message=f"Domain name appears to imitate a banking or enterprise brand ('{brand.upper()}')",
                        confidence="high",
                    )
                )
                break

    # 3. Suspicious keywords in domain, path, or query
    matched_url_keywords = [
        kw for kw in SUSPICIOUS_URL_KEYWORDS
        if kw in hostname or kw in path or kw in query
    ]
    if matched_url_keywords:
        sample_kws = ", ".join(f"'{k}'" for k in matched_url_keywords[:3])
        signals.append(
            RiskSignal(
                type="SUSPICIOUS_KEYWORDS",
                severity="medium",
                message=f"URL contains verification or urgency-related keywords ({sample_kws}) commonly found in phishing pages",
                confidence="medium",
            )
        )

    # 4. Excessive hyphens in hostname
    if hostname.count("-") >= 2:
        signals.append(
            RiskSignal(
                type="EXCESSIVE_HYPHENS",
                severity="medium",
                message="Domain contains multiple hyphens, a technique frequently used to craft spoofed lookalike links",
                confidence="low",
            )
        )

    # 5. Deep/unusual subdomain nesting
    if len(labels) >= 4 and not hostname.endswith(".gov.in"):
        signals.append(
            RiskSignal(
                type="UNUSUAL_SUBDOMAINS",
                severity="medium",
                message=f"Unusually long or deeply nested subdomain structure ({len(labels)} labels)",
                confidence="low",
            )
        )

    # 6. High-risk TLD
    if tld in HIGH_RISK_TLDS:
        signals.append(
            RiskSignal(
                type="HIGH_RISK_TLD",
                severity="medium",
                message=f"Domain registered on a top-level domain (.{tld}) frequently associated with short-lived deceptive sites",
                confidence="low",
            )
        )

    return signals


def analyze_scam_patterns(
    raw_query: str,
    target_type: str,
    normalized_val: str,
    accepted_reports: Optional[List[ScamReport]] = None,
    is_verified: bool = False,
    community_risk_score: int = 0,
    community_verdict: str = "NO_REPORTS",
) -> PatternAnalysisResult:
    """Run full deterministic pattern detection pipeline across all identifier types.

    Combines:
    - Structural and naming heuristics (phone, UPI, email, URL)
    - Dynamic report telemetry (spikes, category diversity, geographic spread)
    - Verified business overrides

    Returns:
        PatternAnalysisResult with risk_signals, pattern_risk_score, summary, and action.
    """
    # Officially verified entities bypass pattern suspicion
    if is_verified:
        return PatternAnalysisResult(
            pattern_risk_score=0,
            confidence_level="HIGH",
            pattern_summary="Verified official directory listing. No malicious patterns identified.",
            risk_signals=[],
            recommended_action="PROCEED_WITH_CAUTION",
        )

    reports = accepted_reports or []
    signals: List[RiskSignal] = []

    # 1. Evaluate behavioral community telemetry
    signals.extend(_analyze_community_signals(reports))

    # 2. Evaluate identifier-specific static & heuristic patterns
    t_type = (target_type or "").lower()
    if t_type == "phone":
        signals.extend(_analyze_phone_patterns(raw_query, normalized_val))
    elif t_type == "upi":
        signals.extend(_analyze_upi_patterns(raw_query, normalized_val))
    elif t_type == "email":
        signals.extend(_analyze_email_patterns(raw_query, normalized_val))
    elif t_type == "url":
        signals.extend(_analyze_url_patterns(raw_query, normalized_val))

    # 3. Calculate pattern risk score (0 to 100)
    score_weights = {
        "IP_ADDRESS_URL": 45,
        "IP_BASED_URL": 45,
        "BRAND_IMPERSONATION": 40,
        "REPORT_SPIKE": 35,
        "FREE_WEBMAIL_BRAND_MISMATCH": 30,
        "FREE_EMAIL_BRAND_MISMATCH": 30,
        "CATEGORY_DIVERSITY": 25,
        "HIGH_COMMUNITY_CORROBORATION": 25,
        "SUSPICIOUS_KEYWORD_PATTERN": 20,
        "SUSPICIOUS_KEYWORDS": 20,
        "IMPERSONATION_TERMS": 20,
        "BRAND_NAME_IN_HANDLE": 20,
        "EMAIL_BRAND_IMPERSONATION": 20,
        "EXCESSIVE_HYPHENS": 15,
        "GEOGRAPHIC_SPREAD": 15,
        "MULTIPLE_INDEPENDENT_REPORTS": 15,
        "HIGH_RISK_TLD": 15,
        "UNUSUAL_SUBDOMAINS": 10,
        "NUMBERED_SERVICE_HANDLE": 10,
        "SUSPICIOUS_PHONE_REPETITION": 10,
        "EXCESSIVE_HYPHENS_NUMBERS": 10,
        "INITIAL_COMMUNITY_WARNING": 5,
    }

    raw_score = 0
    seen_types = set()
    for s in signals:
        if s.type not in seen_types:
            raw_score += score_weights.get(s.type, 10)
            seen_types.add(s.type)

    pattern_risk_score = min(100, max(0, raw_score))

    # 4. Determine pattern confidence level
    # Without corroborating community reports, heuristic pattern confidence remains cautious (LOW)
    if not reports:
        confidence = "LOW" if signals else "NONE"
    else:
        high_count = sum(1 for s in signals if s.confidence == "high")
        med_count = sum(1 for s in signals if s.confidence == "medium")
        if high_count >= 1 or med_count >= 2:
            confidence = "HIGH"
        elif med_count >= 1 or len(signals) >= 2:
            confidence = "MEDIUM"
        elif len(signals) == 1:
            confidence = "LOW"
        else:
            confidence = "NONE"

    # 5. Determine recommended user action
    is_known_scam = community_verdict == "KNOWN_SCAM" or community_risk_score >= 70
    is_suspicious = community_verdict == "SUSPICIOUS" or community_risk_score >= 40 or pattern_risk_score >= 50

    if is_known_scam:
        if t_type == "url":
            recommended_action = "AVOID_CLICKING_LINK"
        else:
            recommended_action = "DO_NOT_SHARE_MONEY"
    elif is_suspicious:
        if t_type == "url":
            recommended_action = "AVOID_CLICKING_LINK"
        elif any(s.type in ("BRAND_IMPERSONATION", "IMPERSONATION_TERMS", "FREE_WEBMAIL_BRAND_MISMATCH") for s in signals):
            recommended_action = "VERIFY_THROUGH_OFFICIAL_CHANNEL"
        else:
            recommended_action = "DO_NOT_SHARE_MONEY"
    elif len(signals) > 0:
        recommended_action = "VERIFY_THROUGH_OFFICIAL_CHANNEL"
    else:
        recommended_action = "PROCEED_WITH_CAUTION"

    # 6. Formulate high-level pattern summary
    if len(signals) == 0:
        pattern_summary = "No suspicious patterns or behavioral anomalies detected."
    elif len(reports) > 0:
        pattern_summary = (
            f"Suspicious activity detected: {len(signals)} risk signal(s) identified across community reports and pattern heuristics."
        )
    else:
        pattern_summary = (
            "Some patterns require caution, but there is not enough evidence to confirm fraud."
        )

    return PatternAnalysisResult(
        pattern_risk_score=pattern_risk_score,
        confidence_level=confidence,
        pattern_summary=pattern_summary,
        risk_signals=signals,
        recommended_action=recommended_action,
    )
