from datetime import datetime, timezone
from sqlalchemy import Column, DateTime, Integer, String
from app.core.database import Base


class LicenceState(Base):
    """Dynamic licence state for hackathon evaluation and tier management."""

    __tablename__ = "licence_state"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    license_key_hash = Column(String(255), nullable=True)
    status = Column(String(20), default="active", nullable=False)  # active | expired | invalid
    issued_at = Column(DateTime(timezone=True), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
