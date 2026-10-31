import unittest
from datetime import datetime, timezone
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi import HTTPException

from app.core.database import Base
from app.models.area import Area
from app.models.identifier import Identifier
from app.models.scam_report import ScamReport
from app.routes.lookup import (
    LookupRequest,
    execute_lookup,
    lookup_get,
    lookup_post,
)


class TestLookupAPI(unittest.TestCase):
    """Test suite for lookup API, database retrieval, and risk verdict calculation."""

    @classmethod
    def setUpClass(cls):
        # Create an isolated in-memory SQLite database
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
        # Clean data before each test
        self.db.query(ScamReport).delete()
        self.db.query(Identifier).delete()
        self.db.query(Area).delete()
        self.db.commit()

    def tearDown(self):
        self.db.close()

    # -------------------------------------------------------------------------
    # 1. Unknown Identifier -> NO_REPORTS
    # -------------------------------------------------------------------------
    def test_unknown_identifier_returns_no_reports(self):
        res = execute_lookup("9876543210", None, self.db)
        self.assertTrue(res.success)
        self.assertEqual(res.verdict, "NO_REPORTS")
        self.assertEqual(res.risk_level, "safe")
        self.assertEqual(res.risk_score, 0)
        self.assertEqual(res.report_count, 0)
        self.assertEqual(res.target_type, "phone")
        self.assertEqual(res.normalized_value, "+919876543210")
        self.assertEqual(res.recent_reports, [])
        self.assertIn("No community reports", res.message)

    # -------------------------------------------------------------------------
    # 2. Single Accepted Report -> Low/Moderate Risk (SUSPICIOUS)
    # -------------------------------------------------------------------------
    def test_single_accepted_report_returns_suspicious(self):
        area = Area(name="Indiranagar", city="Bengaluru", state="Karnataka")
        self.db.add(area)
        self.db.commit()

        ident = Identifier(
            identifier_type="phone",
            raw_value="+91 9876543210",
            normalized_value="+919876543210",
        )
        self.db.add(ident)
        self.db.commit()

        report = ScamReport(
            identifier_id=ident.id,
            area_id=area.id,
            scam_type="fake_job",
            description="Telegram task scam",
            status="accepted",
            trust_score=50,
        )
        self.db.add(report)
        self.db.commit()

        res = execute_lookup("9876543210", None, self.db)
        self.assertTrue(res.success)
        self.assertEqual(res.verdict, "SUSPICIOUS")
        self.assertEqual(res.risk_level, "suspicious")
        self.assertEqual(res.report_count, 1)
        self.assertTrue(20 <= res.risk_score <= 59)
        self.assertEqual(res.top_category, "fake_job")
        self.assertEqual(len(res.recent_reports), 1)
        self.assertEqual(res.recent_reports[0].city, "Bengaluru")

    # -------------------------------------------------------------------------
    # 3. Multiple Accepted Reports -> High Risk (KNOWN_SCAM)
    # -------------------------------------------------------------------------
    def test_multiple_accepted_reports_returns_known_scam(self):
        area1 = Area(name="Noida Sector 62", city="Noida", state="UP")
        area2 = Area(name="Andheri East", city="Mumbai", state="Maharashtra")
        self.db.add_all([area1, area2])
        self.db.commit()

        ident = Identifier(
            identifier_type="upi",
            raw_value="fraudster@okaxis",
            normalized_value="fraudster@okaxis",
        )
        self.db.add(ident)
        self.db.commit()

        # Add 4 accepted reports
        for i in range(4):
            rep = ScamReport(
                identifier_id=ident.id,
                area_id=area1.id if i % 2 == 0 else area2.id,
                scam_type="electricity_bill",
                description=f"Demanded payment immediately {i}",
                status="accepted",
                trust_score=80,
            )
            self.db.add(rep)
        self.db.commit()

        res = execute_lookup("fraudster@okaxis", None, self.db)
        self.assertTrue(res.success)
        self.assertEqual(res.verdict, "KNOWN_SCAM")
        self.assertEqual(res.risk_level, "high")
        self.assertEqual(res.report_count, 4)
        self.assertTrue(res.risk_score >= 60)
        self.assertEqual(res.top_category, "electricity_bill")
        self.assertEqual(res.distinct_areas_count, 2)

    # -------------------------------------------------------------------------
    # 4. Rejected Reports Must Not Affect Risk
    # -------------------------------------------------------------------------
    def test_rejected_reports_do_not_affect_risk(self):
        ident = Identifier(
            identifier_type="phone",
            raw_value="+919876543210",
            normalized_value="+919876543210",
        )
        self.db.add(ident)
        self.db.commit()

        # 1 accepted, 5 rejected
        accepted_rep = ScamReport(
            identifier_id=ident.id,
            scam_type="kyc_fraud",
            status="accepted",
            trust_score=50,
        )
        self.db.add(accepted_rep)

        for _ in range(5):
            rejected_rep = ScamReport(
                identifier_id=ident.id,
                scam_type="kyc_fraud",
                status="rejected",
                trust_score=10,
            )
            self.db.add(rejected_rep)
        self.db.commit()

        res = execute_lookup("+919876543210", None, self.db)
        self.assertEqual(res.report_count, 1)
        self.assertEqual(res.verdict, "SUSPICIOUS")

    # -------------------------------------------------------------------------
    # 5. Duplicate and Rate-Limited Reports Must Not Affect Risk
    # -------------------------------------------------------------------------
    def test_duplicate_and_rate_limited_reports_ignored(self):
        ident = Identifier(
            identifier_type="url",
            raw_value="fake-bank.in",
            normalized_value="https://fake-bank.in",
        )
        self.db.add(ident)
        self.db.commit()

        # 1 accepted report
        self.db.add(ScamReport(
            identifier_id=ident.id,
            scam_type="phishing",
            status="accepted",
            trust_score=60,
        ))

        # Duplicate and rate-limited reports
        self.db.add(ScamReport(
            identifier_id=ident.id,
            scam_type="phishing",
            status="duplicate",
            trust_score=50,
        ))
        self.db.add(ScamReport(
            identifier_id=ident.id,
            scam_type="phishing",
            status="rate_limited",
            trust_score=50,
        ))
        self.db.commit()

        res = execute_lookup("fake-bank.in", None, self.db)
        self.assertEqual(res.report_count, 1)

    # -------------------------------------------------------------------------
    # 6. Invalid Identifiers Must Return 400 Validation Errors
    # -------------------------------------------------------------------------
    def test_invalid_identifiers_return_400(self):
        invalid_inputs = [
            ("", "empty"),
            ("   ", "whitespace"),
            ("12345", "short phone"),
            ("name@", "malformed upi"),
            ("not_a_url_or_phone", "random text"),
        ]
        for val, desc in invalid_inputs:
            with self.subTest(desc=desc):
                with self.assertRaises(HTTPException) as ctx:
                    execute_lookup(val, None, self.db)
                self.assertEqual(ctx.exception.status_code, 400)

    # -------------------------------------------------------------------------
    # 7. Phone Normalization: Different Inputs Find Same Identifier
    # -------------------------------------------------------------------------
    def test_phone_normalization_matches_same_record(self):
        ident = Identifier(
            identifier_type="phone",
            raw_value="9876543210",
            normalized_value="+919876543210",
        )
        self.db.add(ident)
        self.db.commit()

        self.db.add(ScamReport(
            identifier_id=ident.id,
            scam_type="digital_arrest",
            status="accepted",
            trust_score=75,
        ))
        self.db.commit()

        queries = [
            "9876543210",
            "+91 9876543210",
            "98765 43210",
            "+91-9876543210",
            "09876543210",
        ]
        for q in queries:
            with self.subTest(query=q):
                res = execute_lookup(q, None, self.db)
                self.assertEqual(res.report_count, 1)
                self.assertEqual(res.normalized_value, "+919876543210")
                self.assertEqual(res.top_category, "digital_arrest")

    # -------------------------------------------------------------------------
    # 8. UPI Normalization
    # -------------------------------------------------------------------------
    def test_upi_normalization_matches_same_record(self):
        ident = Identifier(
            identifier_type="upi",
            raw_value="test.user@paytm",
            normalized_value="test.user@paytm",
        )
        self.db.add(ident)
        self.db.commit()

        self.db.add(ScamReport(
            identifier_id=ident.id,
            scam_type="upi_fraud",
            status="accepted",
            trust_score=70,
        ))
        self.db.commit()

        queries = ["test.user@paytm", "Test.User@PAYTM", "  test.user@paytm  "]
        for q in queries:
            with self.subTest(query=q):
                res = execute_lookup(q, None, self.db)
                self.assertEqual(res.report_count, 1)
                self.assertEqual(res.normalized_value, "test.user@paytm")

    # -------------------------------------------------------------------------
    # 9. URL Normalization
    # -------------------------------------------------------------------------
    def test_url_normalization_matches_same_record(self):
        ident = Identifier(
            identifier_type="url",
            raw_value="example.com/login",
            normalized_value="https://example.com/login",
        )
        self.db.add(ident)
        self.db.commit()

        self.db.add(ScamReport(
            identifier_id=ident.id,
            scam_type="phishing",
            status="accepted",
            trust_score=90,
        ))
        self.db.commit()

        queries = [
            "example.com/login",
            "https://example.com/login/",
            "http://example.com/login",
            "www.example.com/login",  # www matches www canonical
        ]
        res1 = execute_lookup("example.com/login", None, self.db)
        self.assertEqual(res1.report_count, 1)
        self.assertEqual(res1.normalized_value, "https://example.com/login")

        res2 = execute_lookup("https://EXAMPLE.COM/login/", None, self.db)
        self.assertEqual(res2.report_count, 1)

    # -------------------------------------------------------------------------
    # 10. POST and GET Route Handlers
    # -------------------------------------------------------------------------
    def test_post_and_get_route_handlers(self):
        # Test POST handler
        post_req = LookupRequest(query="9876543210")
        post_res = lookup_post(post_req, db=self.db)
        self.assertEqual(post_res.verdict, "NO_REPORTS")

        # Test POST handler with alternative "value" field
        post_req_val = LookupRequest(value="user@okaxis")
        post_res_val = lookup_post(post_req_val, db=self.db)
        self.assertEqual(post_res_val.verdict, "NO_REPORTS")

        # Test GET handler
        get_res = lookup_get(query="https://example.com", type="url", db=self.db)
        self.assertEqual(get_res.verdict, "NO_REPORTS")


if __name__ == "__main__":
    unittest.main()
