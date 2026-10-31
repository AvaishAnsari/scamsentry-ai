from datetime import datetime, timezone
from sqlalchemy import Column, DateTime, Float, Index, Integer, String
from sqlalchemy.orm import relationship
from app.core.database import Base


class Area(Base):
    """Approximate geographic area for privacy-preserving aggregation."""

    __tablename__ = "areas"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(255), nullable=False)  # Locality / area name
    city = Column(String(100), nullable=True, index=True)
    state = Column(String(100), nullable=True)
    pincode = Column(String(10), nullable=True, index=True)
    latitude = Column(Float, nullable=True)  # Approximate area centroid
    longitude = Column(Float, nullable=True)  # Approximate area centroid
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    reports = relationship("ScamReport", back_populates="area")
    alerts = relationship("Alert", back_populates="area")

    __table_args__ = (
        Index("idx_areas_pincode", "pincode"),
        Index("idx_areas_city", "city"),
    )
