"""
Database model for chat messages.
"""
from sqlalchemy import Column, Integer, Text, ForeignKey, Index
from sqlalchemy.orm import relationship
from app.db.base import Base, TimestampMixin

class ChatMessage(Base, TimestampMixin):
    """Stores in-app chat messages between customer and provider."""
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, autoincrement=True)
    booking_id = Column(Integer, ForeignKey("bookings.id", ondelete="CASCADE"), nullable=False, index=True)
    sender_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    message = Column(Text, nullable=False)

    # Relationships
    booking = relationship("Booking")
    sender = relationship("User")

    __table_args__ = (
        Index("idx_chat_booking_time", "booking_id", "created_at"),
    )
