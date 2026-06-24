"""
Database models for GPS tracking logs.
"""
from sqlalchemy import Column, Integer, Float, DateTime, ForeignKey, Index
from sqlalchemy.orm import relationship
from app.db.base import Base


class TrackingLog(Base):
    """Real-time GPS tracking logs for providers."""
    __tablename__ = "tracking_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    booking_id = Column(Integer, ForeignKey("bookings.id", ondelete="CASCADE"), nullable=False, index=True)
    provider_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    speed = Column(Float, nullable=True)
    heading = Column(Float, nullable=True)
    recorded_at = Column(DateTime, nullable=False)

    # Relationships
    booking = relationship("Booking", back_populates="tracking_logs")

    __table_args__ = (
        Index("idx_tracking_booking_time", "booking_id", "recorded_at"),
    )
