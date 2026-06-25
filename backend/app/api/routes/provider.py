"""
Provider dashboard, jobs, wallet, and status API routes.
"""
from datetime import datetime, timezone, timedelta
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, and_, case
from pydantic import BaseModel, Field
from typing import Optional

from app.db.session import get_db
from app.api.deps import require_provider
from app.models.user import User
from app.models.booking import Booking, BookingStatus, BookingDispatchOffer, OfferStatus
from app.models.payment import Payment, PaymentStatus
from app.models.payout import Payout, ProviderEarning, PayoutStatus
from app.schemas.auth import APIResponse

router = APIRouter()


# ─── Request Schemas ──────────────────────────────────────────────

class UpdateJobStatusRequest(BaseModel):
    status: str = Field(..., pattern="^(en_route|arrived|verified|in_progress|completed)$")
    verification_code: Optional[str] = None
    actual_hours: Optional[float] = None
    completion_notes: Optional[str] = None


class PayoutRequest(BaseModel):
    amount: float = Field(..., gt=0)
    notes: Optional[str] = None


class RespondToOfferRequest(BaseModel):
    action: str = Field(..., pattern="^(accept|decline)$")


class BankDetailsRequest(BaseModel):
    bank_name: str = Field(..., min_length=2, max_length=255)
    bank_account_number: str = Field(..., min_length=5, max_length=255)
    bank_ifsc: str = Field(..., min_length=5, max_length=50)
    bank_account_name: str = Field(..., min_length=2, max_length=255)


# ─── Helper: serialize booking for provider ──────────────────────

def _serialize_provider_booking(b: Booking) -> dict:
    return {
        "id": b.id,
        "booking_number": b.booking_number,
        "service_category_id": b.service_category_id,
        "pickup_address": b.pickup_address,
        "pickup_latitude": b.pickup_latitude,
        "pickup_longitude": b.pickup_longitude,
        "description": b.description,
        "duration_hours": b.duration_hours,
        "estimated_price": float(b.estimated_price) if b.estimated_price else 0,
        "final_amount": float(b.final_amount) if b.final_amount else None,
        "status": b.status.value,
        "is_emergency": b.is_emergency,
        "verification_code": b.verification_code,
        "customer_id": b.customer_id,
        "created_at": b.created_at.isoformat() if b.created_at else None,
        "provider_assigned_at": b.provider_assigned_at.isoformat() if b.provider_assigned_at else None,
        "service_started_at": b.service_started_at.isoformat() if b.service_started_at else None,
        "service_completed_at": b.service_completed_at.isoformat() if b.service_completed_at else None,
        "completed_at": b.completed_at.isoformat() if b.completed_at else None,
    }


# ─── Provider Dashboard ──────────────────────────────────────────

