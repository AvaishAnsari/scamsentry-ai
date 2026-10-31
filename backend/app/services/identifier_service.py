import ipaddress
import re
from typing import Optional, Tuple
from urllib.parse import urlsplit, urlunsplit
from pydantic import BaseModel, Field


class IdentifierValidationError(ValueError):
    """Exception raised when an identifier is invalid or cannot be classified."""

    def __init__(self, message: str, identifier_type: Optional[str] = None):
        super().__init__(message)
        self.message = message
        self.identifier_type = identifier_type


class NormalizedIdentifier(BaseModel):
    """Structured result returned upon successful identifier normalization."""

    identifier_type: str = Field(..., description="Canonical type: 'phone', 'upi', 'url', or 'email'")
    raw_value: str = Field(..., description="Original raw user input")
    normalized_value: str = Field(..., description="Normalized canonical identifier")


# Regex patterns
RE_INDIAN_MOBILE_10 = re.compile(r"^[6-9]\d{9}$")
RE_TOLL_FREE = re.compile(r"^1800\d{6,7}$")
RE_UPI_HANDLE = re.compile(r"^[a-zA-Z0-9][a-zA-Z0-9.\-_]{1,63}$")
RE_UPI_PSP = re.compile(r"^[a-zA-Z0-9.\-]{2,64}$")
RE_DOMAIN_LABEL = re.compile(r"^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?$")
RE_TLD = re.compile(r"^[a-zA-Z]{2,24}$")
RE_EMAIL = re.compile(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")


def normalize_phone(value: str) -> str:
    """Validate and normalize an Indian phone number to E.164 format (+91XXXXXXXXXX).

    Supported input patterns:
    - 9876543210
    - +91 9876543210
    - +91-9876543210
    - 91 9876543210
    - 98765 43210
    - 09876543210
    - Toll-free numbers (e.g. 1800 123 4567 -> 18001234567)

    Returns:
        Canonical string: '+91XXXXXXXXXX' for mobile, or '1800XXXXXXX' for toll-free.

    Raises:
        IdentifierValidationError: If number is not a valid Indian phone number.
    """
    if not value or not isinstance(value, str):
        raise IdentifierValidationError("Phone number cannot be empty.", identifier_type="phone")

    raw = value.strip()
    if not raw:
        raise IdentifierValidationError("Phone number cannot be empty.", identifier_type="phone")

    # Reject if it contains alphabetic characters
    if re.search(r"[a-zA-Z]", raw):
        raise IdentifierValidationError(
            f"Phone number cannot contain letters: '{raw}'",
            identifier_type="phone",
        )

    # Strip spacing, hyphens, dots, parentheses
    cleaned = re.sub(r"[\s\-\.\(\)]+", "", raw)

    # Handle leading '+'
    has_plus = cleaned.startswith("+")
    digits = cleaned.lstrip("+")

    if not digits.isdigit():
        raise IdentifierValidationError(
            f"Phone number contains invalid characters: '{raw}'",
            identifier_type="phone",
        )

    # Check toll-free numbers (1800XXXXXX)
    if RE_TOLL_FREE.match(digits):
        return digits

    # Handle prefixes:
    # 1. '+91' or '91' prefix (12 digits total)
    if digits.startswith("91") and len(digits) == 12:
        mobile_digits = digits[2:]
        if RE_INDIAN_MOBILE_10.match(mobile_digits):
            return f"+91{mobile_digits}"
        raise IdentifierValidationError(
            f"Invalid Indian mobile number after 91 prefix: '{mobile_digits}'. Must start with 6, 7, 8, or 9.",
            identifier_type="phone",
        )

    # 2. '0' prefix (11 digits total)
    if digits.startswith("0") and len(digits) == 11:
        mobile_digits = digits[1:]
        if RE_INDIAN_MOBILE_10.match(mobile_digits):
            return f"+91{mobile_digits}"
        raise IdentifierValidationError(
            f"Invalid Indian mobile number after leading 0: '{mobile_digits}'. Must start with 6, 7, 8, or 9.",
            identifier_type="phone",
        )

    # 3. Exactly 10 digits
    if len(digits) == 10:
        if RE_INDIAN_MOBILE_10.match(digits):
            return f"+91{digits}"
        raise IdentifierValidationError(
            f"10-digit Indian mobile numbers must begin with 6, 7, 8, or 9: '{digits}'",
            identifier_type="phone",
        )

    # 4. Official emergency helpline: 1930
    if digits == "1930":
        return "1930"

    raise IdentifierValidationError(
        f"Invalid Indian phone number length ({len(digits)} digits). Expected 10-digit mobile number.",
        identifier_type="phone",
    )


def normalize_upi(value: str) -> str:
    """Validate and normalize a UPI Virtual Payment Address (VPA).

    Supported examples:
    - name@upi
    - user123@okaxis
    - abc@paytm

    Normalization:
    - Trim surrounding whitespace
    - Lowercase both handle and PSP provider

    Returns:
        Canonical string: 'handle@provider' in lowercase.

    Raises:
        IdentifierValidationError: If UPI ID format is invalid.
    """
    if not value or not isinstance(value, str):
        raise IdentifierValidationError("UPI ID cannot be empty.", identifier_type="upi")

    raw = value.strip()
    if not raw:
        raise IdentifierValidationError("UPI ID cannot be empty.", identifier_type="upi")

    if "@" not in raw:
        raise IdentifierValidationError("UPI ID must contain an '@' symbol (e.g. name@bank).", identifier_type="upi")

    parts = raw.split("@")
    if len(parts) != 2:
        raise IdentifierValidationError("UPI ID cannot contain multiple '@' symbols.", identifier_type="upi")

    handle, psp = parts[0].strip(), parts[1].strip()

    if not handle:
        raise IdentifierValidationError("UPI ID missing handle before '@'.", identifier_type="upi")
    if not psp:
        raise IdentifierValidationError("UPI ID missing provider/bank handle after '@'.", identifier_type="upi")

    if ".." in handle:
        raise IdentifierValidationError("UPI ID handle cannot contain consecutive dots.", identifier_type="upi")

    if not RE_UPI_HANDLE.match(handle):
        raise IdentifierValidationError(
            f"Invalid characters in UPI handle '{handle}'. Only letters, numbers, dots, hyphens, and underscores are allowed.",
            identifier_type="upi",
        )

    if not RE_UPI_PSP.match(psp):
        raise IdentifierValidationError(
            f"Invalid characters in UPI provider handle '{psp}'.",
            identifier_type="upi",
        )

    return f"{handle.lower()}@{psp.lower()}"


def normalize_email(value: str) -> str:
    """Validate and normalize an email address.

    Returns:
        Canonical string: 'local@domain.tld' in lowercase.

    Raises:
        IdentifierValidationError: If email address format is invalid.
    """
    if not value or not isinstance(value, str):
        raise IdentifierValidationError("Email address cannot be empty.", identifier_type="email")

    raw = value.strip()
    if not raw:
        raise IdentifierValidationError("Email address cannot be empty.", identifier_type="email")

    if " " in raw:
        raise IdentifierValidationError("Email address cannot contain spaces.", identifier_type="email")

    if "@" not in raw:
        raise IdentifierValidationError("Email address must contain an '@' symbol.", identifier_type="email")

    parts = raw.split("@")
    if len(parts) != 2:
        raise IdentifierValidationError("Email address cannot contain multiple '@' symbols.", identifier_type="email")

    local, domain = parts[0].strip(), parts[1].strip()
    if not local:
        raise IdentifierValidationError("Email address is missing username before '@'.", identifier_type="email")
    if not domain:
        raise IdentifierValidationError("Email address is missing domain after '@'.", identifier_type="email")

    if "." not in domain or domain.endswith("."):
        raise IdentifierValidationError("Email domain must contain a valid top-level domain.", identifier_type="email")

    if not RE_EMAIL.match(raw):
        raise IdentifierValidationError(f"Invalid email address format: '{raw}'", identifier_type="email")

    return raw.lower()


def normalize_url(value: str) -> str:
    """Validate and normalize web URLs without network requests.

    Supported examples:
    - https://example.com
    - http://example.com
    - www.example.com
    - example.com
    - sbi-kyc-update.in/login/

    Normalization:
    - Trim surrounding whitespace
    - Prepend 'https://' if scheme is absent
    - Lowercase scheme and hostname
    - Strip trailing slashes from path
    - Reject non-HTTP(S) schemes and malformed domain structures

    Returns:
        Canonical URL string.

    Raises:
        IdentifierValidationError: If URL structure is invalid.
    """
    if not value or not isinstance(value, str):
        raise IdentifierValidationError("URL cannot be empty.", identifier_type="url")

    raw = value.strip()
    if not raw:
        raise IdentifierValidationError("URL cannot be empty.", identifier_type="url")

    if " " in raw:
        raise IdentifierValidationError("URL cannot contain spaces.", identifier_type="url")

    # Add default scheme if missing
    working_val = raw
    if working_val.startswith("//"):
        working_val = f"https:{working_val}"
    elif not working_val.startswith(("http://", "https://")):
        working_val = f"https://{working_val}"

    try:
        parsed = urlsplit(working_val)
    except Exception as e:
        raise IdentifierValidationError(f"Malformed URL structure: {e}", identifier_type="url")

    scheme = parsed.scheme.lower()
    if scheme not in ("http", "https"):
        raise IdentifierValidationError(
            f"Unsupported URL scheme '{scheme}'. Only http:// and https:// are supported.",
            identifier_type="url",
        )

    netloc = parsed.netloc
    if not netloc:
        raise IdentifierValidationError("URL is missing a valid hostname.", identifier_type="url")

    # Separate hostname and port if present
    if ":" in netloc:
        hostname, port_str = netloc.split(":", 1)
        if not port_str.isdigit():
            raise IdentifierValidationError(f"Invalid URL port '{port_str}'.", identifier_type="url")
        port = int(port_str)
        # Drop default ports
        if (scheme == "http" and port == 80) or (scheme == "https" and port == 443):
            port_suffix = ""
        else:
            port_suffix = f":{port}"
    else:
        hostname = netloc
        port_suffix = ""

    hostname = hostname.lower()

    # Allow valid IPv4 addresses
    is_ipv4 = False
    try:
        ipaddress.IPv4Address(hostname)
        is_ipv4 = True
    except ValueError:
        is_ipv4 = False

    if not is_ipv4:
        # Validate hostname structure
        labels = hostname.split(".")
        if len(labels) < 2 and hostname != "localhost":
            raise IdentifierValidationError(
                f"Invalid domain name '{hostname}'. Must contain at least a domain and top-level domain.",
                identifier_type="url",
            )

        for label in labels:
            if not label:
                raise IdentifierValidationError(f"Invalid empty domain label in '{hostname}'.", identifier_type="url")
            if not RE_DOMAIN_LABEL.match(label):
                raise IdentifierValidationError(
                    f"Invalid domain label '{label}' in hostname '{hostname}'.",
                    identifier_type="url",
                )

        # Check TLD
        tld = labels[-1]
        if not RE_TLD.match(tld):
            raise IdentifierValidationError(f"Invalid top-level domain '.{tld}'.", identifier_type="url")

    # Normalize path: strip redundant trailing slash
    path = parsed.path
    if path == "/":
        path = ""
    elif path.endswith("/"):
        path = path.rstrip("/")

    # Reconstruct normalized URL
    normalized_netloc = f"{hostname}{port_suffix}"
    normalized_url = urlunsplit((scheme, normalized_netloc, path, parsed.query, parsed.fragment))

    return normalized_url


def detect_identifier_type(value: str) -> str:
    """Deterministically detect identifier type ('phone', 'upi', or 'url') from raw input.

    Detection Order:
    1. Reject empty/whitespace input
    2. Check for '@' symbol -> Evaluate as UPI ID
    3. Check for URL prefixes ('http://', 'https://', 'www.') -> Evaluate as URL
    4. Check for phone number formatting (digits, +, -, spaces, parens) -> Evaluate as Phone
    5. Check for domain structure with known TLD -> Evaluate as URL
    6. If unclassifiable, raise IdentifierValidationError

    Returns:
        One of 'phone', 'upi', or 'url'.

    Raises:
        IdentifierValidationError: If input cannot be classified or is malformed.
    """
    if not value or not isinstance(value, str):
        raise IdentifierValidationError("Identifier cannot be empty.")

    raw = value.strip()
    if not raw:
        raise IdentifierValidationError("Identifier cannot be empty.")

    # 1. Email vs UPI detection: contains '@' and no forward slashes
    if "@" in raw and not raw.startswith(("http://", "https://")):
        parts = raw.split("@")
        if len(parts) == 2:
            domain_part = parts[1].strip().lower()
            common_webmails = {
                "gmail.com", "yahoo.com", "outlook.com", "hotmail.com",
                "icloud.com", "protonmail.com", "zoho.com", "aol.com", "mail.com",
            }
            # If domain is a known webmail or has dot with a standard TLD and not a UPI bank provider
            if domain_part in common_webmails or (
                "." in domain_part
                and not domain_part.endswith(".")
                and re.search(r"\.[a-zA-Z]{2,10}$", domain_part)
                and not any(domain_part == psp for psp in ["okaxis", "paytm", "upi", "ybl", "okhdfcbank", "oksbi"])
            ):
                try:
                    normalize_email(raw)
                    return "email"
                except IdentifierValidationError:
                    pass
        # Fall back to UPI validation
        normalize_upi(raw)
        return "upi"

    # 2. Explicit URL prefixes
    if raw.startswith(("http://", "https://", "www.")):
        normalize_url(raw)
        return "url"

    # 3. Phone number check: contains mostly digits and phone punctuation
    stripped_phone_chars = re.sub(r"[\d\s\+\-\.\(\)]", "", raw)
    if not stripped_phone_chars and re.search(r"\d", raw):
        # All characters are valid phone digits/punctuation
        normalize_phone(raw)
        return "phone"

    # 4. Domain-like URL or IP-based URL check (e.g. example.com, test.in/login, 192.168.1.1/login)
    if "." in raw and not re.search(r"\s", raw):
        first_segment = raw.split("/")[0].split("?")[0]
        # Check if first segment is IPv4
        try:
            ipaddress.IPv4Address(first_segment.split(":")[0])
            normalize_url(raw)
            return "url"
        except ValueError:
            pass

        if "." in first_segment:
            candidate_labels = first_segment.split(".")
            if len(candidate_labels) >= 2 and RE_TLD.match(candidate_labels[-1]):
                normalize_url(raw)
                return "url"

    raise IdentifierValidationError(
        f"Unable to classify '{raw}'. Input must be a valid Indian phone number, UPI ID, web URL, or email address."
    )


def validate_identifier(value: str, identifier_type: Optional[str] = None) -> Tuple[bool, Optional[str]]:
    """Validate an identifier without raising exceptions.

    Returns:
        (is_valid: bool, error_message: Optional[str])
    """
    try:
        normalize_identifier(value, expected_type=identifier_type)
        return True, None
    except IdentifierValidationError as e:
        return False, e.message
    except Exception as e:
        return False, str(e)


def normalize_identifier(value: str, expected_type: Optional[str] = None) -> NormalizedIdentifier:
    """Primary entry point for identifier processing.

    Validates and normalizes the input into a structured NormalizedIdentifier.

    Args:
        value: Raw identifier string.
        expected_type: Optional explicit type ('phone', 'upi', 'url', 'email'). If None, auto-detected.

    Returns:
        NormalizedIdentifier(identifier_type=..., raw_value=..., normalized_value=...)

    Raises:
        IdentifierValidationError: On invalid or unclassifiable input.
    """
    if not value or not isinstance(value, str):
        raise IdentifierValidationError("Identifier cannot be empty.")

    raw = value.strip()
    if not raw:
        raise IdentifierValidationError("Identifier cannot be empty.")

    if expected_type:
        expected_type_lower = expected_type.lower().strip()
        if expected_type_lower == "phone":
            normalized = normalize_phone(raw)
            return NormalizedIdentifier(
                identifier_type="phone",
                raw_value=raw,
                normalized_value=normalized,
            )
        elif expected_type_lower == "upi":
            normalized = normalize_upi(raw)
            return NormalizedIdentifier(
                identifier_type="upi",
                raw_value=raw,
                normalized_value=normalized,
            )
        elif expected_type_lower == "url":
            normalized = normalize_url(raw)
            return NormalizedIdentifier(
                identifier_type="url",
                raw_value=raw,
                normalized_value=normalized,
            )
        elif expected_type_lower == "email":
            normalized = normalize_email(raw)
            return NormalizedIdentifier(
                identifier_type="email",
                raw_value=raw,
                normalized_value=normalized,
            )
        else:
            raise IdentifierValidationError(
                f"Unsupported expected identifier type: '{expected_type}'. Must be 'phone', 'upi', 'url', or 'email'."
            )

    # Auto-detect type
    detected_type = detect_identifier_type(raw)

    if detected_type == "phone":
        normalized = normalize_phone(raw)
    elif detected_type == "upi":
        normalized = normalize_upi(raw)
    elif detected_type == "url":
        normalized = normalize_url(raw)
    elif detected_type == "email":
        normalized = normalize_email(raw)
    else:
        raise IdentifierValidationError(f"Unknown detected type '{detected_type}'.")

    return NormalizedIdentifier(
        identifier_type=detected_type,
        raw_value=raw,
        normalized_value=normalized,
    )
