#!/usr/bin/env python3
"""
ScamSentry AI — Hackathon Demo Setup & Verification Utility

This script provides a clean, single-command setup for hackathon judges and developers.
It creates the database, initializes the schema, seeds deterministic demo data,
and verifies all 6 core demo scenarios.

Usage:
    # 1. Quick initialize (auto-seeds if database does not exist or is empty)
    python setup_demo.py

    # 2. Reset back to clean demo state (clears old testing reports and reseeds)
    python setup_demo.py --reset

    # 3. Clean wipe (deletes scamsentry.db and creates fresh)
    python setup_demo.py --clean

    # 4. Verify all 6 demo scenarios directly against the database
    python setup_demo.py --verify
"""

import argparse
import os
import sys
from pathlib import Path

# Locate backend directory regardless of working directory
_ROOT_DIR = Path(__file__).resolve().parent
_BACKEND_DIR = _ROOT_DIR / "backend" if (_ROOT_DIR / "backend").exists() else _ROOT_DIR

if str(_BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(_BACKEND_DIR))

try:
    from app.core.database import Base, DATABASE_URL, SessionLocal, engine
    from app.models.area import Area
    from app.models.identifier import Identifier
    from app.models.scam_report import ScamReport
    from app.models.alert import Alert
    from app.services.seed_data import seed_database, seed_if_empty
    from app.services.risk_service import calculate_risk
    from app.services.identifier_service import normalize_identifier
except ImportError as e:
    print("\n[!] Error: Unable to import ScamSentry backend modules.")
    print("    Please activate the virtual environment first:")
    print("      source backend/.venv/bin/activate")
    print(f"    Details: {e}\n")
    sys.exit(1)


def get_db_file_path() -> Path:
    """Extract SQLite file path from DATABASE_URL."""
    if DATABASE_URL.startswith("sqlite:///"):
        raw_path = DATABASE_URL.replace("sqlite:///", "")
        return Path(raw_path).resolve()
    return _BACKEND_DIR / "scamsentry.db"


def clean_wipe_db():
    """Delete SQLite file to simulate completely clean fresh machine state."""
    db_file = get_db_file_path()
    if db_file.exists():
        try:
            db_file.unlink()
            print(f"[*] Deleted existing database file: {db_file}")
        except Exception as ex:
            print(f"[!] Warning: Could not delete {db_file}: {ex}")
    else:
        print(f"[*] No existing database file found at: {db_file}")


def init_and_seed(reset: bool = False):
    """Ensure tables exist and seed deterministic demo data."""
    print(f"\n{'=' * 65}")
    print("  ScamSentry AI — Database Initialization & Demo Setup")
    print(f"{'=' * 65}")
    print(f"[*] Database file: {get_db_file_path()}")
    print(f"[*] Engine URL:    {DATABASE_URL}")

    # Ensure schema exists
    Base.metadata.create_all(bind=engine)
    print("[+] All database tables initialized successfully.")

    db = SessionLocal()
    try:
        if reset:
            print("[*] Resetting database to clean deterministic demo state...")
            counts = seed_database(db, reset=True)
            print(f"[+] Clean demo state seeded successfully:")
        else:
            existing = db.query(Area).count()
            if existing > 0:
                print(f"[i] Database already contains {existing} areas. Preserving existing data.")
                print("    (Use --reset to force clean demo reset)")
                return
            print("[*] Empty database detected. Seeding initial demo data...")
            counts = seed_if_empty(db)
            print(f"[+] Initial demo state seeded:")

        for entity, count in counts.items():
            print(f"    - {entity.capitalize():<12}: {count}")
    finally:
        db.close()


