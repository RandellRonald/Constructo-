"""
Notification service — create DB records and push via WebSocket.
"""
import logging
from typing import Optional
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import Notification

logger = logging.getLogger(__name__)


class NotificationService:
    """Service for creating and pushing notifications."""

    @staticmethod
    async def create(
        db: AsyncSession,
        user_id: int,
        title: str,
        message: str,
        type: str = "system",
        data_json: Optional[str] = None,
        push_ws: bool = True,
    ) -> Notification:
        """Create a notification record and optionally push via WebSocket."""
        notif = Notification(
            user_id=user_id,
            title=title,
            message=message,
            type=type,
            is_read=False,
            data_json=data_json,
        )
        db.add(notif)
        await db.flush()
        await db.refresh(notif)

        # Push via WebSocket if enabled
        if push_ws:
            try:
                from app.api.websocket import manager
                await manager.send_to_channel(f"customer_{user_id}", {
                    "type": "notification",
                    "data": {
                        "id": notif.id,
                        "title": notif.title,
                        "message": notif.message,
                        "type": notif.type,
                        "created_at": notif.created_at.isoformat() if notif.created_at else None,
                    },
                })
                # Also try provider channel
                await manager.send_to_channel(f"provider_{user_id}", {
                    "type": "notification",
                    "data": {
                        "id": notif.id,
                        "title": notif.title,
                        "message": notif.message,
                        "type": notif.type,
                        "created_at": notif.created_at.isoformat() if notif.created_at else None,
                    },
                })
            except Exception as e:
                logger.warning(f"Failed to push WS notification: {e}")

        return notif

    @staticmethod
    async def notify_booking_assigned(db: AsyncSession, customer_id: int, provider_name: str, booking_number: str):
        """Notify customer that a provider has been assigned."""
        await NotificationService.create(
            db=db,
            user_id=customer_id,
            title="Provider Assigned",
            message=f"{provider_name} has been assigned to your booking #{booking_number}",
            type="booking",
        )

    @staticmethod
    async def notify_provider_new_job(db: AsyncSession, provider_id: int, booking_number: str, service_name: str):
        """Notify provider of a new job assignment."""
        await NotificationService.create(
            db=db,
            user_id=provider_id,
            title="New Job Assigned",
            message=f"You have a new {service_name} job: #{booking_number}",
            type="booking",
        )

    @staticmethod
    async def notify_provider_en_route(db: AsyncSession, customer_id: int, provider_name: str):
        """Notify customer that provider is on the way."""
        await NotificationService.create(
            db=db,
            user_id=customer_id,
            title="Provider En Route",
            message=f"{provider_name} is on the way to your location",
            type="tracking",
        )

    @staticmethod
    async def notify_provider_arrived(db: AsyncSession, customer_id: int, provider_name: str):
        """Notify customer that provider has arrived."""
        await NotificationService.create(
            db=db,
            user_id=customer_id,
            title="Provider Arrived",
            message=f"{provider_name} has arrived at your location",
            type="tracking",
        )

    @staticmethod
    async def notify_job_completed(db: AsyncSession, customer_id: int, booking_number: str):
        """Notify customer that job is completed."""
        await NotificationService.create(
            db=db,
            user_id=customer_id,
            title="Job Completed",
            message=f"Your booking #{booking_number} has been completed. Please review.",
            type="booking",
        )

    @staticmethod
    async def notify_payment_received(db: AsyncSession, provider_id: int, amount: float, booking_number: str):
        """Notify provider of payment received."""
        await NotificationService.create(
            db=db,
            user_id=provider_id,
            title="Payment Received",
            message=f"₹{amount:.0f} earned for booking #{booking_number}",
            type="payment",
        )

    @staticmethod
    async def notify_payout_processed(db: AsyncSession, provider_id: int, amount: float):
        """Notify provider that payout has been processed."""
        await NotificationService.create(
            db=db,
            user_id=provider_id,
            title="Payout Processed",
            message=f"₹{amount:.0f} has been transferred to your bank account",
            type="payment",
        )

    @staticmethod
    async def notify_review_posted(db: AsyncSession, provider_id: int, rating: float, customer_name: str):
        """Notify provider of a new review."""
        await NotificationService.create(
            db=db,
            user_id=provider_id,
            title="New Review",
            message=f"{customer_name} gave you {rating:.1f} stars",
            type="review",
        )
