from datetime import datetime, timezone
from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import relationship
from app.core.database import Base


class Alert(Base):
    """Anomaly alert generated from aggregated spikes or novel fraud types."""

    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    area_id = Column(Integer, ForeignKey("areas.id"), nullable=False)
    alert_type = Column(String(30), nullable=False)  # spike | new_type
    severity = Column(String(20), nullable=False)  # low | medium | high
    scam_type = Column(String(50), nullable=True)  # Associated scam category
    current_count = Column(Integer, default=0, nullable=False)  # Observation count in trigger window
    baseline_count = Column(Float, default=0.0, nullable=False)  # Historical comparison baseline
    anomaly_score = Column(Float, default=0.0, nullable=False)  # Computed anomaly metric
    message = Column(Text, nullable=True)  # Human-readable explanation
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    area = relationship("Area", back_populates="alerts")

    __table_args__ = (
        Index("idx_alerts_area_active", "area_id", "is_active"),
        Index("idx_alerts_created", "created_at"),
    )