def verify_demo_scenarios():
    """Verify that all 6 required judge demo scenarios produce expected verdicts."""
    print(f"\n{'-' * 65}")
    print("  Verifying 6 Core Judge Demo Scenarios")
    print(f"{'-' * 65}")

    db = SessionLocal()
    try:
        scenarios = [
            ("98765 43210", "KNOWN_SCAM", "Known Scam Phone"),
            ("91234 56789", "SUSPICIOUS", "Suspicious Phone"),
            ("sbi-kyc-update.in/login", "KNOWN_SCAM", "Phishing URL"),
            ("kyc.update92@okaxis", "NO_REPORTS", "No Reports / Caution UPI"),
            ("1800 123 4567", "VERIFIED_BUSINESS", "Verified Business Phone"),
            ("fraud.merchant@okaxis", "UNDER_REVIEW", "Single Report / Under Review UPI"),
        ]

        verified_registry = {
            "18001234567": "National Banking / Consumer Toll-Free Helpline",
            "1800222244": "State Bank of India Toll-Free Helpline",
            "1930": "National Cyber Crime Reporting Helpline",
        }

        all_passed = True
        for raw_val, expected_verdict, label in scenarios:
            norm = normalize_identifier(raw_val)
            ident = (
                db.query(Identifier)
                .filter(
                    Identifier.identifier_type == norm.identifier_type,
                    Identifier.normalized_value == norm.normalized_value,
                )
                .first()
            )

            is_verified = (
                norm.normalized_value in verified_registry
                or (norm.identifier_type == "phone" and norm.normalized_value.startswith("1800"))
            )

            if ident:
                reports = (
                    db.query(ScamReport)
                    .filter(ScamReport.identifier_id == ident.id, ScamReport.status == "accepted")
                    .all()
                )
            else:
                reports = []

            if is_verified and len(reports) == 0:
                risk = calculate_risk(
                    reports,
                    is_verified_business=True,
                    verified_business_name=verified_registry.get(norm.normalized_value, "Official Helpline"),
                    raw_query=raw_val,
                    target_type=norm.identifier_type,
                    normalized_val=norm.normalized_value,
                )
            else:
                risk = calculate_risk(
                    reports,
                    raw_query=raw_val,
                    target_type=norm.identifier_type,
                    normalized_val=norm.normalized_value,
                )

            passed = risk.verdict == expected_verdict
            status_symbol = "[✓]" if passed else "[✗]"
            if not passed:
                all_passed = False

            print(
                f"  {status_symbol} {label:<36} | Expected: {expected_verdict:<17} | Got: {risk.verdict:<17} "
                f"(Reports: {risk.report_count}, Score: {risk.risk_score})"
            )

        print(f"{'-' * 65}")
        if all_passed:
            print("[+] ALL 6 CORE DEMO SCENARIOS VERIFIED SUCCESSFULLY!")
        else:
            print("[!] Warning: Some scenarios did not match expected verdicts. Run with --reset.")
    finally:
        db.close()


def print_quickstart():
    """Print next steps for starting backend and frontend."""
    print(f"\n{'=' * 65}")
    print("  Quickstart Commands for Hackathon Demonstration")
    print(f"{'=' * 65}")
    print("1. Start Backend Server:")
    print("   cd backend")
    print("   source .venv/bin/activate")
    print("   uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload")
    print()
    print("2. Start Frontend App (in a separate terminal):")
    print("   cd frontend")
    print("   npm run dev")
    print()
    print("3. Open Browser:")
    print("   http://localhost:3000")
    print("   API Docs: http://127.0.0.1:8000/docs")
    print(f"{'=' * 65}\n")


def main():
    parser = argparse.ArgumentParser(
        description="ScamSentry AI Demo Setup & Verification Tool",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument(
        "--reset",
        action="store_true",
        help="Reset database and seed clean deterministic demo data.",
    )
    parser.add_argument(
        "--clean",
        action="store_true",
        help="Wipe scamsentry.db completely and rebuild from scratch.",
    )
    parser.add_argument(
        "--verify",
        action="store_true",
        help="Verify all 6 core demo scenarios against the database.",
    )

    args = parser.parse_args()

    if args.clean:
        clean_wipe_db()
        init_and_seed(reset=True)
        verify_demo_scenarios()
    elif args.reset:
        init_and_seed(reset=True)
        verify_demo_scenarios()
    elif args.verify:
        verify_demo_scenarios()
    else:
        init_and_seed(reset=False)
        verify_demo_scenarios()

    print_quickstart()


if __name__ == "__main__":
    main()
