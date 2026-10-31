import hashlib
import os
import re
from datetime import datetime, timedelta, timezone
from typing import Optional, Set, Tuple
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.abuse_control import ReporterRateLimit
from app.models.area import Area
from app.models.identifier import Identifier
from app.models.scam_report import ScamReport
from app.services.identifier_service import (
    IdentifierValidationError,
    NormalizedIdentifier,
    normalize_identifier,
)

# Salt for anonymous fingerprinting
REPORTER_HASH_SALT = os.getenv("REPORTER_HASH_SALT", "scamsentry_hackathon_salt_2026")

# Controlled set of valid scam categories with aliases
VALID_SCAM_CATEGORIES = {
    "digital_arrest",
    "upi_fraud",
    "fake_kyc",
    "phishing",
    "fake_job",
    "loan_scam",
    "investment_fraud",
    "electricity_bill",
    "impersonation",
    "fake_customer_care",
    "otp_fraud",
    "lottery",
    "other",
}

CATEGORY_ALIASES = {
    "upi_refund": "upi_fraud",
    "kyc_fraud": "fake_kyc",
    "job_scam": "fake_job",
    "fake_job_offer": "fake_job",
    "loan_app": "loan_scam",
    "loan_app_threat": "loan_scam",
    "investment_scam": "investment_fraud",
    "something_else": "other",
    "general": "other",
}


def generate_reporter_fingerprint(client_ip: Optional[str], user_agent: Optional[str]) -> str:
    """Generate a deterministic, salted SHA-256 hash representing the anonymous client.

    Raw IPs and User-Agents are NEVER stored or returned.
    """
    ip_str = (client_ip or "127.0.0.1").strip()
    ua_str = (user_agent or "unknown_agent").strip()
    data = f"{REPORTER_HASH_SALT}:fp:{ip_str}:{ua_str}".encode("utf-8")
    return hashlib.sha256(data).hexdigest()


def generate_source_ip_hash(client_ip: Optional[str]) -> str:
    """Generate an anonymous salted hash of the network context."""
    ip_str = (client_ip or "127.0.0.1").strip()
    data = f"{REPORTER_HASH_SALT}:ip:{ip_str}".encode("utf-8")
    return hashlib.sha256(data).hexdigest()


def validate_and_normalize_category(raw_category: str) -> str:
    """Validate and map category to the controlled schema set.

    Raises:
        ValueError if the category is unsupported.
    """
    if not raw_category or not isinstance(raw_category, str):
        raise ValueError("Scam category is required.")

    clean_cat = raw_category.strip().lower().replace(" ", "_").replace("-", "_")

    # Check aliases
    clean_cat = CATEGORY_ALIASES.get(clean_cat, clean_cat)

    if clean_cat not in VALID_SCAM_CATEGORIES:
        valid_options = ", ".join(sorted(VALID_SCAM_CATEGORIES))
        raise ValueError(
            f"Invalid scam category '{raw_category}'. Supported categories: {valid_options}"
        )

    return clean_cat


