"""
Booking and service API routes.
"""
import uuid
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from pydantic import BaseModel, Field
from typing import Optional, List

from app.db.session import get_db
from app.api.deps import require_customer
from app.models.user import User
from app.models.booking import Booking, BookingStatus, ServiceCategory, BookingPhoto
from app.schemas.auth import APIResponse

router = APIRouter()


class CreateBookingRequest(BaseModel):
    service_category_id: int
    pickup_address: str
    pickup_latitude: float
    pickup_longitude: float
    duration_hours: float = Field(..., gt=0, le=24)
    description: Optional[str] = None
    is_emergency: bool = False
    photo_urls: Optional[List[dict]] = None


class CalculatePriceRequest(BaseModel):
    service_category_id: int
    duration_hours: float = Field(..., gt=0)
    is_emergency: bool = False


@router.post("/calculate-price", response_model=APIResponse)
async def calculate_price(
    request: CalculatePriceRequest,
    user: User = Depends(require_customer),
    db: AsyncSession = Depends(get_db),
):
    """Calculate estimated price for a booking."""
    result = await db.execute(
        select(ServiceCategory).where(ServiceCategory.id == request.service_category_id)
    )
    category = result.scalar_one_or_none()
    if not category:
        raise HTTPException(status_code=404, detail="Service category not found")

    base_price = float(category.base_hourly_rate) * request.duration_hours
    emergency_fee = float(category.emergency_fee) if request.is_emergency else 0
    reservation_fee = float(category.reservation_fee)
    tax = round(base_price * 0.18, 2)  # 18% GST
    total = round(base_price + emergency_fee + reservation_fee + tax, 2)

    return APIResponse(
        success=True,
        message="Price calculated",
        data={
            "base_price": base_price,
            "emergency_fee": emergency_fee,
            "reservation_fee": reservation_fee,
            "tax": tax,
            "estimated_total": total,
            "hourly_rate": float(category.base_hourly_rate),
        },
    )


@router.post("", response_model=APIResponse)
async def create_booking(
    request: CreateBookingRequest,
    user: User = Depends(require_customer),
    db: AsyncSession = Depends(get_db),
):
    """Create a new booking."""
    # Validate service category
    result = await db.execute(
        select(ServiceCategory).where(ServiceCategory.id == request.service_category_id)
    )
    category = result.scalar_one_or_none()
    if not category:
        raise HTTPException(status_code=404, detail="Service category not found")

    # Calculate pricing
    base_price = Decimal(str(float(category.base_hourly_rate) * request.duration_hours))
    emergency_fee = category.emergency_fee if request.is_emergency else Decimal("0")
    reservation_fee = category.reservation_fee

    booking_number = f"CON-{uuid.uuid4().hex[:8].upper()}"

    booking = Booking(
        booking_number=booking_number,
        customer_id=user.id,
        service_category_id=request.service_category_id,
        pickup_address=request.pickup_address,
        pickup_latitude=request.pickup_latitude,
        pickup_longitude=request.pickup_longitude,
        description=request.description,
        duration_hours=request.duration_hours,
        is_emergency=request.is_emergency,
        estimated_price=base_price,
        reservation_fee=reservation_fee,
        emergency_fee=emergency_fee,
        status=BookingStatus.PAYMENT_PENDING,
    )
    db.add(booking)
    await db.flush()
    await db.refresh(booking)

    # Save photos if provided
    if request.photo_urls:
        for photo in request.photo_urls:
            bp = BookingPhoto(
                booking_id=booking.id,
                cloudinary_public_id=photo.get("public_id", ""),
                cloudinary_secure_url=photo.get("secure_url", ""),
                metadata_json=str(photo.get("metadata", {})),
            )
            db.add(bp)
        await db.flush()

    return APIResponse(
        success=True,
        message="Booking created. Proceed to payment.",
        data={
            "booking_id": booking.id,
            "booking_number": booking.booking_number,
            "estimated_price": float(booking.estimated_price),
            "reservation_fee": float(booking.reservation_fee),
            "emergency_fee": float(booking.emergency_fee),
            "status": booking.status.value,
        },
    )


@router.get("/active", response_model=APIResponse)
async def get_active_booking(
    user: User = Depends(require_customer),
    db: AsyncSession = Depends(get_db),
):
    """Get the customer's active booking."""
    result = await db.execute(
        select(Booking).where(
            Booking.customer_id == user.id,
            Booking.status.in_([
                BookingStatus.CREATED, BookingStatus.SEARCHING,
                BookingStatus.ASSIGNED, BookingStatus.EN_ROUTE,
                BookingStatus.ARRIVED, BookingStatus.VERIFIED,
                BookingStatus.IN_PROGRESS, BookingStatus.PAYMENT_PENDING,
            ])
        ).order_by(desc(Booking.created_at)).limit(1)
    )
    booking = result.scalar_one_or_none()

    if not booking:
        return APIResponse(success=True, message="No active booking", data=None)

    return APIResponse(
        success=True,
        message="Active booking found",
        data={
            "id": booking.id,
            "booking_number": booking.booking_number,
            "service_category_id": booking.service_category_id,
            "pickup_address": booking.pickup_address,
            "duration_hours": booking.duration_hours,
            "estimated_price": float(booking.estimated_price),
            "status": booking.status.value,
            "provider_id": booking.provider_id,
            "is_emergency": booking.is_emergency,
            "verification_code": booking.verification_code,
            "created_at": booking.created_at.isoformat() if booking.created_at else None,
        },
    )