@router.get("/provider/dashboard", response_model=APIResponse)
async def get_provider_dashboard(
    user: User = Depends(require_provider),
    db: AsyncSession = Depends(get_db),
):
    """Get provider dashboard with aggregated stats."""
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

    # Today's completed count
    today_completed = await db.execute(
        select(func.count(Booking.id)).where(
            Booking.provider_id == user.id,
            Booking.status == BookingStatus.COMPLETED,
            Booking.completed_at >= today_start,
        )
    )
    today_completed_count = today_completed.scalar() or 0

    # Today's earnings
    today_earnings_result = await db.execute(
        select(func.coalesce(func.sum(ProviderEarning.amount), 0)).where(
            ProviderEarning.provider_id == user.id,
            ProviderEarning.created_at >= today_start,
        )
    )
    today_earnings = float(today_earnings_result.scalar() or 0)

    # Total earnings (all time)
    total_earnings_result = await db.execute(
        select(func.coalesce(func.sum(ProviderEarning.amount), 0)).where(
            ProviderEarning.provider_id == user.id,
        )
    )
    total_earnings = float(total_earnings_result.scalar() or 0)

    # Pending payout balance
    paid_out_result = await db.execute(
        select(func.coalesce(func.sum(Payout.amount), 0)).where(
            Payout.provider_id == user.id,
            Payout.status == PayoutStatus.COMPLETED,
        )
    )
    paid_out = float(paid_out_result.scalar() or 0)
    wallet_balance = total_earnings - paid_out

    # Active job
    active_result = await db.execute(
        select(Booking).where(
            Booking.provider_id == user.id,
            Booking.status.in_([
                BookingStatus.ASSIGNED, BookingStatus.EN_ROUTE,
                BookingStatus.ARRIVED, BookingStatus.VERIFIED,
                BookingStatus.IN_PROGRESS,
            ])
        ).order_by(desc(Booking.created_at)).limit(1)
    )
    active_booking = active_result.scalar_one_or_none()

    # Recent bookings (last 5)
    recent_result = await db.execute(
        select(Booking).where(
            Booking.provider_id == user.id,
        ).order_by(desc(Booking.created_at)).limit(5)
    )
    recent_bookings = recent_result.scalars().all()

    return APIResponse(
        success=True,
        message="Provider dashboard loaded",
        data={
            "stats": {
                "today_completed": today_completed_count,
                "today_earnings": today_earnings,
                "total_earnings": total_earnings,
                "wallet_balance": wallet_balance,
                "average_rating": user.average_rating or 0,
                "total_reviews": user.total_reviews or 0,
                "total_bookings_completed": user.total_bookings_completed or 0,
                "reliability_score": user.reliability_score or 100.0,
            },
            "active_job": _serialize_provider_booking(active_booking) if active_booking else None,
            "recent_bookings": [_serialize_provider_booking(b) for b in recent_bookings],
        },
    )


# ─── Active Job ──────────────────────────────────────────────────

@router.get("/provider/active-job", response_model=APIResponse)
async def get_active_job(
    user: User = Depends(require_provider),
    db: AsyncSession = Depends(get_db),
):
    """Get provider's current active job."""
    result = await db.execute(
        select(Booking).where(
            Booking.provider_id == user.id,
            Booking.status.in_([
                BookingStatus.ASSIGNED, BookingStatus.EN_ROUTE,
                BookingStatus.ARRIVED, BookingStatus.VERIFIED,
                BookingStatus.IN_PROGRESS,
            ])
        ).order_by(desc(Booking.created_at)).limit(1)
    )
    booking = result.scalar_one_or_none()

    if not booking:
        return APIResponse(success=True, message="No active job", data=None)

    # Get customer info
    customer_result = await db.execute(
        select(User).where(User.id == booking.customer_id)
    )
    customer = customer_result.scalar_one_or_none()

    job_data = _serialize_provider_booking(booking)
    if customer:
        job_data["customer"] = {
            "id": customer.id,
            "name": customer.name,
            "phone": customer.phone,
            "profile_photo_url": customer.profile_photo_url,
        }

    return APIResponse(
        success=True,
        message="Active job found",
        data=job_data,
    )


# ─── Job History ─────────────────────────────────────────────────

