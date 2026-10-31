from datetime import datetime, timezone
from sqlalchemy import Column, DateTime, Index, Integer, String, UniqueConstraint
from sqlalchemy.orm import relationship
from app.core.database import Base


class Identifier(Base):
    """Normalized entities (phone, upi, url) for lookup and reporting."""

    __tablename__ = "identifiers"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    identifier_type = Column(String(20), nullable=False)  # phone | upi | url
    raw_value = Column(String(500), nullable=True)  # Raw user-submitted string
    normalized_value = Column(String(500), nullable=False, index=True)  # Canonical lookup form
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
    reports = relationship("ScamReport", back_populates="identifier", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("identifier_type", "normalized_value", name="uq_identifier_type_normalized"),
        Index("idx_identifiers_lookup", "identifier_type", "normalized_value"),
    )
