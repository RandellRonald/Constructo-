"""Tracking and verification API routes."""
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from pydantic import BaseModel

from app.db.session import get_db
from app.api.deps import get_current_user, require_provider
from app.models.user import User
from app.models.booking import Booking, BookingStatus
from app.models.tracking import TrackingLog
from app.schemas.auth import APIResponse

router = APIRouter()


class LocationUpdate(BaseModel):
    booking_id: int
    latitude: float
    longitude: float
    speed: float = 0
    heading: float = 0


class VerifyCodeRequest(BaseModel):
    code: str


@router.post("/provider/location", response_model=APIResponse)
async def update_provider_location(
    request: LocationUpdate,
    user: User = Depends(require_provider),
    db: AsyncSession = Depends(get_db),
):
    """Update provider GPS location."""
    log = TrackingLog(
        booking_id=request.booking_id,
        provider_id=user.id,
        latitude=request.latitude,
        longitude=request.longitude,
        speed=request.speed,
        heading=request.heading,
        recorded_at=datetime.now(timezone.utc),
    )
    db.add(log)
    await db.flush()

    return APIResponse(success=True, message="Location updated")


@router.get("/bookings/{booking_id}/tracking", response_model=APIResponse)
async def get_tracking(
    booking_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get latest tracking data for a booking."""
    booking_result = await db.execute(
        select(Booking).where(Booking.id == booking_id)
    )
    booking = booking_result.scalar_one_or_none()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    # Get latest location
    loc_result = await db.execute(
        select(TrackingLog).where(
            TrackingLog.booking_id == booking_id
        ).order_by(desc(TrackingLog.recorded_at)).limit(1)
    )
    latest = loc_result.scalar_one_or_none()

    return APIResponse(
        success=True,
        message="Tracking data",
        data={
            "booking_id": booking_id,
            "booking_status": booking.status.value,
            "provider_location": {
                "latitude": latest.latitude,
                "longitude": latest.longitude,
                "speed": latest.speed,
                "heading": latest.heading,
                "recorded_at": latest.recorded_at.isoformat(),
            } if latest else None,
            "customer_location": {
                "latitude": booking.pickup_latitude,
                "longitude": booking.pickup_longitude,
            },
            "verification_code": booking.verification_code if booking.customer_id == user.id else None,
        },
    )


@router.post("/bookings/{booking_id}/arrived", response_model=APIResponse)
async def mark_arrived(
    booking_id: int,
    user: User = Depends(require_provider),
    db: AsyncSession = Depends(get_db),
):
    """Provider marks arrival at site."""
    result = await db.execute(
        select(Booking).where(Booking.id == booking_id, Booking.provider_id == user.id)
    )
    booking = result.scalar_one_or_none()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    booking.status = BookingStatus.ARRIVED
    booking.provider_arrived_at = datetime.now(timezone.utc)
    await db.flush()

    return APIResponse(success=True, message="Arrival confirmed")


@router.post("/bookings/{booking_id}/verify", response_model=APIResponse)
async def verify_booking_code(
    booking_id: int,
    request: VerifyCodeRequest,
    user: User = Depends(require_provider),
    db: AsyncSession = Depends(get_db),
):
    """Provider enters verification code from customer."""
    result = await db.execute(
        select(Booking).where(Booking.id == booking_id, Booking.provider_id == user.id)
    )
    booking = result.scalar_one_or_none()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    if booking.verification_code != request.code:
        raise HTTPException(status_code=400, detail="Invalid verification code")

    booking.status = BookingStatus.VERIFIED
    booking.verification_status = "verified"
    booking.verification_verified_at = datetime.now(timezone.utc)
    await db.flush()

    return APIResponse(success=True, message="Verification successful. You may start work.")
