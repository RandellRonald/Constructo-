"""
Database models for reviews and review photos.
"""
import enum
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum, Text, Float, ForeignKey, Index
from sqlalchemy.orm import relationship
from app.db.base import Base, TimestampMixin


class ReviewStatus(str, enum.Enum):
    PENDING = "pending"
    SUBMITTED = "submitted"
    EDITED = "edited"
    REPORTED = "reported"
    HIDDEN = "hidden"


class Review(Base, TimestampMixin):
    """Customer reviews for providers."""
    __tablename__ = "reviews"

    id = Column(Integer, primary_key=True, autoincrement=True)
    booking_id = Column(Integer, ForeignKey("bookings.id"), unique=True, nullable=False, index=True)
    customer_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    provider_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    # Ratings (1-5)
    overall_rating = Column(Float, nullable=False)
    professionalism_rating = Column(Float, nullable=True)
    communication_rating = Column(Float, nullable=True)
    service_quality_rating = Column(Float, nullable=True)
    timeliness_rating = Column(Float, nullable=True)

    # Content
    review_text = Column(Text, nullable=True)
    would_recommend = Column(Boolean, nullable=True)
    status = Column(Enum(ReviewStatus), default=ReviewStatus.SUBMITTED, nullable=False)

    # Relationships
    booking = relationship("Booking", back_populates="reviews")
    customer = relationship("User", foreign_keys=[customer_id], back_populates="reviews_written")
    provider = relationship("User", foreign_keys=[provider_id], back_populates="reviews_received")
    photos = relationship("ReviewPhoto", back_populates="review", cascade="all, delete-orphan")


class ReviewPhoto(Base, TimestampMixin):
    """Photos attached to reviews."""
    __tablename__ = "review_photos"

    id = Column(Integer, primary_key=True, autoincrement=True)
    review_id = Column(Integer, ForeignKey("reviews.id", ondelete="CASCADE"), nullable=False, index=True)
    cloudinary_public_id = Column(String(255), nullable=False)
    cloudinary_secure_url = Column(String(500), nullable=False)
    metadata_json = Column(Text, nullable=True)

    # Relationships
    review = relationship("Review", back_populates="photos")
