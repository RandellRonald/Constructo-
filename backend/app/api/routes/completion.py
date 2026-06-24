"""Completion and invoice API routes."""
from datetime import datetime, timezone
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional, List
import uuid

from app.db.session import get_db
from app.api.deps import require_customer, require_provider
from app.models.user import User
from app.models.booking import Booking, BookingStatus, OvertimeCharge
from app.models.invoice import Invoice
from app.schemas.auth import APIResponse

router = APIRouter()


class CompleteJobRequest(BaseModel):
    actual_hours: float
    completion_notes: Optional[str] = None
    photo_urls: Optional[List[dict]] = None


class ConfirmCompletionRequest(BaseModel):
    confirmed: bool = True


@router.post("/bookings/{booking_id}/complete", response_model=APIResponse)
async def complete_job(
    booking_id: int,
    request: CompleteJobRequest,
    user: User = Depends(require_provider),
    db: AsyncSession = Depends(get_db),
):
    """Provider marks job as complete."""
    result = await db.execute(
        select(Booking).where(Booking.id == booking_id, Booking.provider_id == user.id)
    )
    booking = result.scalar_one_or_none()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    booking.service_completed_at = datetime.now(timezone.utc)
    booking.completion_notes = request.completion_notes
    booking.completion_status = "pending"

    # Calculate overtime
    overtime_data = None
    if request.actual_hours > booking.duration_hours:
        extra = request.actual_hours - booking.duration_hours
        from app.models.booking import ServiceCategory
        cat_result = await db.execute(
            select(ServiceCategory).where(ServiceCategory.id == booking.service_category_id)
        )
        category = cat_result.scalar_one_or_none()
        overtime_rate = Decimal(str(float(category.overtime_hourly_rate))) if category else Decimal("0")
        overtime_amount = Decimal(str(extra)) * overtime_rate

        ot = OvertimeCharge(
            booking_id=booking.id,
            booked_hours=booking.duration_hours,
            actual_hours=request.actual_hours,
            extra_hours=extra,
            overtime_rate=overtime_rate,
            overtime_amount=overtime_amount,
        )
        db.add(ot)
        overtime_data = {"extra_hours": extra, "overtime_amount": float(overtime_amount)}

    await db.flush()

    return APIResponse(
        success=True,
        message="Job marked as complete",
        data={"overtime": overtime_data},
    )


@router.get("/bookings/{booking_id}/summary", response_model=APIResponse)
async def get_completion_summary(
    booking_id: int,
    user: User = Depends(require_customer),
    db: AsyncSession = Depends(get_db),
):
    """Get completion summary for customer review."""
    result = await db.execute(
        select(Booking).where(Booking.id == booking_id, Booking.customer_id == user.id)
    )
    booking = result.scalar_one_or_none()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    ot_result = await db.execute(
        select(OvertimeCharge).where(OvertimeCharge.booking_id == booking_id)
    )
    overtime = ot_result.scalar_one_or_none()

    return APIResponse(
        success=True,
        message="Completion summary",
        data={
            "booking_number": booking.booking_number,
            "duration_hours": booking.duration_hours,
            "estimated_price": float(booking.estimated_price),
            "completion_notes": booking.completion_notes,
            "overtime": {
                "booked_hours": overtime.booked_hours,
                "actual_hours": overtime.actual_hours,
                "extra_hours": overtime.extra_hours,
                "overtime_amount": float(overtime.overtime_amount),
            } if overtime else None,
        },
    )


@router.post("/bookings/{booking_id}/confirm", response_model=APIResponse)
async def confirm_completion(
    booking_id: int,
    request: ConfirmCompletionRequest,
    user: User = Depends(require_customer),
    db: AsyncSession = Depends(get_db),
):
    """Customer confirms job completion."""
    result = await db.execute(
        select(Booking).where(Booking.id == booking_id, Booking.customer_id == user.id)
    )
    booking = result.scalar_one_or_none()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    booking.status = BookingStatus.COMPLETED
    booking.completed_at = datetime.now(timezone.utc)
    booking.customer_confirmed_at = datetime.now(timezone.utc)
    booking.completion_status = "completed"

    # Generate invoice
    invoice_number = f"INV-{uuid.uuid4().hex[:8].upper()}"
    subtotal = booking.estimated_price
    tax = Decimal(str(float(subtotal) * 0.18))
    total = subtotal + tax

    invoice = Invoice(
        booking_id=booking.id,
        invoice_number=invoice_number,
        subtotal=subtotal,
        tax_amount=tax,
        total_amount=total,
    )
    db.add(invoice)
    await db.flush()

    return APIResponse(
        success=True,
        message="Booking completed. Invoice generated.",
        data={"invoice_number": invoice_number, "total_amount": float(total)},
    )


@router.get("/invoices/{booking_id}", response_model=APIResponse)
async def get_invoice(
    booking_id: int,
    user: User = Depends(require_customer),
    db: AsyncSession = Depends(get_db),
):
    """Get invoice for a booking."""
    result = await db.execute(
        select(Invoice).where(Invoice.booking_id == booking_id)
    )
    invoice = result.scalar_one_or_none()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    return APIResponse(
        success=True,
        message="Invoice retrieved",
        data={
            "invoice_number": invoice.invoice_number,
            "subtotal": float(invoice.subtotal),
            "tax_amount": float(invoice.tax_amount),
            "total_amount": float(invoice.total_amount),
            "status": invoice.status,
            "created_at": invoice.created_at.isoformat() if invoice.created_at else None,
        },
    )
