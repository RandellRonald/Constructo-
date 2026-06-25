"""
Database models for bookings, photos, service categories, and pricing.
"""
import enum
from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, Enum, Text, Float,
    ForeignKey, Index, Numeric
)
from sqlalchemy.orm import relationship
from app.db.base import Base, TimestampMixin


class BookingStatus(str, enum.Enum):
    DRAFT = "draft"
    PAYMENT_PENDING = "payment_pending"
    CREATED = "created"
    SEARCHING = "searching"
    ASSIGNED = "assigned"
    EN_ROUTE = "en_route"
    ARRIVED = "arrived"
    VERIFIED = "verified"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    NO_PROVIDER = "no_provider"


class ServiceCategory(Base, TimestampMixin):
    """Service categories available on the platform."""
    __tablename__ = "service_categories"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False, unique=True)
    slug = Column(String(255), nullable=False, unique=True, index=True)
    description = Column(Text, nullable=True)
    icon = Column(String(100), nullable=True)
    image_url = Column(String(500), nullable=True)
    is_active = Column(Boolean, default=True)
    sort_order = Column(Integer, default=0)

    # Pricing
    base_hourly_rate = Column(Numeric(10, 2), nullable=False, default=0)
    overtime_hourly_rate = Column(Numeric(10, 2), nullable=False, default=0)
    emergency_fee = Column(Numeric(10, 2), nullable=False, default=0)
    reservation_fee = Column(Numeric(10, 2), nullable=False, default=200)

    # Relationships
    bookings = relationship("Booking", back_populates="service_category")
    pricing_rules = relationship("PricingRule", back_populates="service_category", cascade="all, delete-orphan")


class Booking(Base, TimestampMixin):
    """Core booking model."""
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    booking_number = Column(String(20), unique=True, nullable=False, index=True)
    customer_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    provider_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    service_category_id = Column(Integer, ForeignKey("service_categories.id"), nullable=False)

    # Location
    pickup_address = Column(Text, nullable=False)
    pickup_latitude = Column(Float, nullable=False)
    pickup_longitude = Column(Float, nullable=False)

    # Service details
    description = Column(Text, nullable=True)
    duration_hours = Column(Float, nullable=False)
    is_emergency = Column(Boolean, default=False)

    # Pricing
    estimated_price = Column(Numeric(10, 2), nullable=False, default=0)
    reservation_fee = Column(Numeric(10, 2), nullable=False, default=0)
    emergency_fee = Column(Numeric(10, 2), nullable=False, default=0)
    final_amount = Column(Numeric(10, 2), nullable=True)

    # Status
    status = Column(Enum(BookingStatus), default=BookingStatus.DRAFT, nullable=False, index=True)

    # Verification
    verification_code = Column(String(6), nullable=True)
    verification_status = Column(String(20), default="pending")
    verification_verified_at = Column(DateTime, nullable=True)

    # Timestamps
    provider_assigned_at = Column(DateTime, nullable=True)
    provider_arrived_at = Column(DateTime, nullable=True)
    service_started_at = Column(DateTime, nullable=True)
    service_completed_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    customer_confirmed_at = Column(DateTime, nullable=True)
    cancelled_at = Column(DateTime, nullable=True)

    # Completion
    completion_notes = Column(Text, nullable=True)
    completion_status = Column(String(50), nullable=True)

    # Relationships
    customer = relationship("User", foreign_keys=[customer_id], back_populates="bookings")
    provider = relationship("User", foreign_keys=[provider_id])
    service_category = relationship("ServiceCategory", back_populates="bookings")
    photos = relationship("BookingPhoto", back_populates="booking", cascade="all, delete-orphan")
    completion_photos = relationship("CompletionPhoto", back_populates="booking", cascade="all, delete-orphan")
    payments = relationship("Payment", back_populates="booking", cascade="all, delete-orphan")
    tracking_logs = relationship("TrackingLog", back_populates="booking", cascade="all, delete-orphan")
    reviews = relationship("Review", back_populates="booking")
    overtime_charges = relationship("OvertimeCharge", back_populates="booking", cascade="all, delete-orphan")
    invoice = relationship("Invoice", back_populates="booking", uselist=False)

    __table_args__ = (
        Index("idx_booking_customer_status", "customer_id", "status"),
        Index("idx_booking_provider_status", "provider_id", "status"),
    )


class BookingPhoto(Base, TimestampMixin):
    """Photos uploaded with booking requests."""
    __tablename__ = "booking_photos"

    id = Column(Integer, primary_key=True, autoincrement=True)
    booking_id = Column(Integer, ForeignKey("bookings.id", ondelete="CASCADE"), nullable=False, index=True)
    cloudinary_public_id = Column(String(255), nullable=False)
    cloudinary_secure_url = Column(String(500), nullable=False)
    metadata_json = Column(Text, nullable=True)

    # Relationships
    booking = relationship("Booking", back_populates="photos")


class CompletionPhoto(Base, TimestampMixin):
    """Photos uploaded as proof of completion."""
    __tablename__ = "completion_photos"

    id = Column(Integer, primary_key=True, autoincrement=True)
    booking_id = Column(Integer, ForeignKey("bookings.id", ondelete="CASCADE"), nullable=False, index=True)
    cloudinary_public_id = Column(String(255), nullable=False)
    cloudinary_secure_url = Column(String(500), nullable=False)
    metadata_json = Column(Text, nullable=True)

    # Relationships
    booking = relationship("Booking", back_populates="completion_photos")


class PricingRule(Base, TimestampMixin):
    """Dynamic pricing rules per service category."""
    __tablename__ = "pricing_rules"

    id = Column(Integer, primary_key=True, autoincrement=True)
    service_category_id = Column(Integer, ForeignKey("service_categories.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    rule_type = Column(String(50), nullable=False)  # base, overtime, emergency, surge
    multiplier = Column(Float, default=1.0)
    flat_fee = Column(Numeric(10, 2), default=0)
    is_active = Column(Boolean, default=True)

    # Relationships
    service_category = relationship("ServiceCategory", back_populates="pricing_rules")


class OvertimeCharge(Base, TimestampMixin):
    """Overtime charge calculations."""
    __tablename__ = "overtime_charges"

    id = Column(Integer, primary_key=True, autoincrement=True)
    booking_id = Column(Integer, ForeignKey("bookings.id", ondelete="CASCADE"), nullable=False, index=True)
    booked_hours = Column(Float, nullable=False)
    actual_hours = Column(Float, nullable=False)
    extra_hours = Column(Float, nullable=False)
    overtime_rate = Column(Numeric(10, 2), nullable=False)
    overtime_amount = Column(Numeric(10, 2), nullable=False)

    # Relationships
    booking = relationship("Booking", back_populates="overtime_charges")


class OfferStatus(str, enum.Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    DECLINED = "declined"
    EXPIRED = "expired"


class BookingDispatchOffer(Base, TimestampMixin):
    """Offers sent to individual providers for bookings."""
    __tablename__ = "booking_dispatch_offers"

    id = Column(Integer, primary_key=True, autoincrement=True)
    booking_id = Column(Integer, ForeignKey("bookings.id", ondelete="CASCADE"), nullable=False, index=True)
    provider_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    status = Column(Enum(OfferStatus), default=OfferStatus.PENDING, nullable=False, index=True)
    expires_at = Column(DateTime, nullable=False)

    # Relationships
    booking = relationship("Booking")
    provider = relationship("User")

