"""
Database models for users, sessions, and OTP verification.
"""
import enum
from datetime import datetime, timezone
from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, Enum, Text, Float, ForeignKey, Index
)
from sqlalchemy.orm import relationship
from app.db.base import Base, TimestampMixin


class UserRole(str, enum.Enum):
    CUSTOMER = "customer"
    PROVIDER = "provider"
    ADMIN = "admin"


class UserStatus(str, enum.Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"
    PENDING_VERIFICATION = "pending_verification"


class User(Base, TimestampMixin):
    """User model for customers, providers, and admins."""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    phone = Column(String(20), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), nullable=False, index=True)
    is_phone_verified = Column(Boolean, default=False, nullable=False)
    is_email_verified = Column(Boolean, default=False, nullable=False)
    status = Column(Enum(UserStatus), default=UserStatus.PENDING_VERIFICATION, nullable=False)
    profile_photo_url = Column(String(500), nullable=True)

    # Provider-specific fields
    business_name = Column(String(255), nullable=True)
    district = Column(String(100), nullable=True)
    service_categories = Column(Text, nullable=True)  # JSON string of category IDs

    # Relationships
    sessions = relationship("UserSession", back_populates="user", cascade="all, delete-orphan")
    bookings = relationship("Booking", foreign_keys="Booking.customer_id", back_populates="customer")
    reviews_written = relationship("Review", foreign_keys="Review.customer_id", back_populates="customer")
    reviews_received = relationship("Review", foreign_keys="Review.provider_id", back_populates="provider")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")
    saved_locations = relationship("SavedLocation", back_populates="user", cascade="all, delete-orphan")

    # Provider stats
    average_rating = Column(Float, default=0.0)
    total_reviews = Column(Integer, default=0)
    total_bookings_completed = Column(Integer, default=0)
    reliability_score = Column(Float, default=100.0)

    __table_args__ = (
        Index("idx_user_role_status", "role", "status"),
    )


class OTPVerification(Base, TimestampMixin):
    """OTP verification records."""
    __tablename__ = "otp_verifications"

    id = Column(Integer, primary_key=True, autoincrement=True)
    phone = Column(String(20), nullable=False, index=True)
    otp_code = Column(String(6), nullable=False)
    expires_at = Column(DateTime, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)
    attempts = Column(Integer, default=0, nullable=False)
    purpose = Column(String(50), default="registration", nullable=False)  # registration, login, reset

    __table_args__ = (
        Index("idx_otp_phone_purpose", "phone", "purpose"),
    )


class UserSession(Base, TimestampMixin):
    """User session tracking for JWT management."""
    __tablename__ = "user_sessions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    jwt_id = Column(String(255), unique=True, nullable=False, index=True)
    device_name = Column(String(255), nullable=True)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(500), nullable=True)
    last_activity = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    is_active = Column(Boolean, default=True, nullable=False)
    expires_at = Column(DateTime, nullable=False)

    # Relationships
    user = relationship("User", back_populates="sessions")


class Notification(Base, TimestampMixin):
    """Notification records for all user types."""
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    type = Column(String(50), nullable=False)  # booking, payment, system, etc.
    is_read = Column(Boolean, default=False, nullable=False)
    data_json = Column(Text, nullable=True)  # Additional JSON data
    read_at = Column(DateTime, nullable=True)

    # Relationships
    user = relationship("User", back_populates="notifications")

    __table_args__ = (
        Index("idx_notification_user_read", "user_id", "is_read"),
    )


class SavedLocation(Base, TimestampMixin):
    """Saved locations for customers."""
    __tablename__ = "saved_locations"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    label = Column(String(100), nullable=False)  # Home, Office, Other
    address = Column(Text, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    is_default = Column(Boolean, default=False)

    # Relationships
    user = relationship("User", back_populates="saved_locations")
