from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional
from sqlalchemy import case, func, select
from sqlalchemy.orm import Session

from app.models.alert import Alert
from app.models.area import Area
from app.models.identifier import Identifier
from app.models.scam_report import ScamReport


def mask_identifier(val: str, ident_type: str) -> str:
    """Mask identifier for privacy-preserving public alert summaries."""
    if not val:
        return ""
    val = val.strip()
    if ident_type == "phone":
        # Keep +91 and first 3 digits, mask last 4 digits
        if len(val) >= 10:
            return f"{val[:6]}*****{val[-2:]}"
        return f"{val[:3]}****"
    elif ident_type == "upi":
        # Mask handle before @: e.g. billpay@fakeupi -> b***y@fakeupi
        if "@" in val:
            handle, psp = val.split("@", 1)
            if len(handle) <= 2:
                masked_handle = f"{handle[0]}*"
            else:
                masked_handle = f"{handle[0]}{'*' * (len(handle) - 2)}{handle[-1]}"
            return f"{masked_handle}@{psp}"
        return f"{val[:2]}****"
    elif ident_type == "url":
        # Return domain/host only without sensitive path or query
        clean = val.replace("https://", "").replace("http://", "").split("/")[0]
        return clean
    return f"{val[:3]}***"


def detect_geographic_spikes(
    db: Session,
    recent_hours: int = 24,
    baseline_days: int = 7,
    min_recent_reports: int = 5,
    surge_multiplier: float = 2.0,
) -> List[Dict[str, Any]]:
    """Detect geographic areas where accepted scam reports in the recent window significantly exceed historical baseline.

    Rule:
    - recent_count >= min_recent_reports (default: 5)
    - recent_count >= baseline_daily_average * surge_multiplier (default: 2.0x)
    """
    now = datetime.now(timezone.utc)
    recent_cutoff = now - timedelta(hours=recent_hours)
    baseline_start = recent_cutoff - timedelta(days=baseline_days)

    # 1. Count recent accepted reports by area
    recent_stmt = (
        select(
            ScamReport.area_id,
            func.count(ScamReport.id).label("recent_count"),
        )
        .where(
            ScamReport.status == "accepted",
            ScamReport.created_at >= recent_cutoff,
            ScamReport.area_id.isnot(None),
        )
        .group_by(ScamReport.area_id)
        .having(func.count(ScamReport.id) >= min_recent_reports)
    )
    recent_counts = {row.area_id: row.recent_count for row in db.execute(recent_stmt).all()}

    if not recent_counts:
        return []

    # 2. Count baseline accepted reports in the preceding window
    baseline_stmt = (
        select(
            ScamReport.area_id,
            func.count(ScamReport.id).label("baseline_count"),
        )
        .where(
            ScamReport.status == "accepted",
            ScamReport.created_at >= baseline_start,
            ScamReport.created_at < recent_cutoff,
            ScamReport.area_id.in_(list(recent_counts.keys())),
        )
        .group_by(ScamReport.area_id)
    )
    baseline_counts = {row.area_id: row.baseline_count for row in db.execute(baseline_stmt).all()}

    # 3. Evaluate spikes
    spikes = []
    for area_id, rec_count in recent_counts.items():
        base_count = baseline_counts.get(area_id, 0)
        daily_baseline = base_count / float(baseline_days)

        # Compare ratio
        ratio = rec_count / max(1.0, daily_baseline)

        if rec_count >= min_recent_reports and (daily_baseline == 0 or rec_count >= daily_baseline * surge_multiplier):
            area = db.get(Area, area_id)
            if not area:
                continue

            # Determine dominant recent scam category in this area
            cat_stmt = (
                select(ScamReport.scam_type, func.count(ScamReport.id).label("cnt"))
                .where(
                    ScamReport.status == "accepted",
                    ScamReport.area_id == area_id,
                    ScamReport.created_at >= recent_cutoff,
                )
                .group_by(ScamReport.scam_type)
                .order_by(func.count(ScamReport.id).desc())
            )
            top_cat_row = db.execute(cat_stmt).first()
            dominant_cat = top_cat_row[0] if top_cat_row else "general fraud"

            # Score and severity calculation
            if ratio >= 4.0 or rec_count >= 15:
                severity = "CRITICAL"
                anomaly_score = min(100.0, 75.0 + ratio * 4.0)
            elif ratio >= 2.5 or rec_count >= 10:
                severity = "HIGH"
                anomaly_score = min(89.0, 60.0 + ratio * 4.0)
            else:
                severity = "MEDIUM"
                anomaly_score = min(69.0, 45.0 + ratio * 3.0)

            ratio_display = f"{round(ratio, 1)}x"
            message = (
                f"{rec_count} reports in {recent_hours} hours in {area.name}, "
                f"about {ratio_display} the usual {round(daily_baseline, 1)}/day. "
                f"Mostly {dominant_cat.replace('_', ' ')}."
            )

            spikes.append({
                "anomaly_type": "SPIKE",
                "area_id": area_id,
                "area_name": area.name,
                "city": area.city,
                "state": area.state,
                "scam_type": dominant_cat,
                "current_count": rec_count,
                "baseline_count": round(daily_baseline, 1),
                "anomaly_score": round(anomaly_score, 1),
                "severity": severity,
                "title": f"Sudden Spike in {dominant_cat.replace('_', ' ').title()}",
                "message": message,
            })

    return spikes


