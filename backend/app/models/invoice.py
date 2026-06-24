"""
Database models for invoices.
"""
from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, Numeric
from sqlalchemy.orm import relationship
from app.db.base import Base, TimestampMixin


class Invoice(Base, TimestampMixin):
    """Invoice records for completed bookings."""
    __tablename__ = "invoices"

    id = Column(Integer, primary_key=True, autoincrement=True)
    booking_id = Column(Integer, ForeignKey("bookings.id"), unique=True, nullable=False, index=True)
    invoice_number = Column(String(50), unique=True, nullable=False, index=True)
    subtotal = Column(Numeric(10, 2), nullable=False)
    tax_amount = Column(Numeric(10, 2), nullable=False, default=0)
    total_amount = Column(Numeric(10, 2), nullable=False)
    pdf_url = Column(String(500), nullable=True)
    status = Column(String(50), default="generated")  # generated, downloaded, sent

    # Relationships
    booking = relationship("Booking", back_populates="invoice")
