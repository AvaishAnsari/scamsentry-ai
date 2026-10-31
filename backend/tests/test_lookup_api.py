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
    # 2. Single Accepted Report -> UNDER_REVIEW (Not Confirmed Scam)
    # -------------------------------------------------------------------------
    def test_single_accepted_report_returns_under_review(self):
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
            reporter_fingerprint_hash="fp_reporter_1",
        )
        self.db.add(report)
        self.db.commit()

        res = execute_lookup("9876543210", None, self.db)
        self.assertTrue(res.success)
        # Mentor requirement: 1 report MUST NOT produce KNOWN_SCAM or SUSPICIOUS
        self.assertEqual(res.verdict, "UNDER_REVIEW")
        self.assertEqual(res.verification_status, "UNDER_REVIEW")
        self.assertEqual(res.confidence_level, "LOW")
        self.assertEqual(res.risk_level, "low")
        self.assertEqual(res.report_count, 1)
        self.assertEqual(res.independent_report_count, 1)
        self.assertEqual(res.risk_score, 25)
        self.assertEqual(res.top_category, "fake_job")
        self.assertEqual(len(res.recent_reports), 1)
        self.assertEqual(res.recent_reports[0].city, "Bengaluru")
        self.assertIn("under review", res.message.lower())
        self.assertTrue(len(res.safety_guidance) > 0)

    # -------------------------------------------------------------------------
    # 2b. Multiple Independent Reports -> Increases to SUSPICIOUS
    # -------------------------------------------------------------------------
    def test_multiple_independent_reports_returns_suspicious(self):
        area = Area(name="Koramangala", city="Bengaluru", state="Karnataka")
        self.db.add(area)
        self.db.commit()

        ident = Identifier(
            identifier_type="phone",
            raw_value="+91 9123456789",
            normalized_value="+919123456789",
        )
        self.db.add(ident)
        self.db.commit()

        # 2 reports from 2 different fingerprints
        self.db.add(ScamReport(
            identifier_id=ident.id,
            area_id=area.id,
            scam_type="upi_fraud",
            status="accepted",
            trust_score=60,
            reporter_fingerprint_hash="fp_user_alpha",
        ))
        self.db.add(ScamReport(
            identifier_id=ident.id,
            area_id=area.id,
            scam_type="upi_fraud",
            status="accepted",
            trust_score=60,
            reporter_fingerprint_hash="fp_user_beta",
        ))
        self.db.commit()

        res = execute_lookup("9123456789", None, self.db)
        self.assertTrue(res.success)
        self.assertEqual(res.verdict, "SUSPICIOUS")
        self.assertEqual(res.verification_status, "SUSPICIOUS")
        self.assertEqual(res.confidence_level, "MEDIUM")
        self.assertEqual(res.report_count, 2)
        self.assertEqual(res.independent_report_count, 2)
        self.assertTrue(res.risk_score >= 25)

    # -------------------------------------------------------------------------
    # 2c. Repeated Reports from Same Person Do Not Increase Confidence
    # -------------------------------------------------------------------------
    def test_repeated_reports_same_person_stay_under_review(self):
        ident = Identifier(
            identifier_type="phone",
            raw_value="+91 9555544444",
            normalized_value="+919555544444",
        )
        self.db.add(ident)
        self.db.commit()

        # 3 reports from the EXACT same fingerprint
        for i in range(3):
            self.db.add(ScamReport(
                identifier_id=ident.id,
                scam_type="fake_job",
                status="accepted",
                trust_score=50,
                reporter_fingerprint_hash="same_single_user_fp",
            ))
        self.db.commit()

        res = execute_lookup("9555544444", None, self.db)
        self.assertEqual(res.report_count, 3)
        self.assertEqual(res.independent_report_count, 1)  # Only 1 unique reporter
        self.assertEqual(res.verdict, "UNDER_REVIEW")
        self.assertEqual(res.confidence_level, "LOW")

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

        # Add 5 accepted reports from distinct reporters
        for i in range(5):
            rep = ScamReport(
                identifier_id=ident.id,
                area_id=area1.id if i % 2 == 0 else area2.id,
                scam_type="electricity_bill",
                description=f"Demanded payment immediately {i}",
                status="accepted",
                trust_score=80,
                reporter_fingerprint_hash=f"fp_distinct_user_{i}",
            )
            self.db.add(rep)
        self.db.commit()

        res = execute_lookup("fraudster@okaxis", None, self.db)
        self.assertTrue(res.success)
        self.assertEqual(res.verdict, "KNOWN_SCAM")
        self.assertEqual(res.verification_status, "HIGH_RISK")
        self.assertEqual(res.confidence_level, "HIGH")
        self.assertEqual(res.risk_level, "high")
        self.assertEqual(res.report_count, 5)
        self.assertEqual(res.independent_report_count, 5)
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
            reporter_fingerprint_hash="fp_valid_reporter",
        )
        self.db.add(accepted_rep)

        for i in range(5):
            rejected_rep = ScamReport(
                identifier_id=ident.id,
                scam_type="kyc_fraud",
                status="rejected",
                trust_score=10,
                reporter_fingerprint_hash=f"fp_bad_{i}",
            )
            self.db.add(rejected_rep)
        self.db.commit()

        res = execute_lookup("+919876543210", None, self.db)
        self.assertEqual(res.report_count, 1)
        self.assertEqual(res.verdict, "UNDER_REVIEW")
        self.assertEqual(res.verification_status, "UNDER_REVIEW")

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

    # -------------------------------------------------------------------------
    # 11. Investigation Mode Fields (evidence_items, related_indicators)
    # -------------------------------------------------------------------------
    def test_investigation_mode_evidence_for_unreported_clean_url(self):
        """Unreported normal URLs must return empty evidence_items and related_indicators."""
        res = execute_lookup("https://github.com", "url", self.db)
        self.assertEqual(res.verdict, "NO_REPORTS")
        self.assertEqual(res.evidence_items, [])
        self.assertEqual(res.related_indicators, [])

    def test_investigation_mode_evidence_for_scam_with_reports(self):
        """Reported scam identifiers must return concrete evidence compiled from reports."""
        ident = Identifier(
            identifier_type="url",
            raw_value="sbi-kyc-fake.in/login",
            normalized_value="https://sbi-kyc-fake.in/login",
        )
        self.db.add(ident)
        self.db.commit()

        # Add 3 reports from distinct reporters
        for i in range(3):
            self.db.add(ScamReport(
                identifier_id=ident.id,
                scam_type="phishing",
                description="Fake SBI netbanking portal",
                status="accepted",
                trust_score=85,
                reporter_fingerprint_hash=f"rep_{i}",
                source_ip_hash=f"ip_{i}",
            ))
        self.db.commit()

        res = execute_lookup("sbi-kyc-fake.in/login", "url", self.db)
        self.assertIn(res.verdict, ["SUSPICIOUS", "KNOWN_SCAM"])
        self.assertIsInstance(res.evidence_items, list)
        self.assertGreater(len(res.evidence_items), 0)
        # Verify evidence includes report count and category
        evidence_text = " ".join(res.evidence_items)
        self.assertIn("community report", evidence_text)
        self.assertIn("Phishing", evidence_text)

    def test_investigation_mode_evidence_for_verified_business(self):
        """Verified business numbers must return official registry evidence."""
        res = execute_lookup("1800 123 4567", "phone", self.db)
        self.assertEqual(res.verdict, "VERIFIED_BUSINESS")
        self.assertIsInstance(res.evidence_items, list)
        self.assertGreater(len(res.evidence_items), 0)
        evidence_text = " ".join(res.evidence_items)
        self.assertIn("registry match", evidence_text)
        self.assertEqual(res.related_indicators, [])


if __name__ == "__main__":
    unittest.main()