def check_and_update_rate_limit(
    db: Session,
    fingerprint_hash: str,
    max_reports: int = 5,
    window_hours: int = 1,
) -> Tuple[bool, Optional[str]]:
    """Enforce rate limits per anonymous reporter fingerprint using a sliding window.

    Rule: Maximum 5 accepted reports per anonymous fingerprint per rolling 1-hour window.

    Returns:
        (is_allowed: bool, error_message: Optional[str])
    """
    now = datetime.now(timezone.utc)
    window_duration = timedelta(hours=window_hours)

    stmt = select(ReporterRateLimit).where(
        ReporterRateLimit.fingerprint_hash == fingerprint_hash
    )
    record = db.execute(stmt).scalar_one_or_none()

    if record is None:
        # First submission from this fingerprint
        new_record = ReporterRateLimit(
            fingerprint_hash=fingerprint_hash,
            window_start=now,
            report_count=1,
            last_report_at=now,
        )
        db.add(new_record)
        db.commit()
        return True, None

    # Handle timezone awareness
    win_start = record.window_start
    if win_start.tzinfo is None:
        win_start = win_start.replace(tzinfo=timezone.utc)

    elapsed = now - win_start

    if elapsed > window_duration:
        # Window expired -> reset window
        record.window_start = now
        record.report_count = 1
        record.last_report_at = now
        db.commit()
        return True, None

    # Current window active
    if record.report_count >= max_reports:
        remaining_seconds = int((window_duration - elapsed).total_seconds())
        remaining_minutes = max(1, remaining_seconds // 60)
        return (
            False,
            f"Rate limit exceeded: maximum {max_reports} reports per {window_hours} hour(s). "
            f"Please wait {remaining_minutes} minute(s) before submitting again.",
        )

    record.report_count += 1
    record.last_report_at = now
    db.commit()
    return True, None


def is_duplicate_report(
    db: Session,
    identifier_id: int,
    fingerprint_hash: str,
    scam_category: str,
    window_hours: int = 24,
) -> bool:
    """Check if the same anonymous fingerprint reported the same identifier & category recently.

    Duplicate rule: Same (identifier_id, reporter_fingerprint_hash, scam_type) within last 24h.
    """
    cutoff = datetime.now(timezone.utc) - timedelta(hours=window_hours)

    stmt = select(ScamReport).where(
        ScamReport.identifier_id == identifier_id,
        ScamReport.reporter_fingerprint_hash == fingerprint_hash,
        ScamReport.scam_type == scam_category,
        ScamReport.created_at >= cutoff,
    )
    existing = db.execute(stmt).scalars().first()
    return existing is not None


def calculate_initial_trust_score(
    description: str,
    category: str,
    city: Optional[str] = None,
    pincode: Optional[str] = None,
    has_coordinates: bool = False,
) -> int:
    """Calculate an initial trust score (10 to 85) for an anonymous report.

    Guarantees:
    - Highly detailed reports with location context receive higher trust.
    - Minimal reports receive moderate/lower trust.
    - No single anonymous report can achieve 100 trust.
    """
    trust = 50  # Neutral baseline

    desc_len = len(description.strip()) if description else 0

    # Description length contribution
    if desc_len >= 100:
        trust += 15
    elif desc_len >= 40:
        trust += 10
    elif desc_len < 20:
        trust -= 10

    # Geographic context contribution
    if pincode and len(pincode.strip()) == 6:
        trust += 10
    if city and len(city.strip()) >= 3:
        trust += 5
    if has_coordinates:
        trust += 5

    # Category specificity
    if category != "other":
        trust += 5
    else:
        trust -= 5

    # Clamp between 10 and 85
    return max(10, min(85, trust))


def get_or_create_identifier(
    db: Session,
    raw_target: str,
    expected_type: Optional[str] = None,
) -> Tuple[Identifier, NormalizedIdentifier]:
    """Normalize user input and get or create the canonical Identifier record."""
    normalized = normalize_identifier(raw_target, expected_type=expected_type)

    stmt = select(Identifier).where(
        Identifier.identifier_type == normalized.identifier_type,
        Identifier.normalized_value == normalized.normalized_value,
    )
    identifier_record = db.execute(stmt).scalar_one_or_none()

    if identifier_record is None:
        identifier_record = Identifier(
            identifier_type=normalized.identifier_type,
            raw_value=normalized.raw_value,
            normalized_value=normalized.normalized_value,
        )
        db.add(identifier_record)
        db.commit()
        db.refresh(identifier_record)

    return identifier_record, normalized


def get_or_create_area(
    db: Session,
    city: Optional[str] = None,
    state: Optional[str] = None,
    pincode: Optional[str] = None,
    area_name: Optional[str] = None,
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
) -> Optional[Area]:
    """Retrieve or create an approximate geographic Area record for privacy-preserving aggregation."""
    clean_city = city.strip() if city else None
    clean_state = state.strip() if state else None
    clean_pin = pincode.strip() if pincode else None
    clean_name = area_name.strip() if area_name else (clean_city or "Unknown Area")

    if not clean_city and not clean_pin and not clean_name:
        return None

    # Query existing area
    query = select(Area)
    if clean_pin:
        query = query.where(Area.pincode == clean_pin)
    elif clean_city:
        query = query.where(Area.city == clean_city)

    if area_name:
        query = query.where(Area.name == clean_name)

    area_record = db.execute(query).scalars().first()

    if area_record is None:
        area_record = Area(
            name=clean_name,
            city=clean_city,
            state=clean_state,
            pincode=clean_pin,
            latitude=latitude,
            longitude=longitude,
        )
        db.add(area_record)
        db.commit()
        db.refresh(area_record)

    return area_record
