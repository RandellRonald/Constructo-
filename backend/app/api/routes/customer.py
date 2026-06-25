"""
Customer dashboard and profile API routes.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc

from app.db.session import get_db
from app.api.deps import require_customer
from app.models.user import User, Notification, SavedLocation
from app.models.booking import Booking, BookingStatus
from app.schemas.auth import APIResponse, UserResponse

router = APIRouter()


@router.get("/dashboard", response_model=APIResponse)
async def get_dashboard(
    user: User = Depends(require_customer),
    db: AsyncSession = Depends(get_db),
):
    """Get customer dashboard data."""
    # Active booking
    active_result = await db.execute(
        select(Booking).where(
            Booking.customer_id == user.id,
            Booking.status.in_([
                BookingStatus.CREATED, BookingStatus.SEARCHING,
                BookingStatus.ASSIGNED, BookingStatus.EN_ROUTE,
                BookingStatus.ARRIVED, BookingStatus.VERIFIED,
                BookingStatus.IN_PROGRESS,
            ])
        ).order_by(desc(Booking.created_at)).limit(1)
    )
    active_booking = active_result.scalar_one_or_none()

    # Recent bookings
    history_result = await db.execute(
        select(Booking).where(
            Booking.customer_id == user.id,
        ).order_by(desc(Booking.created_at)).limit(5)
    )
    recent_bookings = history_result.scalars().all()

    # Unread notifications count
    notif_count_result = await db.execute(
        select(func.count(Notification.id)).where(
            Notification.user_id == user.id,
            Notification.is_read == False,
        )
    )
    unread_count = notif_count_result.scalar() or 0

    # Latest notifications
    notif_result = await db.execute(
        select(Notification).where(
            Notification.user_id == user.id,
        ).order_by(desc(Notification.created_at)).limit(5)
    )
    notifications = notif_result.scalars().all()

    # Saved locations
    locations_result = await db.execute(
        select(SavedLocation).where(SavedLocation.user_id == user.id)
    )
    saved_locations = locations_result.scalars().all()

    return APIResponse(
        success=True,
        message="Dashboard loaded",
        data={
            "user": UserResponse.model_validate(user).model_dump(),
            "active_booking": _serialize_booking(active_booking) if active_booking else None,
            "recent_bookings": [_serialize_booking(b) for b in recent_bookings],
            "unread_notifications": unread_count,
            "notifications": [_serialize_notification(n) for n in notifications],
            "saved_locations": [_serialize_location(l) for l in saved_locations],
        },
    )


@router.get("/notifications", response_model=APIResponse)
async def get_notifications(
    user: User = Depends(require_customer),
    db: AsyncSession = Depends(get_db),
):
    """Get all notifications for customer."""
    result = await db.execute(
        select(Notification).where(
            Notification.user_id == user.id,
        ).order_by(desc(Notification.created_at)).limit(50)
    )
    notifications = result.scalars().all()
    return APIResponse(
        success=True,
        message="Notifications retrieved",
        data={"notifications": [_serialize_notification(n) for n in notifications]},
    )


@router.post("/notifications/{notification_id}/read", response_model=APIResponse)
async def mark_notification_read(
    notification_id: int,
    user: User = Depends(require_customer),
    db: AsyncSession = Depends(get_db),
):
    """Mark a single notification as read."""
    from datetime import datetime, timezone

    result = await db.execute(
        select(Notification).where(
            Notification.id == notification_id,
            Notification.user_id == user.id,
        )
    )
    notif = result.scalar_one_or_none()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")

    notif.is_read = True
    notif.read_at = datetime.now(timezone.utc)
    await db.flush()

    return APIResponse(success=True, message="Notification marked as read")


@router.post("/notifications/read-all", response_model=APIResponse)
async def mark_all_notifications_read(
    user: User = Depends(require_customer),
    db: AsyncSession = Depends(get_db),
):
    """Mark all notifications as read for the customer."""
    from datetime import datetime, timezone
    from sqlalchemy import update

    await db.execute(
        update(Notification).where(
            Notification.user_id == user.id,
            Notification.is_read == False,
        ).values(is_read=True, read_at=datetime.now(timezone.utc))
    )
    await db.flush()

    return APIResponse(success=True, message="All notifications marked as read")


def _serialize_booking(booking: Booking) -> dict:
    return {
        "id": booking.id,
        "booking_number": booking.booking_number,
        "service_category_id": booking.service_category_id,
        "pickup_address": booking.pickup_address,
        "duration_hours": booking.duration_hours,
        "estimated_price": float(booking.estimated_price) if booking.estimated_price else 0,
        "status": booking.status.value,
        "is_emergency": booking.is_emergency,
        "provider_id": booking.provider_id,
        "created_at": booking.created_at.isoformat() if booking.created_at else None,
    }


def _serialize_notification(notif: Notification) -> dict:
    return {
        "id": notif.id,
        "title": notif.title,
        "message": notif.message,
        "type": notif.type,
        "is_read": notif.is_read,
        "created_at": notif.created_at.isoformat() if notif.created_at else None,
    }


def _serialize_location(loc: SavedLocation) -> dict:
    return {
        "id": loc.id,
        "label": loc.label,
        "address": loc.address,
        "latitude": loc.latitude,
        "longitude": loc.longitude,
        "is_default": loc.is_default,
    }