def detect_new_scam_types(
    db: Session,
    recent_days: int = 7,
    baseline_days: int = 30,
    min_recent_reports: int = 4,
    max_historical_reports: int = 1,
) -> List[Dict[str, Any]]:
    """Detect emerging scam categories with significant recent activity but negligible historical activity."""
    now = datetime.now(timezone.utc)
    recent_cutoff = now - timedelta(days=recent_days)
    baseline_start = recent_cutoff - timedelta(days=baseline_days)

    # 1. Recent counts per (area, category)
    recent_stmt = (
        select(
            ScamReport.area_id,
            ScamReport.scam_type,
            func.count(ScamReport.id).label("recent_count"),
        )
        .where(
            ScamReport.status == "accepted",
            ScamReport.created_at >= recent_cutoff,
            ScamReport.area_id.isnot(None),
        )
        .group_by(ScamReport.area_id, ScamReport.scam_type)
        .having(func.count(ScamReport.id) >= min_recent_reports)
    )
    recent_rows = db.execute(recent_stmt).all()

    new_types = []
    for row in recent_rows:
        area_id = row.area_id
        scam_type = row.scam_type
        recent_cnt = row.recent_count

        # Check historical count in preceding baseline window
        hist_stmt = (
            select(func.count(ScamReport.id))
            .where(
                ScamReport.status == "accepted",
                ScamReport.area_id == area_id,
                ScamReport.scam_type == scam_type,
                ScamReport.created_at >= baseline_start,
                ScamReport.created_at < recent_cutoff,
            )
        )
        hist_cnt = db.execute(hist_stmt).scalar() or 0

        if hist_cnt <= max_historical_reports:
            area = db.get(Area, area_id)
            if not area:
                continue

            severity = "HIGH" if recent_cnt >= 8 else "MEDIUM"
            anomaly_score = min(88.0, 50.0 + recent_cnt * 4.0)
            cat_display = scam_type.replace("_", " ").title()

            message = (
                f"{cat_display}: {recent_cnt} reports in {recent_days} days in {area.name}. "
                f"First time observed with this concentration in 30 days."
            )

            new_types.append({
                "anomaly_type": "NEW_SCAM_TYPE",
                "area_id": area_id,
                "area_name": area.name,
                "city": area.city,
                "state": area.state,
                "scam_type": scam_type,
                "current_count": recent_cnt,
                "baseline_count": float(hist_cnt),
                "anomaly_score": round(anomaly_score, 1),
                "severity": severity,
                "title": f"New Scam Pattern: {cat_display}",
                "message": message,
            })

    return new_types