@router.get("/provider/jobs", response_model=APIResponse)
async def get_job_history(
    user: User = Depends(require_provider),
    db: AsyncSession = Depends(get_db),
    filter: Optional[str] = Query(None, pattern="^(today|week|month)$"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
):
    """Get provider's job history with optional time filter."""
    now = datetime.now(timezone.utc)
    query = select(Booking).where(Booking.provider_id == user.id)

    if filter == "today":
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        query = query.where(Booking.created_at >= today_start)
    elif filter == "week":
        week_start = now - timedelta(days=7)
        query = query.where(Booking.created_at >= week_start)
    elif filter == "month":
        month_start = now - timedelta(days=30)
        query = query.where(Booking.created_at >= month_start)

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Paginate
    offset = (page - 1) * limit
    result = await db.execute(
        query.order_by(desc(Booking.created_at)).offset(offset).limit(limit)
    )
    bookings = result.scalars().all()

    return APIResponse(
        success=True,
        message="Job history retrieved",
        data={
            "jobs": [_serialize_provider_booking(b) for b in bookings],
            "total": total,
            "page": page,
            "limit": limit,
            "total_pages": (total + limit - 1) // limit if total > 0 else 0,
        },
    )


# ─── Wallet ──────────────────────────────────────────────────────

@router.get("/provider/wallet", response_model=APIResponse)
async def get_wallet(
    user: User = Depends(require_provider),
    db: AsyncSession = Depends(get_db),
):
    """Get provider's wallet: balance, pending payouts, recent transactions."""
    # Total earnings
    total_earnings_result = await db.execute(
        select(func.coalesce(func.sum(ProviderEarning.amount), 0)).where(
            ProviderEarning.provider_id == user.id,
        )
    )
    total_earnings = float(total_earnings_result.scalar() or 0)

    # Completed payouts
    paid_out_result = await db.execute(
        select(func.coalesce(func.sum(Payout.amount), 0)).where(
            Payout.provider_id == user.id,
            Payout.status == PayoutStatus.COMPLETED,
        )
    )
    paid_out = float(paid_out_result.scalar() or 0)

    # Pending payouts
    pending_result = await db.execute(
        select(func.coalesce(func.sum(Payout.amount), 0)).where(
            Payout.provider_id == user.id,
            Payout.status.in_([PayoutStatus.PENDING, PayoutStatus.PROCESSING]),
        )
    )
    pending_payout = float(pending_result.scalar() or 0)

    balance = total_earnings - paid_out - pending_payout

    # Recent earnings
    earnings_result = await db.execute(
        select(ProviderEarning).where(
            ProviderEarning.provider_id == user.id,
        ).order_by(desc(ProviderEarning.created_at)).limit(20)
    )
    earnings = earnings_result.scalars().all()

    # Recent payouts
    payouts_result = await db.execute(
        select(Payout).where(
            Payout.provider_id == user.id,
        ).order_by(desc(Payout.created_at)).limit(10)
    )
    payouts = payouts_result.scalars().all()

    return APIResponse(
        success=True,
        message="Wallet loaded",
        data={
            "balance": balance,
            "total_earnings": total_earnings,
            "total_paid_out": paid_out,
            "pending_payout": pending_payout,
            "recent_earnings": [{
                "id": e.id,
                "booking_id": e.booking_id,
                "amount": float(e.amount),
                "type": e.type.value,
                "description": e.description,
                "created_at": e.created_at.isoformat() if e.created_at else None,
            } for e in earnings],
            "payouts": [{
                "id": p.id,
                "amount": float(p.amount),
                "status": p.status.value,
                "notes": p.notes,
                "requested_at": p.requested_at.isoformat() if p.requested_at else None,
                "processed_at": p.processed_at.isoformat() if p.processed_at else None,
                "created_at": p.created_at.isoformat() if p.created_at else None,
            } for p in payouts],
        },
    )


# ─── Request Payout ──────────────────────────────────────────────

@router.post("/provider/payout", response_model=APIResponse)
async def request_payout(
    request: PayoutRequest,
    user: User = Depends(require_provider),
    db: AsyncSession = Depends(get_db),
):
    """Request a payout from wallet balance."""
    # Check bank details setup
    if not user.bank_account_number or not user.bank_ifsc or not user.bank_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please set up your bank details in your wallet settings before requesting a payout.",
        )

    # Calculate available balance
    total_earnings_result = await db.execute(
        select(func.coalesce(func.sum(ProviderEarning.amount), 0)).where(
            ProviderEarning.provider_id == user.id,
        )
    )
    total_earnings = float(total_earnings_result.scalar() or 0)

    paid_out_result = await db.execute(
        select(func.coalesce(func.sum(Payout.amount), 0)).where(
            Payout.provider_id == user.id,
            Payout.status.in_([
                PayoutStatus.COMPLETED, PayoutStatus.PENDING, PayoutStatus.PROCESSING
            ]),
        )
    )
    already_claimed = float(paid_out_result.scalar() or 0)
    available = total_earnings - already_claimed

    if request.amount > available:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Insufficient balance. Available: ₹{available:.2f}",
        )

    payout = Payout(
        provider_id=user.id,
        amount=Decimal(str(request.amount)),
        status=PayoutStatus.PENDING,
        notes=request.notes,
        requested_at=datetime.now(timezone.utc),
    )
    db.add(payout)
    await db.flush()
    await db.refresh(payout)

    return APIResponse(
        success=True,
        message="Payout request submitted",
        data={
            "payout_id": payout.id,
            "amount": float(payout.amount),
            "status": payout.status.value,
        },
    )


