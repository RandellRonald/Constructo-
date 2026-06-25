"""
Database models for provider earnings and payouts.
"""
import enum
from sqlalchemy import (
    Column, Integer, String, DateTime, Enum, Text, ForeignKey, Numeric, Index
)
from sqlalchemy.orm import relationship
from app.db.base import Base, TimestampMixin


class PayoutStatus(str, enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    REJECTED = "rejected"


class EarningType(str, enum.Enum):
    JOB_PAYMENT = "job_payment"
    BONUS = "bonus"
    PENALTY = "penalty"
    REFERRAL = "referral"


class Payout(Base, TimestampMixin):
    """Provider payout requests."""
    __tablename__ = "payouts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    provider_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    amount = Column(Numeric(10, 2), nullable=False)
    status = Column(Enum(PayoutStatus), default=PayoutStatus.PENDING, nullable=False, index=True)
    bank_reference = Column(String(255), nullable=True)
    notes = Column(Text, nullable=True)
    admin_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    requested_at = Column(DateTime, nullable=True)
    processed_at = Column(DateTime, nullable=True)

    # Relationships
    provider = relationship("User", foreign_keys=[provider_id])
    admin = relationship("User", foreign_keys=[admin_id])

    __table_args__ = (
        Index("idx_payout_provider_status", "provider_id", "status"),
    )


class ProviderEarning(Base, TimestampMixin):
    """Individual earning records per booking for providers."""
    __tablename__ = "provider_earnings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    provider_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    booking_id = Column(Integer, ForeignKey("bookings.id"), nullable=True, index=True)
    amount = Column(Numeric(10, 2), nullable=False)
    type = Column(Enum(EarningType), nullable=False)
    description = Column(String(255), nullable=True)

    # Relationships
    provider = relationship("User", foreign_keys=[provider_id])
    booking = relationship("Booking")

    __table_args__ = (
        Index("idx_earning_provider", "provider_id", "created_at"),
    )