def detect_identifier_surges(
    db: Session,
    recent_hours: int = 48,
    min_recent_reports: int = 4,
) -> List[Dict[str, Any]]:
    """Detect individual identifiers receiving a sudden cluster of accepted reports."""
    now = datetime.now(timezone.utc)
    recent_cutoff = now - timedelta(hours=recent_hours)

    stmt = (
        select(
            ScamReport.identifier_id,
            func.count(ScamReport.id).label("recent_count"),
        )
        .where(
            ScamReport.status == "accepted",
            ScamReport.created_at >= recent_cutoff,
        )
        .group_by(ScamReport.identifier_id)
        .having(func.count(ScamReport.id) >= min_recent_reports)
    )
    surge_rows = db.execute(stmt).all()

    surges = []
    for row in surge_rows:
        ident = db.get(Identifier, row.identifier_id)
        if not ident:
            continue

        # Get primary area and category for this identifier
        meta_stmt = (
            select(
                ScamReport.area_id,
                ScamReport.scam_type,
                func.count(ScamReport.id).label("cnt"),
            )
            .where(
                ScamReport.status == "accepted",
                ScamReport.identifier_id == ident.id,
                ScamReport.created_at >= recent_cutoff,
            )
            .group_by(ScamReport.area_id, ScamReport.scam_type)
            .order_by(func.count(ScamReport.id).desc())
        )
        meta_row = db.execute(meta_stmt).first()
        area_id = meta_row[0] if (meta_row and meta_row[0]) else None
        scam_type = meta_row[1] if meta_row else "fraud"

        # Fallback to first area if null
        if area_id is None:
            first_area = db.execute(select(Area)).scalars().first()
            if not first_area:
                continue
            area_id = first_area.id

        area = db.get(Area, area_id)
        area_name = area.name if area else "Multiple Areas"
        city = area.city if area else None
        state = area.state if area else None

        recent_cnt = row.recent_count
        masked = mask_identifier(ident.normalized_value, ident.identifier_type)
        severity = "CRITICAL" if recent_cnt >= 10 else "HIGH"
        anomaly_score = min(98.0, 65.0 + recent_cnt * 2.5)

        message = (
            f"High-frequency surge ({recent_cnt} reports in {recent_hours}h) targeting "
            f"{ident.identifier_type} {masked}. Category: {scam_type.replace('_', ' ')}."
        )

        surges.append({
            "anomaly_type": "IDENTIFIER_SURGE",
            "area_id": area_id,
            "area_name": area_name,
            "city": city,
            "state": state,
            "scam_type": scam_type,
            "current_count": recent_cnt,
            "baseline_count": 0.0,
            "anomaly_score": round(anomaly_score, 1),
            "severity": severity,
            "title": f"Surge in Reports for {ident.identifier_type.upper()}",
            "message": message,
        })

    return surges


def run_anomaly_detection(db: Session) -> Dict[str, Any]:
    """Execute all anomaly detectors and persist unique alerts without duplicating existing recent alerts."""
    now = datetime.now(timezone.utc)
    dedup_cutoff = now - timedelta(hours=24)

    # 1. Run all 3 detectors
    spikes = detect_geographic_spikes(db)
    new_types = detect_new_scam_types(db)
    surges = detect_identifier_surges(db)

    all_anomalies = spikes + new_types + surges
    created_count = 0
    updated_count = 0

    for item in all_anomalies:
        area_id = item["area_id"]
        alert_type = item["anomaly_type"]
        scam_type = item.get("scam_type")

        # Deduplication query: Check if an active alert for this area & type was created in the last 24h
        existing_stmt = select(Alert).where(
            Alert.area_id == area_id,
            Alert.alert_type == alert_type,
            Alert.created_at >= dedup_cutoff,
            Alert.is_active == True,
        )
        if scam_type:
            existing_stmt = existing_stmt.where(Alert.scam_type == scam_type)

        existing_alert = db.execute(existing_stmt).scalars().first()

        if existing_alert:
            # Update existing alert with latest counts if higher
            if item["current_count"] > existing_alert.current_count:
                existing_alert.current_count = item["current_count"]
                existing_alert.anomaly_score = max(existing_alert.anomaly_score, item["anomaly_score"])
                existing_alert.message = item["message"]
                updated_count += 1
            continue

        # Create new persisted Alert
        new_alert = Alert(
            area_id=area_id,
            alert_type=alert_type,
            severity=item["severity"].lower(),
            scam_type=scam_type,
            current_count=item["current_count"],
            baseline_count=item["baseline_count"],
            anomaly_score=item["anomaly_score"],
            message=item["message"],
            is_active=True,
            created_at=now,
        )
        db.add(new_alert)
        created_count += 1

    db.commit()

    return {
        "anomalies_detected": len(all_anomalies),
        "alerts_created": created_count,
        "alerts_updated": updated_count,
        "spikes": len(spikes),
        "new_types": len(new_types),
        "surges": len(surges),
    }