# ─── Update Job Status ──────────────────────────────────────────

@router.post("/bookings/{booking_id}/status", response_model=APIResponse)
async def update_job_status(
    booking_id: int,
    request: UpdateJobStatusRequest,
    user: User = Depends(require_provider),
    db: AsyncSession = Depends(get_db),
):
    """Provider updates booking status (en_route, arrived, verified, in_progress, completed)."""
    result = await db.execute(
        select(Booking).where(Booking.id == booking_id, Booking.provider_id == user.id)
    )
    booking = result.scalar_one_or_none()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    now = datetime.now(timezone.utc)
    new_status = request.status

    # Validate status transitions
    valid_transitions = {
        BookingStatus.ASSIGNED: [BookingStatus.EN_ROUTE],
        BookingStatus.EN_ROUTE: [BookingStatus.ARRIVED],
        BookingStatus.ARRIVED: [BookingStatus.VERIFIED],
        BookingStatus.VERIFIED: [BookingStatus.IN_PROGRESS],
        BookingStatus.IN_PROGRESS: [BookingStatus.COMPLETED],
    }

    target_status = BookingStatus(new_status)
    allowed = valid_transitions.get(booking.status, [])
    if target_status not in allowed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot transition from '{booking.status.value}' to '{new_status}'",
        )

    # Handle verification code check
    if target_status == BookingStatus.VERIFIED:
        if not request.verification_code:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Verification code is required",
            )
        if request.verification_code != booking.verification_code:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid verification code",
            )
        booking.verification_status = "verified"
        booking.verification_verified_at = now

    # Update status and timestamps
    booking.status = target_status

    if target_status == BookingStatus.ARRIVED:
        booking.provider_arrived_at = now
    elif target_status == BookingStatus.IN_PROGRESS:
        booking.service_started_at = now
    elif target_status == BookingStatus.COMPLETED:
        booking.service_completed_at = now
        booking.completed_at = now
        booking.completion_notes = request.completion_notes

        # Calculate final amount
        actual_hours = request.actual_hours or booking.duration_hours
        base_price = float(booking.estimated_price)
        overtime_rate = base_price / booking.duration_hours * 1.5 if booking.duration_hours > 0 else 0
        extra_hours = max(0, actual_hours - booking.duration_hours)
        overtime_amount = extra_hours * overtime_rate
        final_amount = base_price + overtime_amount + float(booking.emergency_fee or 0)
        booking.final_amount = Decimal(str(round(final_amount, 2)))

        # Create provider earning
        # Provider gets 80% of final amount (platform takes 20%)
        provider_cut = round(final_amount * 0.8, 2)
        earning = ProviderEarning(
            provider_id=user.id,
            booking_id=booking.id,
            amount=Decimal(str(provider_cut)),
            type="job_payment",
            description=f"Booking #{booking.booking_number}",
        )
        db.add(earning)

        # Update provider stats
        user.total_bookings_completed = (user.total_bookings_completed or 0) + 1

    await db.flush()

    # Send real-time notifications
    try:
        from app.services.notification_service import NotificationService
        if target_status == BookingStatus.EN_ROUTE:
            await NotificationService.notify_provider_en_route(db, booking.customer_id, user.name)
        elif target_status == BookingStatus.ARRIVED:
            await NotificationService.notify_provider_arrived(db, booking.customer_id, user.name)
        elif target_status == BookingStatus.COMPLETED:
            await NotificationService.notify_job_completed(db, booking.customer_id, booking.booking_number)
            await NotificationService.notify_payment_received(db, user.id, float(provider_cut), booking.booking_number)
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning(f"Failed to send status update notification: {e}")

    return APIResponse(
        success=True,
        message=f"Status updated to '{new_status}'",
        data=_serialize_provider_booking(booking),
    )