@router.get("/history", response_model=APIResponse)
async def get_booking_history(
    user: User = Depends(require_customer),
    db: AsyncSession = Depends(get_db),
    status_filter: Optional[str] = Query(None, alias="status", pattern="^(active|completed|cancelled)$"),
    search: Optional[str] = Query(None, max_length=100),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
):
    """Get customer's booking history with optional filters."""
    query = select(Booking).where(Booking.customer_id == user.id)

    # Status filter
    if status_filter == "active":
        query = query.where(Booking.status.in_([
            BookingStatus.CREATED, BookingStatus.SEARCHING,
            BookingStatus.ASSIGNED, BookingStatus.EN_ROUTE,
            BookingStatus.ARRIVED, BookingStatus.VERIFIED,
            BookingStatus.IN_PROGRESS, BookingStatus.PAYMENT_PENDING,
        ]))
    elif status_filter == "completed":
        query = query.where(Booking.status == BookingStatus.COMPLETED)
    elif status_filter == "cancelled":
        query = query.where(Booking.status == BookingStatus.CANCELLED)

    # Search by booking number or address
    if search:
        query = query.where(
            Booking.booking_number.ilike(f"%{search}%")
            | Booking.pickup_address.ilike(f"%{search}%")
        )

    # Count total
    from sqlalchemy import func as sa_func
    count_query = select(sa_func.count()).select_from(query.subquery())
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
        message="Booking history retrieved",
        data={
            "bookings": [{
                "id": b.id,
                "booking_number": b.booking_number,
                "service_category_id": b.service_category_id,
                "pickup_address": b.pickup_address,
                "duration_hours": b.duration_hours,
                "estimated_price": float(b.estimated_price),
                "final_amount": float(b.final_amount) if b.final_amount else None,
                "status": b.status.value,
                "is_emergency": b.is_emergency,
                "created_at": b.created_at.isoformat() if b.created_at else None,
                "completed_at": b.completed_at.isoformat() if b.completed_at else None,
            } for b in bookings],
            "total": total,
            "page": page,
            "limit": limit,
            "total_pages": (total + limit - 1) // limit if total > 0 else 0,
        },
    )


@router.get("/{booking_id}", response_model=APIResponse)
async def get_booking(
    booking_id: int,
    user: User = Depends(require_customer),
    db: AsyncSession = Depends(get_db),
):
    """Get booking details."""
    result = await db.execute(
        select(Booking).where(Booking.id == booking_id, Booking.customer_id == user.id)
    )
    booking = result.scalar_one_or_none()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    return APIResponse(
        success=True,
        message="Booking details",
        data={
            "id": booking.id,
            "booking_number": booking.booking_number,
            "service_category_id": booking.service_category_id,
            "pickup_address": booking.pickup_address,
            "pickup_latitude": booking.pickup_latitude,
            "pickup_longitude": booking.pickup_longitude,
            "description": booking.description,
            "duration_hours": booking.duration_hours,
            "estimated_price": float(booking.estimated_price),
            "reservation_fee": float(booking.reservation_fee),
            "emergency_fee": float(booking.emergency_fee),
            "final_amount": float(booking.final_amount) if booking.final_amount else None,
            "status": booking.status.value,
            "is_emergency": booking.is_emergency,
            "provider_id": booking.provider_id,
            "verification_code": booking.verification_code,
            "created_at": booking.created_at.isoformat() if booking.created_at else None,
        },
    )


@router.post("/{booking_id}/cancel", response_model=APIResponse)
async def cancel_booking(
    booking_id: int,
    user: User = Depends(require_customer),
    db: AsyncSession = Depends(get_db),
):
    """Cancel a booking. Only allowed before provider starts work."""
    from datetime import datetime, timezone

    result = await db.execute(
        select(Booking).where(Booking.id == booking_id, Booking.customer_id == user.id)
    )
    booking = result.scalar_one_or_none()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    cancellable_statuses = [
        BookingStatus.DRAFT, BookingStatus.PAYMENT_PENDING,
        BookingStatus.CREATED, BookingStatus.SEARCHING,
        BookingStatus.ASSIGNED, BookingStatus.EN_ROUTE,
    ]
    if booking.status not in cancellable_statuses:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot cancel booking in '{booking.status.value}' status",
        )

    # Determine refund eligibility
    refund_eligible = booking.status in [
        BookingStatus.DRAFT, BookingStatus.PAYMENT_PENDING,
        BookingStatus.CREATED, BookingStatus.SEARCHING,
    ]

    booking.status = BookingStatus.CANCELLED
    booking.cancelled_at = datetime.now(timezone.utc)
    await db.flush()

    return APIResponse(
        success=True,
        message="Booking cancelled",
        data={
            "booking_id": booking.id,
            "refund_eligible": refund_eligible,
            "status": booking.status.value,
        },
    )