def get_persisted_alerts(
    db: Session,
    days: int = 7,
    severity: Optional[str] = None,
    city: Optional[str] = None,
    limit: int = 20,
) -> Dict[str, Any]:
    """Retrieve persisted alerts with sorting by severity and recency."""
    now = datetime.now(timezone.utc)
    cutoff = now - timedelta(days=days)

    stmt = (
        select(Alert)
        .join(Area, Area.id == Alert.area_id)
        .where(
            Alert.is_active == True,
            Alert.created_at >= cutoff,
        )
    )

    if severity:
        stmt = stmt.where(func.lower(Alert.severity) == severity.strip().lower())

    if city:
        stmt = stmt.where(func.lower(Area.city) == city.strip().lower())

    # Sort: Severity rank (critical > high > medium > low), then created_at desc
    severity_rank = case(
        (func.lower(Alert.severity) == "critical", 1),
        (func.lower(Alert.severity) == "high", 2),
        (func.lower(Alert.severity) == "medium", 3),
        (func.lower(Alert.severity) == "low", 4),
        else_=5,
    )
    stmt = stmt.order_by(severity_rank, Alert.created_at.desc()).limit(limit)

    alerts_records = db.execute(stmt).scalars().all()

    formatted_alerts = []
    critical_count = 0
    high_count = 0

    for a in alerts_records:
        sev_upper = a.severity.upper() if a.severity else "MEDIUM"
        if sev_upper == "CRITICAL":
            critical_count += 1
        elif sev_upper == "HIGH":
            high_count += 1

        area_name = a.area.name if a.area else "General Area"
        city_name = a.area.city if a.area else "India"

        # Determine title
        if a.alert_type == "spike" or a.alert_type == "SPIKE":
            title = f"Sudden Spike in {a.scam_type.replace('_', ' ').title() if a.scam_type else 'Scams'}"
        elif a.alert_type == "new_type" or a.alert_type == "NEW_SCAM_TYPE":
            title = f"New Scam Pattern: {a.scam_type.replace('_', ' ').title() if a.scam_type else 'Fraud'}"
        else:
            title = f"Scam Activity Alert in {area_name}"

        # Extract sample masked indicators for this alert if available
        sample_indicators = []
        if a.area_id:
            sample_stmt = (
                select(Identifier.normalized_value, Identifier.identifier_type)
                .join(ScamReport, ScamReport.identifier_id == Identifier.id)
                .where(
                    ScamReport.area_id == a.area_id,
                    ScamReport.status == "accepted",
                )
            )
            if a.scam_type:
                sample_stmt = sample_stmt.where(ScamReport.scam_type == a.scam_type)
            sample_rows = db.execute(sample_stmt.limit(3)).all()
            for norm_val, id_type in sample_rows:
                masked = mask_identifier(norm_val, id_type)
                if masked and masked not in sample_indicators:
                    sample_indicators.append(masked)

        formatted_alerts.append({
            "alert_id": a.id,
            "id": f"alt_{a.id}",
            "anomaly_type": a.alert_type.upper(),
            "severity": sev_upper,
            "anomaly_score": a.anomaly_score,
            "title": title,
            "explanation": a.message,
            "affected_area": area_name,
            "region": f"{area_name}, {city_name}",
            "incident_count_last_24h": a.current_count,
            "surge_percentage": f"+{int(a.anomaly_score * 4)}%",
            "advice": "Do not transfer money or share OTPs with unverified contacts.",
            "sample_indicators": sample_indicators,
            "detected_at": a.created_at.isoformat() if a.created_at else None,
            "created_at": a.created_at.isoformat() if a.created_at else None,
        })

    summary = {
        "total_alerts": len(formatted_alerts),
        "critical_alerts": critical_count,
        "high_alerts": high_count,
    }

    return {
        "success": True,
        "summary": summary,
        "alerts": formatted_alerts,
    }
