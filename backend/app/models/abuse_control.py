from datetime import datetime, timezone
from sqlalchemy import Column, DateTime, Index, Integer, String
from app.core.database import Base


class ReporterRateLimit(Base):
    """Anonymous abuse-control record tracking submission frequency windows."""

    __tablename__ = "reporter_rate_limits"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    fingerprint_hash = Column(String(128), nullable=False, index=True)
    window_start = Column(DateTime(timezone=True), nullable=False)
    report_count = Column(Integer, default=1, nullable=False)
    last_report_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    __table_args__ = (
        Index("idx_rate_limit_fingerprint", "fingerprint_hash"),
    )
