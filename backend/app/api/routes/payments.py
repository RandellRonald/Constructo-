"""Payment API routes with Razorpay integration."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from pydantic import BaseModel
from typing import Optional

from app.db.session import get_db
from app.api.deps import require_customer
from app.models.user import User
from app.models.booking import Booking, BookingStatus
from app.models.payment import Payment, PaymentStatus, PaymentType, Refund, RefundStatus
from app.schemas.auth import APIResponse
from app.core.config import settings

router = APIRouter()


class CreateOrderRequest(BaseModel):
    booking_id: int
    payment_type: str = "reservation"


class VerifyPaymentRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


class RefundRequest(BaseModel):
    booking_id: int
    reason: Optional[str] = None


@router.post("/create-order", response_model=APIResponse)
async def create_order(
    request: CreateOrderRequest,
    user: User = Depends(require_customer),
    db: AsyncSession = Depends(get_db),
):
    """Create a Razorpay order for payment."""
    result = await db.execute(
        select(Booking).where(Booking.id == request.booking_id, Booking.customer_id == user.id)
    )
    booking = result.scalar_one_or_none()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    amount = float(booking.reservation_fee)
    if booking.is_emergency:
        amount += float(booking.emergency_fee)

    # Create Razorpay order
    razorpay_order = None
    if settings.RAZORPAY_KEY_ID and settings.RAZORPAY_KEY_SECRET:
        import razorpay
        client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))
        razorpay_order = client.order.create({
            "amount": int(amount * 100),  # Amount in paise
            "currency": "INR",
            "receipt": f"rcpt_{booking.booking_number}",
        })

    order_id = razorpay_order["id"] if razorpay_order else f"order_dev_{booking.id}"

    payment = Payment(
        booking_id=booking.id,
        customer_id=user.id,
        razorpay_order_id=order_id,
        payment_type=PaymentType(request.payment_type),
        amount=amount,
        status=PaymentStatus.CREATED,
        receipt=f"rcpt_{booking.booking_number}",
    )
    db.add(payment)
    await db.flush()

    return APIResponse(
        success=True,
        message="Order created",
        data={
            "order_id": order_id,
            "amount": amount,
            "currency": "INR",
            "payment_id": payment.id,
            "razorpay_key": settings.RAZORPAY_KEY_ID,
            "booking_number": booking.booking_number,
        },
    )


@router.post("/verify", response_model=APIResponse)
async def verify_payment(
    request: VerifyPaymentRequest,
    user: User = Depends(require_customer),
    db: AsyncSession = Depends(get_db),
):
    """Verify Razorpay payment signature and activate booking."""
    result = await db.execute(
        select(Payment).where(Payment.razorpay_order_id == request.razorpay_order_id)
    )
    payment = result.scalar_one_or_none()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")

    # Verify signature
    if settings.RAZORPAY_KEY_ID and settings.RAZORPAY_KEY_SECRET:
        import razorpay
        client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))
        try:
            client.utility.verify_payment_signature({
                "razorpay_order_id": request.razorpay_order_id,
                "razorpay_payment_id": request.razorpay_payment_id,
                "razorpay_signature": request.razorpay_signature,
            })
        except Exception:
            payment.status = PaymentStatus.FAILED
            await db.flush()
            raise HTTPException(status_code=400, detail="Payment verification failed")

    # Update payment
    from datetime import datetime, timezone
    payment.razorpay_payment_id = request.razorpay_payment_id
    payment.razorpay_signature = request.razorpay_signature
    payment.status = PaymentStatus.PAID
    payment.paid_at = datetime.now(timezone.utc)

    # Activate booking
    booking_result = await db.execute(
        select(Booking).where(Booking.id == payment.booking_id)
    )
    booking = booking_result.scalar_one_or_none()
    if booking:
        booking.status = BookingStatus.CREATED
        # Generate verification code
        import random
        booking.verification_code = str(random.randint(100000, 999999))
        
        # Trigger provider matching
        from app.services.matching_service import MatchingService
        await MatchingService.match_and_assign(db, booking)

    await db.flush()

    return APIResponse(
        success=True,
        message="Payment verified. Booking activated.",
        data={
            "payment_status": "paid",
            "booking_number": booking.booking_number if booking else None,
            "booking_status": booking.status.value if booking else None,
        },
    )


@router.get("/history", response_model=APIResponse)
async def payment_history(
    user: User = Depends(require_customer),
    db: AsyncSession = Depends(get_db),
):
    """Get customer payment history."""
    result = await db.execute(
        select(Payment).where(Payment.customer_id == user.id).order_by(desc(Payment.created_at)).limit(20)
    )
    payments = result.scalars().all()

    return APIResponse(
        success=True,
        message="Payment history",
        data={
            "payments": [{
                "id": p.id,
                "booking_id": p.booking_id,
                "payment_type": p.payment_type.value,
                "amount": float(p.amount),
                "status": p.status.value,
                "paid_at": p.paid_at.isoformat() if p.paid_at else None,
                "created_at": p.created_at.isoformat() if p.created_at else None,
            } for p in payments]
        },
    )


@router.post("/refunds/request", response_model=APIResponse)
async def request_refund(
    request: RefundRequest,
    user: User = Depends(require_customer),
    db: AsyncSession = Depends(get_db),
):
    """Request a refund for a booking."""
    pay_result = await db.execute(
        select(Payment).where(
            Payment.booking_id == request.booking_id,
            Payment.customer_id == user.id,
            Payment.status == PaymentStatus.PAID,
        )
    )
    payment = pay_result.scalar_one_or_none()
    if not payment:
        raise HTTPException(status_code=404, detail="No paid payment found for this booking")

    refund = Refund(
        booking_id=request.booking_id,
        payment_id=payment.id,
        amount=payment.amount,
        reason=request.reason,
        status=RefundStatus.PENDING,
    )
    db.add(refund)
    await db.flush()

    return APIResponse(
        success=True,
        message="Refund request submitted",
        data={"refund_id": refund.id, "status": "pending"},
    )
