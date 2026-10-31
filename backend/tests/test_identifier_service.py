import unittest
from app.services.identifier_service import (
    IdentifierValidationError,
    NormalizedIdentifier,
    detect_identifier_type,
    normalize_identifier,
    normalize_phone,
    normalize_upi,
    normalize_url,
    validate_identifier,
)


class TestIdentifierService(unittest.TestCase):
    """Unit tests for identifier detection, validation, and normalization."""

    # -------------------------------------------------------------------------
    # Phone Number Tests
    # -------------------------------------------------------------------------
    def test_phone_valid_formats(self):
        test_cases = [
            ("9876543210", "+919876543210"),
            ("+91 9876543210", "+919876543210"),
            ("+91-9876543210", "+919876543210"),
            ("91 9876543210", "+919876543210"),
            ("98765 43210", "+919876543210"),
            ("09876543210", "+919876543210"),
            ("+91 (98765) 43210", "+919876543210"),
            ("1800 123 4567", "18001234567"),
            ("1930", "1930"),
        ]
        for raw, expected in test_cases:
            with self.subTest(raw=raw):
                self.assertEqual(normalize_phone(raw), expected)

    def test_phone_invalid_formats(self):
        invalid_phones = [
            "12345",  # Too short
            "9876543210123",  # Too long
            "98765abcde",  # Letters
            "1234567890",  # Starts with 1 (not 6,7,8,9)
            "0000000000",  # Invalid prefix
            "+1 2025550123",  # US number
            "",  # Empty
        ]
        for raw in invalid_phones:
            with self.subTest(raw=raw):
                with self.assertRaises(IdentifierValidationError):
                    normalize_phone(raw)

    # -------------------------------------------------------------------------
    # UPI Tests
    # -------------------------------------------------------------------------
    def test_upi_valid_formats(self):
        test_cases = [
            ("name@upi", "name@upi"),
            ("user123@okaxis", "user123@okaxis"),
            ("abc@paytm", "abc@paytm"),
            ("User.123@OKAxis", "user.123@okaxis"),  # Case normalization
            ("merchant-pay@ybl", "merchant-pay@ybl"),
            ("9876543210@paytm", "9876543210@paytm"),
        ]
        for raw, expected in test_cases:
            with self.subTest(raw=raw):
                self.assertEqual(normalize_upi(raw), expected)

    def test_upi_invalid_formats(self):
        invalid_upis = [
            "name@",  # Missing PSP
            "@upi",  # Missing handle
            "name@@upi",  # Multiple @
            "name@upi@bank",  # Multiple @
            "name upi",  # No @
            "user space@upi",  # Space in handle
            "user..name@upi",  # Consecutive dots
            "",  # Empty
        ]
        for raw in invalid_upis:
            with self.subTest(raw=raw):
                with self.assertRaises(IdentifierValidationError):
                    normalize_upi(raw)

    # -------------------------------------------------------------------------
    # URL Tests
    # -------------------------------------------------------------------------
    def test_url_valid_formats(self):
        test_cases = [
            ("https://example.com", "https://example.com"),
            ("http://example.com", "http://example.com"),
            ("www.example.com", "https://www.example.com"),
            ("example.com", "https://example.com"),
            ("https://example.com/", "https://example.com"),  # Trailing slash stripped
            ("http://EXAMPLE.COM/login/", "http://example.com/login"),
            ("sbi-kyc-update.in/verify?id=123", "https://sbi-kyc-update.in/verify?id=123"),
            ("sub.domain.org/path", "https://sub.domain.org/path"),
        ]
        for raw, expected in test_cases:
            with self.subTest(raw=raw):
                self.assertEqual(normalize_url(raw), expected)

    def test_url_invalid_formats(self):
        invalid_urls = [
            "not_a_url",  # No domain dot
            "http://",  # No host
            "ftp://example.com",  # Unsupported scheme
            "http://example .com",  # Space in domain
            "https://.com",  # Empty domain label
            "",  # Empty
        ]
        for raw in invalid_urls:
            with self.subTest(raw=raw):
                with self.assertRaises(IdentifierValidationError):
                    normalize_url(raw)

    # -------------------------------------------------------------------------
    # Detection Priority Tests
    # -------------------------------------------------------------------------
    def test_detection_priority(self):
        # Phone
        self.assertEqual(detect_identifier_type("9876543210"), "phone")
        self.assertEqual(detect_identifier_type("+91 9876543210"), "phone")
        self.assertEqual(detect_identifier_type("98765 43210"), "phone")

        # UPI
        self.assertEqual(detect_identifier_type("name@upi"), "upi")
        self.assertEqual(detect_identifier_type("user123@okaxis"), "upi")

        # URL
        self.assertEqual(detect_identifier_type("https://example.com"), "url")
        self.assertEqual(detect_identifier_type("http://example.com"), "url")
        self.assertEqual(detect_identifier_type("www.example.com"), "url")
        self.assertEqual(detect_identifier_type("example.com"), "url")
        self.assertEqual(detect_identifier_type("sbi-kyc-update.in/login"), "url")

    def test_empty_and_whitespace_rejection(self):
        empty_inputs = ["", "   ", "\t", "\n"]
        for val in empty_inputs:
            with self.subTest(val=val):
                with self.assertRaises(IdentifierValidationError):
                    detect_identifier_type(val)
                with self.assertRaises(IdentifierValidationError):
                    normalize_identifier(val)

    def test_unclassifiable_input_rejection(self):
        unsupported = [
            "randomtextwithoutdotoratsign",
            "!!!@@@###",
            "hello world test",
        ]
        for val in unsupported:
            with self.subTest(val=val):
                with self.assertRaises(IdentifierValidationError):
                    detect_identifier_type(val)

    # -------------------------------------------------------------------------
    # Structured normalize_identifier Tests
    # -------------------------------------------------------------------------
    def test_normalize_identifier_returns_pydantic_model(self):
        res = normalize_identifier("98765 43210")
        self.assertIsInstance(res, NormalizedIdentifier)
        self.assertEqual(res.identifier_type, "phone")
        self.assertEqual(res.raw_value, "98765 43210")
        self.assertEqual(res.normalized_value, "+919876543210")

        res_upi = normalize_identifier("TestUser@OkAxis")
        self.assertEqual(res_upi.identifier_type, "upi")
        self.assertEqual(res_upi.raw_value, "TestUser@OkAxis")
        self.assertEqual(res_upi.normalized_value, "testuser@okaxis")

        res_url = normalize_identifier("www.example.com")
        self.assertEqual(res_url.identifier_type, "url")
        self.assertEqual(res_url.raw_value, "www.example.com")
        self.assertEqual(res_url.normalized_value, "https://www.example.com")

    def test_normalize_identifier_with_explicit_type(self):
        res = normalize_identifier("+91-9876543210", expected_type="phone")
        self.assertEqual(res.identifier_type, "phone")
        self.assertEqual(res.normalized_value, "+919876543210")

        # Mismatch should fail cleanly
        with self.assertRaises(IdentifierValidationError):
            normalize_identifier("https://example.com", expected_type="phone")

    def test_validate_identifier_boolean_helper(self):
        is_valid, err = validate_identifier("+91 9876543210")
        self.assertTrue(is_valid)
        self.assertIsNone(err)

        is_valid, err = validate_identifier("invalid input")
        self.assertFalse(is_valid)
        self.assertIsNotNone(err)


if __name__ == "__main__":
    unittest.main()
