"""
Database model for support tickets and disputes.
"""
from sqlalchemy import Column, Integer, Text, String, ForeignKey, Enum
from sqlalchemy.orm import relationship
from app.db.base import Base, TimestampMixin
import enum

class TicketStatus(enum.Enum):
    PENDING = "pending"
    UNDER_REVIEW = "under_review"
    RESOLVED = "resolved"
    REJECTED = "rejected"

class SupportTicket(Base, TimestampMixin):
    """Stores support tickets and disputes."""
    __tablename__ = "support_tickets"

    id = Column(Integer, primary_key=True, autoincrement=True)
    booking_id = Column(Integer, ForeignKey("bookings.id", ondelete="CASCADE"), nullable=False, index=True)
    dispute_reason = Column(String(255), nullable=False)
    status = Column(Enum(TicketStatus), default=TicketStatus.PENDING, nullable=False, index=True)
    assigned_admin_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    # Relationships
    booking = relationship("Booking")
    assigned_admin = relationship("User")
