from collections import Counter
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.area import Area
from app.models.scam_report import ScamReport


def classify_area_risk(count: int) -> str:
    """Classify area scam risk level based on report count.

    RISK LEVEL THRESHOLDS:
    ----------------------
    - CRITICAL : >= 35 reports (Severe surge / emergency zone)
    - HIGH     : 20 – 34 reports (Active hotspot, frequent syndicates)
    - MEDIUM   : 5 – 19 reports  (Moderate activity)
    - LOW      : 1 – 4 reports   (Occasional/sporadic incidents)
    - NONE     : 0 reports       (No accepted reports in timeframe)
    """
    if count >= 35:
        return "CRITICAL"
    elif count >= 20:
        return "HIGH"
    elif count >= 5:
        return "MEDIUM"
    elif count >= 1:
        return "LOW"
    return "NONE"


def get_map_activity(
    db: Session,
    days: int = 7,
    city: Optional[str] = None,
    state: Optional[str] = None,
    category: Optional[str] = None,
) -> Dict[str, Any]:
    """Retrieve privacy-preserving aggregated scam report statistics grouped by Area.

    Ensures only 'accepted' reports contribute to public statistics.
    Filters out 'rejected', 'duplicate', and 'rate_limited' reports.
    """
    now = datetime.now(timezone.utc)
    cutoff = now - timedelta(days=days)

    # Base query for accepted reports within timeframe
    base_filter = [
        ScamReport.status == "accepted",
        ScamReport.created_at >= cutoff,
        ScamReport.area_id.isnot(None),
    ]

    if category:
        base_filter.append(ScamReport.scam_type == category.strip().lower())

    # 1. Group and count reports by Area at the database level
    stmt = (
        select(
            Area.id.label("area_id"),
            Area.name.label("name"),
            Area.city.label("city"),
            Area.state.label("state"),
            Area.pincode.label("pincode"),
            Area.latitude.label("latitude"),
            Area.longitude.label("longitude"),
            func.count(ScamReport.id).label("report_count"),
        )
        .join(ScamReport, ScamReport.area_id == Area.id)
        .where(*base_filter)
    )

    if city:
        stmt = stmt.where(func.lower(Area.city) == city.strip().lower())
    if state:
        stmt = stmt.where(func.lower(Area.state) == state.strip().lower())

    stmt = stmt.group_by(
        Area.id,
        Area.name,
        Area.city,
        Area.state,
        Area.pincode,
        Area.latitude,
        Area.longitude,
    ).order_by(func.count(ScamReport.id).desc())

    grouped_results = db.execute(stmt).all()

    # 2. Extract dominant scam categories per active area
    area_ids = [row.area_id for row in grouped_results]
    dominant_categories: Dict[int, str] = {}

    if area_ids:
        cat_stmt = (
            select(
                ScamReport.area_id,
                ScamReport.scam_type,
                func.count(ScamReport.id).label("cat_count"),
            )
            .where(*base_filter, ScamReport.area_id.in_(area_ids))
            .group_by(ScamReport.area_id, ScamReport.scam_type)
            .order_by(ScamReport.area_id, func.count(ScamReport.id).desc())
        )
        cat_results = db.execute(cat_stmt).all()
        for area_id, scam_type, _ in cat_results:
            if area_id not in dominant_categories:
                dominant_categories[area_id] = scam_type

    # 3. Format area items
    areas_list = []
    hotspots_list = []
    total_reports = 0

    for row in grouped_results:
        count = int(row.report_count)
        total_reports += count
        risk = classify_area_risk(count)
        dominant_cat = dominant_categories.get(row.area_id, "other")

        area_dict = {
            "area_id": row.area_id,
            "name": row.name,
            "city": row.city,
            "state": row.state,
            "pincode": row.pincode,
            "latitude": row.latitude,
            "longitude": row.longitude,
            "report_count": count,
            "risk_level": risk,
            "dominant_category": dominant_cat,
        }
        areas_list.append(area_dict)

        # Hotspots format matching shared/API_CONTRACT.md
        hotspots_list.append({
            "area": row.name,
            "city": row.city,
            "state": row.state,
            "pincode": row.pincode,
            "latitude": row.latitude,
            "longitude": row.longitude,
            "report_count": count,
            "dominant_category": dominant_cat,
            "severity": risk.lower(),
        })

    highest_activity = areas_list[0]["name"] if areas_list else None

    summary = {
        "total_reports": total_reports,
        "total_active_areas": len(areas_list),
        "highest_activity_area": highest_activity,
        "requested_days": days,
    }

    return {
        "success": True,
        "timeframe_days": days,
        "total_incidents": total_reports,
        "summary": summary,
        "areas": areas_list,
        "hotspots": hotspots_list,
        "data": {
            "days": days,
            "summary": summary,
            "areas": areas_list,
        },
    }
