import unittest
from datetime import datetime, timedelta, timezone
from fastapi import HTTPException
from fastapi.requests import Request
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.database import Base
from app.models.area import Area
from app.models.identifier import Identifier
from app.models.scam_report import ScamReport
from app.routes.map import get_scam_map
from app.services.map_service import classify_area_risk, get_map_activity


class DummyRequest:
    def __init__(self, query_params=None):
        self.query_params = query_params or {}


class TestMapAPI(unittest.TestCase):
    """Test suite for Scam Activity Map API, SQL aggregation, and risk thresholds."""

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
        self.db.query(ScamReport).delete()
        self.db.query(Identifier).delete()
        self.db.query(Area).delete()
        self.db.commit()

    def tearDown(self):
        self.db.close()

    def test_risk_thresholds(self):
        self.assertEqual(classify_area_risk(45), "CRITICAL")
        self.assertEqual(classify_area_risk(35), "CRITICAL")
        self.assertEqual(classify_area_risk(34), "HIGH")
        self.assertEqual(classify_area_risk(20), "HIGH")
        self.assertEqual(classify_area_risk(19), "MEDIUM")
        self.assertEqual(classify_area_risk(5), "MEDIUM")
        self.assertEqual(classify_area_risk(4), "LOW")
        self.assertEqual(classify_area_risk(1), "LOW")
        self.assertEqual(classify_area_risk(0), "NONE")

    def test_map_empty_database_returns_success(self):
        req = DummyRequest()
        res = get_scam_map(req, self.db, days="7")
        self.assertTrue(res["success"])
        self.assertEqual(res["summary"]["total_reports"], 0)
        self.assertEqual(res["summary"]["total_active_areas"], 0)
        self.assertIsNone(res["summary"]["highest_activity_area"])
        self.assertEqual(res["areas"], [])

    def test_map_aggregation_and_sorting(self):
        now = datetime.now(timezone.utc)

        # Create 2 areas
        area_hsr = Area(name="HSR Layout", city="Bengaluru", state="Karnataka", pincode="560102", latitude=12.9121, longitude=77.6446)
        area_kora = Area(name="Koramangala", city="Bengaluru", state="Karnataka", pincode="560034", latitude=12.9352, longitude=77.6245)
        self.db.add_all([area_hsr, area_kora])
        self.db.commit()

        ident = Identifier(identifier_type="phone", raw_value="+919876543210", normalized_value="+919876543210")
        self.db.add(ident)
        self.db.commit()

        # Add 40 accepted reports in HSR Layout
        for i in range(40):
            self.db.add(ScamReport(
                identifier_id=ident.id,
                area_id=area_hsr.id,
                scam_type="digital_arrest",
                status="accepted",
                created_at=now - timedelta(days=1),
            ))

        # Add 10 accepted reports in Koramangala
        for i in range(10):
            self.db.add(ScamReport(
                identifier_id=ident.id,
                area_id=area_kora.id,
                scam_type="upi_fraud",
                status="accepted",
                created_at=now - timedelta(days=2),
            ))

        # Add 5 rejected reports in Koramangala (Must NOT be counted!)
        for i in range(5):
            self.db.add(ScamReport(
                identifier_id=ident.id,
                area_id=area_kora.id,
                scam_type="upi_fraud",
                status="rejected",
                created_at=now - timedelta(days=1),
            ))

        # Add 1 report 15 days ago (Should be excluded for days=7)
        self.db.add(ScamReport(
            identifier_id=ident.id,
            area_id=area_hsr.id,
            scam_type="digital_arrest",
            status="accepted",
            created_at=now - timedelta(days=15),
        ))
        self.db.commit()

        req = DummyRequest()
        res = get_scam_map(req, self.db, days="7")

        self.assertTrue(res["success"])
        self.assertEqual(res["summary"]["total_reports"], 50)  # 40 + 10 (excluding rejected & old)
        self.assertEqual(res["summary"]["total_active_areas"], 2)
        self.assertEqual(res["summary"]["highest_activity_area"], "HSR Layout")

        # Sorted by report_count descending: HSR (40) first, Koramangala (10) second
        areas = res["areas"]
        self.assertEqual(len(areas), 2)
        self.assertEqual(areas[0]["name"], "HSR Layout")
        self.assertEqual(areas[0]["report_count"], 40)
        self.assertEqual(areas[0]["risk_level"], "CRITICAL")
        self.assertEqual(areas[0]["latitude"], 12.9121)
        self.assertEqual(areas[0]["longitude"], 77.6446)
        self.assertEqual(areas[0]["dominant_category"], "digital_arrest")

        self.assertEqual(areas[1]["name"], "Koramangala")
        self.assertEqual(areas[1]["report_count"], 10)
        self.assertEqual(areas[1]["risk_level"], "MEDIUM")
        self.assertEqual(areas[1]["dominant_category"], "upi_fraud")

        # Test days=30 includes the 15-day-old report in HSR Layout
        res_30 = get_scam_map(req, self.db, days="30")
        self.assertEqual(res_30["summary"]["total_reports"], 51)
        self.assertEqual(res_30["areas"][0]["report_count"], 41)

    def test_invalid_days_parameters_return_400(self):
        req = DummyRequest()
        invalid_days = ["0", "-1", "abc", "100", "999", ""]
        for d in invalid_days:
            with self.subTest(days=d):
                with self.assertRaises(HTTPException) as ctx:
                    get_scam_map(req, self.db, days=d)
                self.assertEqual(ctx.exception.status_code, 400)


if __name__ == "__main__":
    unittest.main()
