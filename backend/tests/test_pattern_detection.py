import unittest
from datetime import datetime, timedelta, timezone
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.database import Base
from app.models.area import Area
from app.models.identifier import Identifier
from app.models.scam_report import ScamReport
from app.routes.lookup import execute_lookup
from app.services.pattern_detection_service import (
    analyze_scam_patterns,
    PatternAnalysisResult,
    RiskSignal,
)


class TestPatternDetection(unittest.TestCase):
    """Test suite for Scam Pattern Detection & Risk Signal Engine."""

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

        # Seed sample areas
        self.area1 = Area(
            name="Indiranagar",
            city="Bengaluru",
            state="Karnataka",
            pincode="560038",
            latitude=12.9784,
            longitude=77.6408,
        )
        self.area2 = Area(
            name="Connaught Place",
            city="Delhi",
            state="Delhi",
            pincode="110001",
            latitude=28.6315,
            longitude=77.2167,
        )
        self.area3 = Area(
            name="Bandra",
            city="Mumbai",
            state="Maharashtra",
            pincode="400050",
            latitude=19.0596,
            longitude=72.8295,
        )
        self.db.add_all([self.area1, self.area2, self.area3])
        self.db.commit()

    def tearDown(self):
        self.db.close()

    # =========================================================================
    # PART 1: Direct Service Pattern Unit Tests
    # =========================================================================

    def test_phone_signals_spike_categories_and_geography(self):
        """Test community signal analysis for spike, categories, and geographic spread."""
        ident = Identifier(
            identifier_type="phone",
            raw_value="+919876543210",
            normalized_value="+919876543210",
        )
        self.db.add(ident)
        self.db.commit()

        now = datetime.now(timezone.utc)
        reports = [
            ScamReport(
                identifier_id=ident.id,
                scam_type="fake_job",
                reporter_fingerprint_hash=f"fp_{i}",
                status="accepted",
                created_at=now - timedelta(hours=i),
                area_id=self.area1.id if i % 2 == 0 else self.area2.id,
            )
            for i in range(12)
        ]
        # Add third category
        reports[0].scam_type = "digital_arrest"
        reports[1].scam_type = "investment_fraud"
        reports[2].area_id = self.area3.id
        self.db.add_all(reports)
        self.db.commit()

        result = analyze_scam_patterns(
            raw_query="+919876543210",
            target_type="phone",
            normalized_val="+919876543210",
            accepted_reports=reports,
        )

        signal_types = [s.type for s in result.risk_signals]
        self.assertIn("REPORT_SPIKE", signal_types)
        self.assertIn("CATEGORY_DIVERSITY", signal_types)
        self.assertIn("GEOGRAPHIC_SPREAD", signal_types)
        self.assertTrue(
            "HIGH_COMMUNITY_CORROBORATION" in signal_types
            or "MULTIPLE_INDEPENDENT_REPORTS" in signal_types
        )
        self.assertGreater(result.pattern_risk_score, 50)
        self.assertEqual(result.confidence_level, "HIGH")

    def test_upi_suspicious_impersonation_naming(self):
        """Test UPI identifier containing impersonation keywords."""
        result = analyze_scam_patterns(
            raw_query="kyc.verify123@okaxis",
            target_type="upi",
            normalized_val="kyc.verify123@okaxis",
            accepted_reports=[],
        )

        signal_types = [s.type for s in result.risk_signals]
        self.assertIn("SUSPICIOUS_KEYWORD_PATTERN", signal_types)
        self.assertGreater(result.pattern_risk_score, 0)
        # Without reports, confidence should be LOW
        self.assertEqual(result.confidence_level, "LOW")
        self.assertIn("caution", result.pattern_summary.lower())

    def test_upi_normal_has_zero_pattern_score(self):
        """Test normal UPI identifier produces zero pattern risk score."""
        result = analyze_scam_patterns(
            raw_query="rahul.sharma@okhdfcbank",
            target_type="upi",
            normalized_val="rahul.sharma@okhdfcbank",
            accepted_reports=[],
        )
        self.assertEqual(result.pattern_risk_score, 0)
        self.assertEqual(len(result.risk_signals), 0)
        self.assertEqual(result.confidence_level, "NONE")

    def test_email_brand_impersonation_and_free_webmail_mismatch(self):
        """Test email with banking brand on free webmail provider."""
        result = analyze_scam_patterns(
            raw_query="support-bank-security@gmail.com",
            target_type="email",
            normalized_val="support-bank-security@gmail.com",
            accepted_reports=[],
        )

        signal_types = [s.type for s in result.risk_signals]
        self.assertTrue(
            "BRAND_IMPERSONATION" in signal_types
            or "FREE_WEBMAIL_BRAND_MISMATCH" in signal_types
            or "FREE_EMAIL_BRAND_MISMATCH" in signal_types
            or "SUSPICIOUS_KEYWORD_PATTERN" in signal_types
        )
        self.assertGreater(result.pattern_risk_score, 0)
        self.assertEqual(result.confidence_level, "LOW")

    def test_email_normal_identifier(self):
        """Test normal email has zero pattern risk score."""
        result = analyze_scam_patterns(
            raw_query="contact.person@example.com",
            target_type="email",
            normalized_val="contact.person@example.com",
            accepted_reports=[],
        )
        self.assertEqual(result.pattern_risk_score, 0)
        self.assertEqual(len(result.risk_signals), 0)

    def test_url_brand_impersonation_and_keywords(self):
        """Test URL impersonating bank with verification keywords."""
        result = analyze_scam_patterns(
            raw_query="http://sbi-kyc-update.in/login",
            target_type="url",
            normalized_val="http://sbi-kyc-update.in/login",
            accepted_reports=[],
        )

        signal_types = [s.type for s in result.risk_signals]
        self.assertIn("BRAND_IMPERSONATION", signal_types)
        self.assertIn("SUSPICIOUS_KEYWORDS", signal_types)
        self.assertGreater(result.pattern_risk_score, 40)
        self.assertEqual(result.recommended_action, "AVOID_CLICKING_LINK")

    def test_url_ip_address_detection(self):
        """Test URL using raw IP address generates IP_ADDRESS_URL signal."""
        result = analyze_scam_patterns(
            raw_query="http://192.168.1.100:8080/kyc-verify",
            target_type="url",
            normalized_val="http://192.168.1.100:8080/kyc-verify",
            accepted_reports=[],
        )

        signal_types = [s.type for s in result.risk_signals]
        self.assertIn("IP_ADDRESS_URL", signal_types)
        self.assertGreater(result.pattern_risk_score, 0)

    def test_url_normal_domain(self):
        """Test normal legitimate URL produces zero pattern risk score."""
        result = analyze_scam_patterns(
            raw_query="https://docs.python.org/3/library/unittest.html",
            target_type="url",
            normalized_val="https://docs.python.org/3/library/unittest.html",
            accepted_reports=[],
        )
        self.assertEqual(result.pattern_risk_score, 0)
        self.assertEqual(len(result.risk_signals), 0)

    # =========================================================================
    # PART 2: Lookup API End-to-End Tests & Safety Rule Verification
    # =========================================================================

    def test_phone_no_reports_returns_no_reports(self):
        """Safety Rule: Phone with 0 reports must remain NO_REPORTS."""
        res = execute_lookup("9876543210", "phone", self.db)
        self.assertEqual(res.verdict, "NO_REPORTS")
        self.assertEqual(res.risk_score, 0)
        self.assertEqual(res.pattern_risk_score, 0)
        self.assertEqual(res.confidence_level, "NONE")
        self.assertEqual(res.risk_signals, [])

    def test_phone_single_report_returns_under_review(self):
        """Phone with 1 accepted report returns UNDER_REVIEW."""
        ident = Identifier(
            identifier_type="phone",
            raw_value="+919876543210",
            normalized_value="+919876543210",
        )
        self.db.add(ident)
        self.db.commit()

        rep = ScamReport(
            identifier_id=ident.id,
            scam_type="digital_arrest",
            reporter_fingerprint_hash="fp_user1",
            status="accepted",
            created_at=datetime.now(timezone.utc),
        )
        self.db.add(rep)
        self.db.commit()

        res = execute_lookup("+919876543210", "phone", self.db)
        self.assertEqual(res.verdict, "UNDER_REVIEW")
        self.assertEqual(res.confidence_level, "LOW")
        signal_types = [s["type"] for s in res.risk_signals]
        self.assertIn("INITIAL_COMMUNITY_WARNING", signal_types)

    def test_phone_multiple_independent_reports_returns_suspicious_or_scam(self):
        """Phone with multiple reports escalates verdict and detects community signals."""
        ident = Identifier(
            identifier_type="phone",
            raw_value="+919876543210",
            normalized_value="+919876543210",
        )
        self.db.add(ident)
        self.db.commit()

        now = datetime.now(timezone.utc)
        for i in range(4):
            rep = ScamReport(
                identifier_id=ident.id,
                scam_type="fake_job" if i % 2 == 0 else "loan_scam",
                reporter_fingerprint_hash=f"fp_user_{i}",
                status="accepted",
                created_at=now - timedelta(hours=i),
                area_id=self.area1.id if i < 2 else self.area2.id,
            )
            self.db.add(rep)
        self.db.commit()

        res = execute_lookup("+919876543210", "phone", self.db)
        self.assertIn(res.verdict, ["SUSPICIOUS", "KNOWN_SCAM"])
        self.assertGreater(res.risk_score, 50)
        signal_types = [s["type"] for s in res.risk_signals]
        self.assertIn("MULTIPLE_INDEPENDENT_REPORTS", signal_types)
        self.assertIn("CATEGORY_DIVERSITY", signal_types)

    def test_upi_impersonation_naming_alone_never_known_scam(self):
        """CRITICAL SAFETY RULE: Suspicious UPI pattern alone must NEVER classify as KNOWN_SCAM."""
        res = execute_lookup("kyc.verify123@okaxis", "upi", self.db)

        # Must NOT be KNOWN_SCAM
        self.assertEqual(res.verdict, "NO_REPORTS")
        self.assertEqual(res.risk_score, 0)
        # But pattern signals and pattern risk score MUST be present
        self.assertGreater(res.pattern_risk_score, 0)
        self.assertEqual(res.confidence_level, "LOW")
        self.assertIsNotNone(res.pattern_summary)
        self.assertEqual(res.recommended_action, "VERIFY_THROUGH_OFFICIAL_CHANNEL")

        # Verify weak signal wording
        messages = [s["message"] for s in res.risk_signals]
        self.assertTrue(
            any("impersonat" in m.lower() or "terminology" in m.lower() or "pattern" in m.lower() for m in messages)
        )

    def test_upi_with_community_reports_and_suspicious_naming(self):
        """UPI with independent reports + suspicious naming increases confidence."""
        ident = Identifier(
            identifier_type="upi",
            raw_value="refund.claim999@upi",
            normalized_value="refund.claim999@upi",
        )
        self.db.add(ident)
        self.db.commit()

        now = datetime.now(timezone.utc)
        for i in range(2):
            rep = ScamReport(
                identifier_id=ident.id,
                scam_type="upi_refund",
                reporter_fingerprint_hash=f"fp_upi_{i}",
                status="accepted",
                created_at=now - timedelta(minutes=15 * i),
            )
            self.db.add(rep)
        self.db.commit()

        res = execute_lookup("refund.claim999@upi", "upi", self.db)
        self.assertEqual(res.verdict, "SUSPICIOUS")
        self.assertGreater(res.risk_score, 40)
        self.assertGreater(res.pattern_risk_score, 0)
        signal_types = [s["type"] for s in res.risk_signals]
        self.assertIn("MULTIPLE_INDEPENDENT_REPORTS", signal_types)
        self.assertIn("SUSPICIOUS_KEYWORD_PATTERN", signal_types)

    def test_email_impersonation_never_known_scam_without_reports(self):
        """CRITICAL SAFETY RULE: Email pattern alone must NEVER classify as KNOWN_SCAM."""
        res = execute_lookup("support-bank-security@gmail.com", "email", self.db)

        self.assertEqual(res.verdict, "NO_REPORTS")
        self.assertEqual(res.risk_score, 0)
        self.assertGreater(res.pattern_risk_score, 0)
        self.assertEqual(res.confidence_level, "LOW")
        self.assertEqual(res.recommended_action, "VERIFY_THROUGH_OFFICIAL_CHANNEL")
        self.assertIn("not enough evidence to confirm fraud", res.pattern_summary.lower())

    def test_url_banking_impersonation_never_known_scam_without_reports(self):
        """CRITICAL SAFETY RULE: URL pattern alone must NOT classify as KNOWN_SCAM."""
        res = execute_lookup("http://sbi-kyc-update.in/login", "url", self.db)

        self.assertEqual(res.verdict, "NO_REPORTS")
        self.assertEqual(res.risk_score, 0)
        self.assertGreater(res.pattern_risk_score, 40)
        self.assertEqual(res.confidence_level, "LOW")
        self.assertEqual(res.recommended_action, "AVOID_CLICKING_LINK")
        signal_types = [s["type"] for s in res.risk_signals]
        self.assertIn("BRAND_IMPERSONATION", signal_types)
        self.assertIn("SUSPICIOUS_KEYWORDS", signal_types)

    def test_url_ip_address_never_known_scam_without_reports(self):
        """IP address URL generates risk signal without false scam accusation."""
        res = execute_lookup("http://192.168.1.1/update", "url", self.db)

        self.assertEqual(res.verdict, "NO_REPORTS")
        self.assertEqual(res.risk_score, 0)
        self.assertGreater(res.pattern_risk_score, 0)
        signal_types = [s["type"] for s in res.risk_signals]
        self.assertIn("IP_ADDRESS_URL", signal_types)

    def test_verified_business_retains_safety(self):
        """Verified business registry record remains VERIFIED_BUSINESS."""
        res = execute_lookup("18001234567", "phone", self.db)
        self.assertEqual(res.verdict, "VERIFIED_BUSINESS")
        self.assertLessEqual(res.risk_score, 5)
        self.assertEqual(res.pattern_risk_score, 0)
        self.assertEqual(res.risk_signals, [])


if __name__ == "__main__":
    unittest.main()
