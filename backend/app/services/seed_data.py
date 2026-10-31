import hashlib
from datetime import datetime, timedelta, timezone
from typing import Dict, List
from sqlalchemy.orm import Session

from app.core.database import Base, SessionLocal, engine
from app.models.abuse_control import ReporterRateLimit
from app.models.alert import Alert
from app.models.area import Area
from app.models.identifier import Identifier
from app.models.licence import LicenceState
from app.models.scam_report import ScamReport


def seed_database(db: Session, reset: bool = True) -> Dict[str, int]:
    """Seed comprehensive hackathon demo data matching the UI/UX design specifications."""
    # Ensure all tables exist
    Base.metadata.create_all(bind=engine)

    if reset:
        # Clear existing rows in reverse dependency order
        db.query(Alert).delete()
        db.query(ScamReport).delete()
        db.query(ReporterRateLimit).delete()
        db.query(Identifier).delete()
        db.query(Area).delete()
        db.query(LicenceState).delete()
        db.commit()

    now = datetime.now(timezone.utc)

    # -------------------------------------------------------------------------
    # 1. Licence State
    # -------------------------------------------------------------------------
    licence = LicenceState(
        license_key_hash="sentry_live_test_key_hackathon_2026",
        status="active",
        issued_at=now - timedelta(days=5),
        expires_at=now + timedelta(days=90),
    )
    db.add(licence)
    db.commit()

    # -------------------------------------------------------------------------
    # 2. Areas (Bengaluru zones matching UI/UX map + Metro hubs)
    # -------------------------------------------------------------------------
    areas_data = [
        {"name": "HSR Layout", "city": "Bengaluru", "state": "Karnataka", "pincode": "560102", "latitude": 12.9121, "longitude": 77.6446},
        {"name": "Koramangala", "city": "Bengaluru", "state": "Karnataka", "pincode": "560034", "latitude": 12.9352, "longitude": 77.6245},
        {"name": "Marathahalli", "city": "Bengaluru", "state": "Karnataka", "pincode": "560037", "latitude": 12.9591, "longitude": 77.6974},
        {"name": "Whitefield", "city": "Bengaluru", "state": "Karnataka", "pincode": "560066", "latitude": 12.9698, "longitude": 77.7500},
        {"name": "BTM Layout", "city": "Bengaluru", "state": "Karnataka", "pincode": "560076", "latitude": 12.9166, "longitude": 77.6101},
        {"name": "Indiranagar", "city": "Bengaluru", "state": "Karnataka", "pincode": "560038", "latitude": 12.9784, "longitude": 77.6408},
        {"name": "Electronic City", "city": "Bengaluru", "state": "Karnataka", "pincode": "560100", "latitude": 12.8452, "longitude": 77.6602},
        {"name": "Hebbal", "city": "Bengaluru", "state": "Karnataka", "pincode": "560024", "latitude": 13.0358, "longitude": 77.5970},
        {"name": "Jayanagar", "city": "Bengaluru", "state": "Karnataka", "pincode": "560041", "latitude": 12.9308, "longitude": 77.5838},
        {"name": "Banashankari", "city": "Bengaluru", "state": "Karnataka", "pincode": "560085", "latitude": 12.9255, "longitude": 77.5468},
        {"name": "Rajajinagar", "city": "Bengaluru", "state": "Karnataka", "pincode": "560010", "latitude": 12.9982, "longitude": 77.5530},
        {"name": "Malleswaram", "city": "Bengaluru", "state": "Karnataka", "pincode": "560003", "latitude": 13.0031, "longitude": 77.5643},
        {"name": "Yeshwanthpur", "city": "Bengaluru", "state": "Karnataka", "pincode": "560022", "latitude": 13.0238, "longitude": 77.5529},
        {"name": "Andheri East", "city": "Mumbai", "state": "Maharashtra", "pincode": "400069", "latitude": 19.1136, "longitude": 72.8697},
        {"name": "Noida Sector 62", "city": "Noida", "state": "Uttar Pradesh", "pincode": "201309", "latitude": 28.6280, "longitude": 77.3649},
        {"name": "Connaught Place", "city": "New Delhi", "state": "Delhi", "pincode": "110001", "latitude": 28.6315, "longitude": 77.2167},
    ]

    area_map: Dict[str, Area] = {}
    for a in areas_data:
        record = Area(**a)
        db.add(record)
        area_map[a["name"]] = record
    db.commit()

    # -------------------------------------------------------------------------
    # 3. Identifiers
    # -------------------------------------------------------------------------
    identifiers_data = [
        # UI/UX Hero Showcase: Known Scam Phone (+91 98765 43210)
        {"identifier_type": "phone", "raw_value": "+91 98765 43210", "normalized_value": "+919876543210"},
        # UI/UX Showcase: Suspicious Phone (+91 91234 56789)
        {"identifier_type": "phone", "raw_value": "+91 91234 56789", "normalized_value": "+919123456789"},
        # Additional Known Scam Phone
        {"identifier_type": "phone", "raw_value": "98765 00001", "normalized_value": "+919876500001"},
        # UI/UX Showcase: Known Scam URL (sbi-kyc-update.in/login)
        {"identifier_type": "url", "raw_value": "sbi-kyc-update.in/login", "normalized_value": "https://sbi-kyc-update.in/login"},
        # Additional Phishing URL
        {"identifier_type": "url", "raw_value": "free-recharge-offer.online", "normalized_value": "https://free-recharge-offer.online"},
        # Known Scam UPI
        {"identifier_type": "upi", "raw_value": "fraud.merchant@okaxis", "normalized_value": "fraud.merchant@okaxis"},
        # Spike UPI in HSR
        {"identifier_type": "upi", "raw_value": "billpay@fakeupi", "normalized_value": "billpay@fakeupi"},
        # Suspicious UPI
        {"identifier_type": "upi", "raw_value": "refund.support@paytm", "normalized_value": "refund.support@paytm"},
        # Verified Business Phone
        {"identifier_type": "phone", "raw_value": "1800 123 4567", "normalized_value": "18001234567"},
    ]

    ident_map: Dict[str, Identifier] = {}
    for item in identifiers_data:
        ident = Identifier(**item)
        db.add(ident)
        ident_map[item["normalized_value"]] = ident
    db.commit()

    # -------------------------------------------------------------------------
    # 4. Scam Reports
    # -------------------------------------------------------------------------
    reports_to_add: List[ScamReport] = []

    # A. Hero Phone: +919876543210 (127 reports across 21 areas, mostly digital arrest, fake kyc, loan app)
    hero_ident = ident_map["+919876543210"]
    categories_hero = ["digital_arrest"] * 61 + ["fake_kyc"] * 38 + ["loan_scam"] * 28
    areas_list = list(area_map.values())

    for idx, cat in enumerate(categories_hero):
        # Distribute over last 90 days, with 18 reports today/yesterday
        if idx < 18:
            days_ago = 0.5 * (idx / 18.0)
        else:
            days_ago = 1 + (idx * 0.7)

        created_ts = now - timedelta(days=days_ago, minutes=idx * 7)
        area = areas_list[idx % len(areas_list)]
        fp_hash = hashlib.sha256(f"hero_reporter_{idx}".encode()).hexdigest()

        descriptions = {
            "digital_arrest": "Pretended to be CBI/Police on video call demanding bail deposit.",
            "fake_kyc": "Sent fake SMS claiming bank account suspended until KYC update.",
            "loan_scam": "Threatening loan recovery messages for unrequested loan.",
        }

        reports_to_add.append(
            ScamReport(
                identifier_id=hero_ident.id,
                area_id=area.id,
                scam_type=cat,
                description=descriptions.get(cat, "Suspicious scam call"),
                status="accepted",
                trust_score=75 + (idx % 15),
                reporter_fingerprint_hash=fp_hash,
                source_ip_hash=hashlib.sha256(f"ip_{idx}".encode()).hexdigest(),
                created_at=created_ts,
            )
        )

    # B. Suspicious Phone: +919123456789 (2 reports -> SUSPICIOUS verdict)
    susp_ident = ident_map["+919123456789"]
    for idx in range(2):
        created_ts = now - timedelta(days=2 + idx * 2, hours=idx * 3)
        area = areas_list[idx % 2]
        cat = "upi_fraud" if idx % 2 == 0 else "fake_customer_care"
        reports_to_add.append(
            ScamReport(
                identifier_id=susp_ident.id,
                area_id=area.id,
                scam_type=cat,
                description="Unusual calls asking for card details and verification codes.",
                status="accepted",
                trust_score=50 + (idx * 15),
                reporter_fingerprint_hash=hashlib.sha256(f"susp_reporter_{idx}".encode()).hexdigest(),
                created_at=created_ts,
            )
        )

    # C. Phishing URL: https://sbi-kyc-update.in/login (43 reports)
    url_ident = ident_map["https://sbi-kyc-update.in/login"]
    for idx in range(43):
        created_ts = now - timedelta(days=0.1 * idx, hours=idx)
        area = areas_list[idx % len(areas_list)]
        reports_to_add.append(
            ScamReport(
                identifier_id=url_ident.id,
                area_id=area.id,
                scam_type="phishing" if idx % 2 == 0 else "fake_kyc",
                description="Phishing page mimicking bank portal asking for netbanking password and OTP.",
                status="accepted",
                trust_score=80 + (idx % 10),
                reporter_fingerprint_hash=hashlib.sha256(f"url_reporter_{idx}".encode()).hexdigest(),
                created_at=created_ts,
            )
        )

    # D. Electricity Bill Spike UPI: billpay@fakeupi in HSR Layout (18 reports in last 24h)
    spike_ident = ident_map["billpay@fakeupi"]
    hsr_area = area_map["HSR Layout"]
    for idx in range(18):
        created_ts = now - timedelta(hours=1 + idx)
        reports_to_add.append(
            ScamReport(
                identifier_id=spike_ident.id,
                area_id=hsr_area.id,
                scam_type="electricity_bill",
                description="SMS threatening power cut tonight unless bill is immediately paid to this UPI ID.",
                status="accepted",
                trust_score=85,
                reporter_fingerprint_hash=hashlib.sha256(f"hsr_reporter_{idx}".encode()).hexdigest(),
                created_at=created_ts,
            )
        )

    # D2. Under Review UPI: fraud.merchant@okaxis (1 single community report -> UNDER_REVIEW)
    under_review_ident = ident_map["fraud.merchant@okaxis"]
    reports_to_add.append(
        ScamReport(
            identifier_id=under_review_ident.id,
            area_id=area_map["Koramangala"].id,
            scam_type="fake_job",
            description="Initial report: Offered high-paying data entry job requiring initial deposit.",
            status="accepted",
            trust_score=60,
            reporter_fingerprint_hash=hashlib.sha256("single_reporter_under_review".encode()).hexdigest(),
            created_at=now - timedelta(days=1),
        )
    )

    # E. Area distribution matching UI/UX Map mockups for last 7 days
    # Target 7-day counts:
    # HSR Layout: 42, Koramangala: 28, Marathahalli: 21, Whitefield: 18,
    # BTM: 15, Indiranagar: 12, Electronic City: 9, Hebbal: 7, Jayanagar: 6,
    # Banashankari: 5, Rajajinagar: 4, Malleswaram: 2, Yeshwanthpur: 2
    map_targets = {
        "HSR Layout": 42,
        "Koramangala": 28,
        "Marathahalli": 21,
        "Whitefield": 18,
        "BTM Layout": 15,
        "Indiranagar": 12,
        "Electronic City": 9,
        "Hebbal": 7,
        "Jayanagar": 6,
        "Banashankari": 5,
        "Rajajinagar": 4,
        "Malleswaram": 2,
        "Yeshwanthpur": 2,
    }

    # Count how many reports already exist in each area from previous inserts
    area_report_counts = {name: 0 for name in map_targets}
    for r in reports_to_add:
        # Check if created within last 7 days
        if r.created_at and (now - r.created_at).total_seconds() <= 7 * 86400:
            for name, a in area_map.items():
                if r.area_id == a.id and name in area_report_counts:
                    area_report_counts[name] += 1

    # Top-up remaining reports to match target counts
    extra_phone = ident_map["+919876500001"]
    for name, target in map_targets.items():
        needed = target - area_report_counts[name]
        if needed > 0:
            area_obj = area_map[name]
            for j in range(needed):
                created_ts = now - timedelta(days=1 + (j % 5), hours=j * 2)
                reports_to_add.append(
                    ScamReport(
                        identifier_id=extra_phone.id,
                        area_id=area_obj.id,
                        scam_type="fake_job" if j % 2 == 0 else "upi_fraud",
                        description=f"Community reported scam incident in {name}",
                        status="accepted",
                        trust_score=70,
                        reporter_fingerprint_hash=hashlib.sha256(f"{name}_rep_{j}".encode()).hexdigest(),
                        created_at=created_ts,
                    )
                )

    db.add_all(reports_to_add)
    db.commit()

    # -------------------------------------------------------------------------
    # 5. Alerts (Matching UI/UX Page 11 Alert Feed)
    # -------------------------------------------------------------------------
    alerts_data = [
        Alert(
            area_id=area_map["HSR Layout"].id,
            alert_type="spike",
            severity="high",
            scam_type="digital_arrest",
            current_count=18,
            baseline_count=4.0,
            anomaly_score=4.5,
            message="18 reports in 24 hours, about 4.5× the usual 4 a day. Mostly digital arrest.",
            is_active=True,
            created_at=now - timedelta(hours=3),
        ),
        Alert(
            area_id=area_map["Whitefield"].id,
            alert_type="new_type",
            severity="medium",
            scam_type="fake_job",
            current_count=6,
            baseline_count=0.0,
            anomaly_score=3.0,
            message="Fake job offer over WhatsApp: 6 reports in 48 hours. First time seen in this area.",
            is_active=True,
            created_at=now - timedelta(hours=5),
        ),
        Alert(
            area_id=area_map["Koramangala"].id,
            alert_type="spike",
            severity="medium",
            scam_type="upi_fraud",
            current_count=11,
            baseline_count=4.4,
            anomaly_score=2.5,
            message="11 reports in 24 hours, about 2.5× the usual. Mostly UPI refund fraud.",
            is_active=True,
            created_at=now - timedelta(days=1),
        ),
        Alert(
            area_id=area_map["Indiranagar"].id,
            alert_type="new_type",
            severity="medium",
            scam_type="other",
            current_count=4,
            baseline_count=0.0,
            anomaly_score=2.0,
            message="QR code parking scam: 4 reports in 72 hours.",
            is_active=True,
            created_at=now - timedelta(days=2),
        ),
        Alert(
            area_id=area_map["Marathahalli"].id,
            alert_type="spike",
            severity="medium",
            scam_type="fake_kyc",
            current_count=9,
            baseline_count=3.0,
            anomaly_score=3.0,
            message="9 reports in 24 hours, about 3× the usual. Mostly fake KYC.",
            is_active=True,
            created_at=now - timedelta(days=2),
        ),
    ]

    db.add_all(alerts_data)
    db.commit()

    return {
        "areas": len(areas_data),
        "identifiers": len(identifiers_data),
        "reports": len(reports_to_add),
        "alerts": len(alerts_data),
    }


def seed_if_empty(db: Session) -> Dict[str, int]:
    """Seed demo data only if the database is empty (idempotent startup seeding).

    Safe to call on every server startup:
    - If areas table already has rows → skip seeding, return empty dict.
    - If areas table is empty (fresh install) → run full seed.

    This prevents duplicate demo data accumulating on every server restart,
    while ensuring a brand-new clone gets working data automatically.
    """
    existing_areas = db.query(Area).count()
    if existing_areas > 0:
        return {}  # Data already present — do not reseed
    return seed_database(db, reset=False)


if __name__ == "__main__":
    """Convenience: run directly to reset and reseed the demo database.

    Usage:
        cd backend
        source .venv/bin/activate
        python -m app.services.seed_data
    """
    session = SessionLocal()
    try:
        counts = seed_database(session, reset=True)
        print("Demo database seeded successfully!")
        for k, v in counts.items():
            print(f"  {k.capitalize()}: {v}")
    finally:
        session.close()