# ─── Bank Details ─────────────────────────────────────────────────

@router.get("/provider/bank-details", response_model=APIResponse)
async def get_bank_details(
    user: User = Depends(require_provider),
):
    """Get provider's bank details for payouts."""
    return APIResponse(
        success=True,
        message="Bank details retrieved successfully",
        data={
            "bank_name": user.bank_name,
            "bank_account_number": user.bank_account_number,
            "bank_ifsc": user.bank_ifsc,
            "bank_account_name": user.bank_account_name,
        }
    )


@router.post("/provider/bank-details", response_model=APIResponse)
async def update_bank_details(
    request: BankDetailsRequest,
    user: User = Depends(require_provider),
    db: AsyncSession = Depends(get_db),
):
    """Update provider's bank details for payouts."""
    user.bank_name = request.bank_name
    user.bank_account_number = request.bank_account_number
    user.bank_ifsc = request.bank_ifsc
    user.bank_account_name = request.bank_account_name
    
    await db.flush()
    
    return APIResponse(
        success=True,
        message="Bank details updated successfully",
        data={
            "bank_name": user.bank_name,
            "bank_account_number": user.bank_account_number,
            "bank_ifsc": user.bank_ifsc,
            "bank_account_name": user.bank_account_name,
        }
    )


# ─── Job Offers ───────────────────────────────────────────────────

@router.get("/provider/offers", response_model=APIResponse)
async def get_active_offers(
    user: User = Depends(require_provider),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve list of active pending job offers for provider."""
    now = datetime.now(timezone.utc)
    
    # Select pending offers that haven't expired yet
    result = await db.execute(
        select(BookingDispatchOffer)
        .where(
            BookingDispatchOffer.provider_id == user.id,
            BookingDispatchOffer.status == OfferStatus.PENDING,
            BookingDispatchOffer.expires_at > now
        )
    )
    offers = result.scalars().all()
    
    offers_list = []
    for offer in offers:
        booking_res = await db.execute(select(Booking).where(Booking.id == offer.booking_id))
        booking = booking_res.scalar_one_or_none()
        if not booking:
            continue
            
        from app.models.booking import ServiceCategory
        cat_res = await db.execute(select(ServiceCategory.name).where(ServiceCategory.id == booking.service_category_id))
        service_name = cat_res.scalar() or "Site Service"

        offers_list.append({
            "offer_id": offer.id,
            "booking_id": booking.id,
            "booking_number": booking.booking_number,
            "service_name": service_name,
            "pickup_address": booking.pickup_address,
            "duration_hours": booking.duration_hours,
            "estimated_earnings": float(booking.estimated_price) * 0.8,
            "is_emergency": booking.is_emergency,
            "expires_at": offer.expires_at.isoformat(),
        })

    return APIResponse(
        success=True,
        message="Active offers loaded",
        data=offers_list
    )


@router.post("/provider/offers/{offer_id}/respond", response_model=APIResponse)
async def respond_to_offer(
    offer_id: int,
    request: RespondToOfferRequest,
    user: User = Depends(require_provider),
    db: AsyncSession = Depends(get_db),
):
    """Provider responds (accept/decline) to a job offer."""
    from app.services.matching_service import MatchingService
    res = await MatchingService.respond_to_offer(db, user.id, offer_id, request.action)
    if not res.get("success"):
        raise HTTPException(status_code=400, detail=res.get("message"))
        
    return APIResponse(
        success=True,
        message=res.get("message")
    )


