from datetime import datetime, timezone
from sqlalchemy import Column, DateTime, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import relationship
from app.core.database import Base


class ScamReport(Base):
    """Primary evidence table recording individual anonymous scam submissions."""

    __tablename__ = "scam_reports"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    identifier_id = Column(Integer, ForeignKey("identifiers.id"), nullable=False)
    area_id = Column(Integer, ForeignKey("areas.id"), nullable=True)
    scam_type = Column(String(50), nullable=False)  # digital_arrest, upi_fraud, fake_kyc, phishing, etc.
    description = Column(Text, nullable=True)
    status = Column(String(30), default="accepted", nullable=False)  # accepted | flagged | duplicate | rate_limited | rejected
    trust_score = Column(Integer, default=50, nullable=False)  # Internal 0–100 confidence score
    reporter_fingerprint_hash = Column(String(128), nullable=True)  # Salted anonymous hash
    source_ip_hash = Column(String(128), nullable=True)  # Hashed subnet / IP context
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    identifier = relationship("Identifier", back_populates="reports")
    area = relationship("Area", back_populates="reports")

    __table_args__ = (
        Index("idx_reports_identifier_status", "identifier_id", "status"),
        Index("idx_reports_area_created", "area_id", "created_at"),
        Index("idx_reports_type_created", "scam_type", "created_at"),
        Index("idx_reports_status_created", "status", "created_at"),
    )
