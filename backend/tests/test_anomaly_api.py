import unittest
from datetime import datetime, timedelta, timezone
from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.database import Base
from app.models.alert import Alert
from app.models.area import Area
from app.models.identifier import Identifier
from app.models.scam_report import ScamReport
from app.routes.alerts import get_alerts, trigger_anomaly_detection
from app.services.anomaly_service import (
    detect_geographic_spikes,
    detect_identifier_surges,
    detect_new_scam_types,
    mask_identifier,
    run_anomaly_detection,
)


class DummyRequest:
    def __init__(self, query_params=None):
        self.query_params = query_params or {}


class TestAnomalyAPI(unittest.TestCase):
    """Test suite for anomaly detection, alert deduplication, and GET /api/alerts."""

    @classmethod
    def setUpClass(cls):
        cls.engine = create_engine(
            "sqlite:///:memory:",
            connect_args={"check_same_thread": False},
        )
        cls.TestingSessionLocal = sessionmaker(
            autocommit=False,
            autoflush=False,
            bind=cls.engine,
        )
        Base.metadata.create_all(bind=cls.engine)

    def setUp(self):
        self.db = self.TestingSessionLocal()
        self.db.query(Alert).delete()
        self.db.query(ScamReport).delete()
        self.db.query(Identifier).delete()
        self.db.query(Area).delete()
        self.db.commit()

    def tearDown(self):
        self.db.close()

    # -------------------------------------------------------------------------
    # 1. Identifier Masking
    # -------------------------------------------------------------------------
    def test_identifier_masking(self):
        self.assertEqual(mask_identifier("+919876543210", "phone"), "+91987*****10")
        self.assertEqual(mask_identifier("fraudster@okaxis", "upi"), "f*******r@okaxis")
        self.assertEqual(mask_identifier("https://sbi-kyc-fake.in/login", "url"), "sbi-kyc-fake.in")

    # -------------------------------------------------------------------------
    # 2. Geographic Spike Detection
    # -------------------------------------------------------------------------
    def test_geographic_spike_detection(self):
        now = datetime.now(timezone.utc)
        area = Area(name="HSR Layout", city="Bengaluru", state="Karnataka")
        self.db.add(area)
        self.db.commit()

        ident = Identifier(identifier_type="phone", raw_value="+919876543210", normalized_value="+919876543210")
        self.db.add(ident)
        self.db.commit()

        # 14 reports in baseline (previous 7 days) -> ~2.0 reports/day
        for i in range(14):
            self.db.add(ScamReport(
                identifier_id=ident.id,
                area_id=area.id,
                scam_type="digital_arrest",
                status="accepted",
                created_at=now - timedelta(days=2 + (i % 5)),
            ))

        # 18 reports in last 24 hours (Significantly exceeds 2/day baseline)
        for i in range(18):
            self.db.add(ScamReport(
                identifier_id=ident.id,
                area_id=area.id,
                scam_type="digital_arrest",
                status="accepted",
                created_at=now - timedelta(hours=i % 20),
            ))
        self.db.commit()

        spikes = detect_geographic_spikes(self.db)
        self.assertEqual(len(spikes), 1)
        self.assertEqual(spikes[0]["anomaly_type"], "SPIKE")
        self.assertEqual(spikes[0]["area_name"], "HSR Layout")
        self.assertEqual(spikes[0]["current_count"], 18)
        self.assertIn("reports in 24 hours", spikes[0]["message"])
        self.assertEqual(spikes[0]["severity"], "CRITICAL")

    # -------------------------------------------------------------------------
    # 3. New Scam Category Detection
    # -------------------------------------------------------------------------
    def test_new_scam_category_detection(self):
        now = datetime.now(timezone.utc)
        area = Area(name="Whitefield", city="Bengaluru", state="Karnataka")
        self.db.add(area)
        self.db.commit()

        ident = Identifier(identifier_type="phone", raw_value="+919876543210", normalized_value="+919876543210")
        self.db.add(ident)
        self.db.commit()

        # 6 reports of 'fake_job' in the last 7 days, 0 in historical baseline
        for i in range(6):
            self.db.add(ScamReport(
                identifier_id=ident.id,
                area_id=area.id,
                scam_type="fake_job",
                status="accepted",
                created_at=now - timedelta(days=i % 4),
            ))
        self.db.commit()

        new_types = detect_new_scam_types(self.db)
        self.assertEqual(len(new_types), 1)
        self.assertEqual(new_types[0]["anomaly_type"], "NEW_SCAM_TYPE")
        self.assertEqual(new_types[0]["scam_type"], "fake_job")
        self.assertEqual(new_types[0]["current_count"], 6)

    # -------------------------------------------------------------------------
    # 4. Identifier Surge Detection
    # -------------------------------------------------------------------------
    def test_identifier_surge_detection(self):
        now = datetime.now(timezone.utc)
        area = Area(name="Indiranagar", city="Bengaluru", state="Karnataka")
        self.db.add(area)
        self.db.commit()

        ident = Identifier(identifier_type="upi", raw_value="scammer@okaxis", normalized_value="scammer@okaxis")
        self.db.add(ident)
        self.db.commit()

        # 8 reports in last 48 hours targeting this identifier
        for i in range(8):
            self.db.add(ScamReport(
                identifier_id=ident.id,
                area_id=area.id,
                scam_type="upi_fraud",
                status="accepted",
                created_at=now - timedelta(hours=i * 4),
            ))
        self.db.commit()

        surges = detect_identifier_surges(self.db)
        self.assertEqual(len(surges), 1)
        self.assertEqual(surges[0]["anomaly_type"], "IDENTIFIER_SURGE")
        self.assertEqual(surges[0]["current_count"], 8)

    # -------------------------------------------------------------------------
    # 5. Alert Deduplication on Repeated Runs
    # -------------------------------------------------------------------------
    def test_alert_deduplication(self):
        now = datetime.now(timezone.utc)
        area = Area(name="HSR Layout", city="Bengaluru", state="Karnataka")
        self.db.add(area)
        self.db.commit()

        ident = Identifier(identifier_type="phone", raw_value="+919876543210", normalized_value="+919876543210")
        self.db.add(ident)
        self.db.commit()

        # Seed reports to trigger a spike
        for i in range(12):
            self.db.add(ScamReport(
                identifier_id=ident.id,
                area_id=area.id,
                scam_type="digital_arrest",
                status="accepted",
                created_at=now - timedelta(hours=i),
            ))
        self.db.commit()

        # 1st detection run -> creates 1 spike and 1 surge alert
        res1 = run_anomaly_detection(self.db)
        initial_alerts_count = self.db.query(Alert).count()
        self.assertTrue(initial_alerts_count > 0)
        self.assertEqual(res1["alerts_created"], initial_alerts_count)

        # 2nd detection run immediately -> must NOT create duplicate alerts!
        res2 = run_anomaly_detection(self.db)
        self.assertEqual(res2["alerts_created"], 0)
        final_alerts_count = self.db.query(Alert).count()
        self.assertEqual(initial_alerts_count, final_alerts_count)

    # -------------------------------------------------------------------------
    # 6. GET /api/alerts & Sorting
    # -------------------------------------------------------------------------
    def test_get_alerts_endpoint_and_sorting(self):
        area = Area(name="Bengaluru Central", city="Bengaluru", state="Karnataka")
        self.db.add(area)
        self.db.commit()

        now = datetime.now(timezone.utc)
        # Create medium alert older
        self.db.add(Alert(
            area_id=area.id,
            alert_type="SPIKE",
            severity="medium",
            scam_type="fake_kyc",
            current_count=5,
            baseline_count=2.0,
            anomaly_score=50.0,
            message="Medium alert",
            is_active=True,
            created_at=now - timedelta(days=2),
        ))
        # Create critical alert
        self.db.add(Alert(
            area_id=area.id,
            alert_type="SPIKE",
            severity="critical",
            scam_type="digital_arrest",
            current_count=20,
            baseline_count=3.0,
            anomaly_score=95.0,
            message="Critical alert",
            is_active=True,
            created_at=now - timedelta(days=1),
        ))
        self.db.commit()

        req = DummyRequest()
        res = get_alerts(req, self.db, days="7")

        self.assertTrue(res["success"])
        self.assertEqual(res["summary"]["total_alerts"], 2)
        self.assertEqual(res["summary"]["critical_alerts"], 1)

        # Critical alert must be sorted FIRST
        alerts = res["alerts"]
        self.assertEqual(alerts[0]["severity"], "CRITICAL")
        self.assertEqual(alerts[1]["severity"], "MEDIUM")

    # -------------------------------------------------------------------------
    # 7. Invalid Query Parameters Return 400
    # -------------------------------------------------------------------------
    def test_invalid_parameters_return_400(self):
        req = DummyRequest()
        for d in ["0", "-1", "abc", "100"]:
            with self.subTest(days=d):
                with self.assertRaises(HTTPException) as ctx:
                    get_alerts(req, self.db, days=d)
                self.assertEqual(ctx.exception.status_code, 400)

        for lim in ["0", "-5", "abc", "150"]:
            with self.subTest(limit=lim):
                with self.assertRaises(HTTPException) as ctx:
                    get_alerts(req, self.db, limit=lim)
                self.assertEqual(ctx.exception.status_code, 400)

    # -------------------------------------------------------------------------
    # 8. Empty Database Behavior
    # -------------------------------------------------------------------------
    def test_empty_database_returns_clean_response(self):
        req = DummyRequest()
        res = get_alerts(req, self.db, days="7")
        self.assertTrue(res["success"])
        self.assertEqual(res["summary"]["total_alerts"], 0)
        self.assertEqual(res["summary"]["critical_alerts"], 0)
        self.assertEqual(res["alerts"], [])


if __name__ == "__main__":
    unittest.main()
