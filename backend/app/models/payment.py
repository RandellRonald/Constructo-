"""
Database models for payments and refunds.
"""
import enum
from sqlalchemy import Column, Integer, String, DateTime, Enum, Text, Float, ForeignKey, Numeric
from sqlalchemy.orm import relationship
from app.db.base import Base, TimestampMixin


class PaymentStatus(str, enum.Enum):
    CREATED = "created"
    PENDING = "pending"
    PAID = "paid"
    FAILED = "failed"
    REFUNDED = "refunded"
    PARTIALLY_REFUNDED = "partially_refunded"
    CANCELLED = "cancelled"


class PaymentType(str, enum.Enum):
    RESERVATION = "reservation"
    EMERGENCY = "emergency"
    OVERTIME = "overtime"
    ADDITIONAL = "additional"
    PENALTY = "penalty"


class RefundStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    PROCESSING = "processing"
    COMPLETED = "completed"
    REJECTED = "rejected"


class Payment(Base, TimestampMixin):
    """Payment records linked to Razorpay."""
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, autoincrement=True)
    booking_id = Column(Integer, ForeignKey("bookings.id"), nullable=False, index=True)
    customer_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    # Razorpay fields
    razorpay_order_id = Column(String(255), unique=True, nullable=True, index=True)
    razorpay_payment_id = Column(String(255), unique=True, nullable=True)
    razorpay_signature = Column(String(500), nullable=True)

    # Payment details
    payment_type = Column(Enum(PaymentType), nullable=False)
    amount = Column(Numeric(10, 2), nullable=False)
    currency = Column(String(10), default="INR", nullable=False)
    status = Column(Enum(PaymentStatus), default=PaymentStatus.CREATED, nullable=False, index=True)
    paid_at = Column(DateTime, nullable=True)
    receipt = Column(String(255), nullable=True)

    # Relationships
    booking = relationship("Booking", back_populates="payments")
    customer = relationship("User")
    refunds = relationship("Refund", back_populates="payment", cascade="all, delete-orphan")


class Refund(Base, TimestampMixin):
    """Refund records."""
    __tablename__ = "refunds"

    id = Column(Integer, primary_key=True, autoincrement=True)
    booking_id = Column(Integer, ForeignKey("bookings.id"), nullable=False, index=True)
    payment_id = Column(Integer, ForeignKey("payments.id"), nullable=False, index=True)
    amount = Column(Numeric(10, 2), nullable=False)
    reason = Column(Text, nullable=True)
    status = Column(Enum(RefundStatus), default=RefundStatus.PENDING, nullable=False)
    admin_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    razorpay_refund_id = Column(String(255), nullable=True)
    processed_at = Column(DateTime, nullable=True)

    # Relationships
    payment = relationship("Payment", back_populates="refunds")
