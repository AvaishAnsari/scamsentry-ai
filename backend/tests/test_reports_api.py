import unittest
from datetime import datetime, timezone
from fastapi import HTTPException, Response
from fastapi.requests import Request
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.database import Base
from app.models.abuse_control import ReporterRateLimit
from app.models.area import Area
from app.models.identifier import Identifier
from app.models.scam_report import ScamReport
from app.routes.lookup import execute_lookup
from app.routes.reports import ReportCreateRequest, create_report


class DummyClient:
    def __init__(self, host: str = "127.0.0.1"):
        self.host = host


class DummyRequest:
    def __init__(self, host: str = "127.0.0.1", user_agent: str = "TestAgent/1.0"):
        self.client = DummyClient(host)
        self.headers = {"user-agent": user_agent}


class TestReportsAPI(unittest.TestCase):
    """Test suite for anonymous scam reporting, rate-limiting, and anti-abuse protection."""

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
        # Clean up database tables before each test
        self.db.query(ScamReport).delete()
        self.db.query(Identifier).delete()
        self.db.query(Area).delete()
        self.db.query(ReporterRateLimit).delete()
        self.db.commit()

    def tearDown(self):
        self.db.close()

    # -------------------------------------------------------------------------
    # 1. Valid Phone Report Submission
    # -------------------------------------------------------------------------
    def test_valid_phone_report_submission(self):
        req = ReportCreateRequest(
            target_value="98765 43210",
            scam_category="digital_arrest",
            description="Caller claimed my parcel had drugs and demanded ₹10,000.",
            city="Bengaluru",
            state="Karnataka",
            pincode="560102",
        )
        dummy_req = DummyRequest(host="10.0.0.1")
        response = Response()

        res = create_report(req, dummy_req, response, self.db)
        self.assertEqual(res.status, "success")
        self.assertEqual(res.target_type, "phone")
        self.assertEqual(res.normalized_target, "+919876543210")
        self.assertTrue(res.report_id.startswith("rep_"))

        # Verify saved in DB
        db_rep = self.db.query(ScamReport).first()
        self.assertIsNotNone(db_rep)
        self.assertEqual(db_rep.status, "accepted")
        self.assertTrue(db_rep.trust_score >= 50)
        self.assertIsNotNone(db_rep.reporter_fingerprint_hash)
        self.assertIsNotNone(db_rep.source_ip_hash)

    # -------------------------------------------------------------------------
    # 2. Valid UPI Report Submission
    # -------------------------------------------------------------------------
    def test_valid_upi_report_submission(self):
        req = ReportCreateRequest(
            target_value="fraudster@okaxis",
            scam_category="upi_fraud",
            description="Sent fake payment screenshot and requested money back.",
            city="Mumbai",
            state="Maharashtra",
        )
        dummy_req = DummyRequest(host="10.0.0.2")
        response = Response()

        res = create_report(req, dummy_req, response, self.db)
        self.assertEqual(res.status, "success")
        self.assertEqual(res.target_type, "upi")
        self.assertEqual(res.normalized_target, "fraudster@okaxis")

    # -------------------------------------------------------------------------
    # 3. Valid URL Report Submission
    # -------------------------------------------------------------------------
    def test_valid_url_report_submission(self):
        req = ReportCreateRequest(
            target_value="sbi-kyc-update.in/login",
            scam_category="phishing",
            description="Fake net banking phishing login page sent via SMS.",
        )
        dummy_req = DummyRequest(host="10.0.0.3")
        response = Response()

        res = create_report(req, dummy_req, response, self.db)
        self.assertEqual(res.status, "success")
        self.assertEqual(res.target_type, "url")
        self.assertEqual(res.normalized_target, "https://sbi-kyc-update.in/login")

    # -------------------------------------------------------------------------
    # 4. Invalid Identifier Rejection
    # -------------------------------------------------------------------------
    def test_invalid_identifier_rejection(self):
        req = ReportCreateRequest(
            target_value="12345",  # Invalid short phone
            scam_category="phishing",
            description="Some suspicious attempt was noticed here.",
        )
        dummy_req = DummyRequest(host="10.0.0.4")
        response = Response()

        with self.assertRaises(HTTPException) as ctx:
            create_report(req, dummy_req, response, self.db)
        self.assertEqual(ctx.exception.status_code, 400)

    # -------------------------------------------------------------------------
    # 5. Invalid Scam Category Rejection
    # -------------------------------------------------------------------------
    def test_invalid_scam_category_rejection(self):
        req = ReportCreateRequest(
            target_value="+919876543210",
            scam_category="unsupported_invalid_category_xyz",
            description="Some suspicious attempt was noticed here.",
        )
        dummy_req = DummyRequest(host="10.0.0.5")
        response = Response()

        with self.assertRaises(HTTPException) as ctx:
            create_report(req, dummy_req, response, self.db)
        self.assertEqual(ctx.exception.status_code, 400)

    # -------------------------------------------------------------------------
    # 6. Quick Report Flow (Optional Description & Evidence Reference)
    # -------------------------------------------------------------------------
    def test_quick_report_with_optional_description(self):
        # Submission without description (Quick Report)
        req_no_desc = ReportCreateRequest(
            target_value="+919876543210",
            scam_category="fake_job",
        )
        dummy_req = DummyRequest(host="10.0.0.8")
        res = create_report(req_no_desc, dummy_req, Response(), self.db)
        self.assertEqual(res.status, "success")
        self.assertEqual(res.verification_status, "UNDER_REVIEW")
        self.assertEqual(res.confidence_level, "LOW")
        self.assertTrue(len(res.safety_guidance) > 0)
        self.assertIn("community", res.community_impact_message.lower())

        # Submission with short description and evidence link
        req_short = ReportCreateRequest(
            target_value="fraud@paytm",
            scam_category="upi_fraud",
            description="scam",
            evidence_url="https://evidence.example.com/screenshot.png",
        )
        dummy_req2 = DummyRequest(host="10.0.0.9")
        res2 = create_report(req_short, dummy_req2, Response(), self.db)
        self.assertEqual(res2.status, "success")
        self.assertEqual(res2.target_type, "upi")

    # -------------------------------------------------------------------------
    # 8 & 9. Duplicate Submission Detection (Same Fingerprint + Target + Category)
    # -------------------------------------------------------------------------
    def test_duplicate_submission_detection(self):
        req = ReportCreateRequest(
            target_value="9876543210",
            scam_category="fake_job",
            description="Offered Telegram tasks and asked to deposit ₹2,000.",
        )
        dummy_req = DummyRequest(host="192.168.1.50", user_agent="Mozilla/5.0")
        response1 = Response()

        # 1st submission -> Success
        res1 = create_report(req, dummy_req, response1, self.db)
        self.assertEqual(res1.status, "success")

        # 2nd submission from SAME client for same identifier and category -> Duplicate
        response2 = Response()
        res2 = create_report(req, dummy_req, response2, self.db)
        self.assertEqual(res2.status, "duplicate")
        self.assertIn("Duplicate report detected", res2.message)

        # Verify database record count
        all_reps = self.db.query(ScamReport).all()
        self.assertEqual(len(all_reps), 2)
        statuses = [r.status for r in all_reps]
        self.assertIn("accepted", statuses)
        self.assertIn("duplicate", statuses)

        # Verify that only 1 report is accepted
        accepted_count = self.db.query(ScamReport).filter(ScamReport.status == "accepted").count()
        self.assertEqual(accepted_count, 1)

    # -------------------------------------------------------------------------
    # 10. Rate Limiting Enforcement (Max 5 reports in 1 hour)
    # -------------------------------------------------------------------------
    def test_rate_limit_enforcement(self):
        dummy_req = DummyRequest(host="192.168.1.99")

        # Submit 5 distinct targets from the same client
        for i in range(5):
            req = ReportCreateRequest(
                target_value=f"987654321{i}",
                scam_category="fake_job",
                description=f"Telegram task fraud incident number {i}",
            )
            resp = Response()
            res = create_report(req, dummy_req, resp, self.db)
            self.assertEqual(res.status, "success")

        # 6th attempt within the same hour should trigger 429
        req6 = ReportCreateRequest(
            target_value="9876543299",
            scam_category="fake_job",
            description="Another fraud incident exceeding limit",
        )
        resp6 = Response()
        with self.assertRaises(HTTPException) as ctx:
            create_report(req6, dummy_req, resp6, self.db)

        self.assertEqual(ctx.exception.status_code, 429)
        self.assertIn("Rate limit exceeded", ctx.exception.detail)

    # -------------------------------------------------------------------------
    # 11. Reports from Different Fingerprints Behave Independently
    # -------------------------------------------------------------------------
    def test_different_fingerprints_independent(self):
        dummy_req1 = DummyRequest(host="10.1.1.1", user_agent="AgentA")
        dummy_req2 = DummyRequest(host="10.1.1.2", user_agent="AgentB")

        req = ReportCreateRequest(
            target_value="9876543210",
            scam_category="fake_job",
            description="Telegram task scam reported by user 1.",
        )
        res1 = create_report(req, dummy_req1, Response(), self.db)
        self.assertEqual(res1.status, "success")

        # Second user reporting SAME identifier is NOT duplicate (different fingerprint)
        req2 = ReportCreateRequest(
            target_value="9876543210",
            scam_category="fake_job",
            description="Telegram task scam reported by user 2.",
        )
        res2 = create_report(req2, dummy_req2, Response(), self.db)
        self.assertEqual(res2.status, "success")

        accepted_count = self.db.query(ScamReport).filter(ScamReport.status == "accepted").count()
        self.assertEqual(accepted_count, 2)

    # -------------------------------------------------------------------------
    # 12, 13, 14. Lookup Integration: Accepted vs Duplicate/Rate-Limited Reports
    # -------------------------------------------------------------------------
    def test_end_to_end_lookup_integration(self):
        target = "+91 99999 88888"

        # 1. Unknown identifier -> NO_REPORTS
        initial_lookup = execute_lookup(target, None, self.db)
        self.assertEqual(initial_lookup.verdict, "NO_REPORTS")
        self.assertEqual(initial_lookup.report_count, 0)
        self.assertEqual(initial_lookup.risk_score, 0)

        # 2. Submit 1 accepted report
        req1 = ReportCreateRequest(
            target_value=target,
            scam_category="digital_arrest",
            description="Pretended to be CBI officer threatening arrest on video.",
            city="Delhi",
            state="Delhi",
            pincode="110001",
        )
        client1 = DummyRequest(host="203.0.113.1")
        res1 = create_report(req1, client1, Response(), self.db)
        self.assertEqual(res1.status, "success")

        # 3. Lookup again -> UNDER_REVIEW (1 community report is not confirmed scam)
        lookup1 = execute_lookup(target, None, self.db)
        self.assertEqual(lookup1.report_count, 1)
        self.assertEqual(lookup1.independent_report_count, 1)
        self.assertEqual(lookup1.verdict, "UNDER_REVIEW")
        self.assertEqual(lookup1.verification_status, "UNDER_REVIEW")
        self.assertEqual(lookup1.confidence_level, "LOW")
        self.assertEqual(lookup1.risk_score, 25)

        # 4. Same client submits duplicate -> Marked duplicate, lookup unchanged
        res_dup = create_report(req1, client1, Response(), self.db)
        self.assertEqual(res_dup.status, "duplicate")

        lookup_after_dup = execute_lookup(target, None, self.db)
        self.assertEqual(lookup_after_dup.report_count, 1)  # Unchanged!
        self.assertEqual(lookup_after_dup.risk_score, lookup1.risk_score)  # Unchanged!

        # 5. Two more distinct users submit accepted reports from different cities
        client2 = DummyRequest(host="203.0.113.2")
        client3 = DummyRequest(host="203.0.113.3")

        req2 = ReportCreateRequest(
            target_value="9999988888",  # Different format, same normalized target!
            scam_category="digital_arrest",
            description="Same CBI scam call received demanding ₹50,000.",
            city="Mumbai",
            state="Maharashtra",
            pincode="400001",
        )
        create_report(req2, client2, Response(), self.db)

        req3 = ReportCreateRequest(
            target_value="+91-99999-88888",
            scam_category="fake_kyc",
            description="Phishing SMS received claiming bank KYC expired.",
            city="Bengaluru",
            state="Karnataka",
            pincode="560102",
        )
        create_report(req3, client3, Response(), self.db)

        # 6. Lookup again -> KNOWN_SCAM with >= 3 accepted reports from independent reporters
        final_lookup = execute_lookup(target, None, self.db)
        self.assertEqual(final_lookup.report_count, 3)
        self.assertEqual(final_lookup.independent_report_count, 3)
        self.assertEqual(final_lookup.verdict, "KNOWN_SCAM")
        self.assertEqual(final_lookup.verification_status, "HIGH_RISK")
        self.assertEqual(final_lookup.confidence_level, "HIGH")
        self.assertEqual(final_lookup.risk_level, "high")
        self.assertTrue(final_lookup.risk_score >= 60)
        self.assertEqual(final_lookup.distinct_areas_count, 3)
        self.assertEqual(final_lookup.risk_level, "high")
        self.assertTrue(final_lookup.risk_score >= 60)
        self.assertEqual(final_lookup.distinct_areas_count, 3)


if __name__ == "__main__":
    unittest.main()
