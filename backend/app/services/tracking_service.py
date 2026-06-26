"""
Tracking Service – handles real-time GPS location updates, database logging,
ETA matrix checks, and automatic 100m arrival detection.
"""
import logging
from typing import Optional
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.booking import Booking, BookingStatus
from app.models.tracking import TrackingLog, TrackingHistory
from app.services.map_service import MapService

logger = logging.getLogger(__name__)


class TrackingService:
    """Service to handle provider real-time GPS coordinates updates."""

    @staticmethod
    async def process_location_update(
        db: AsyncSession,
        booking_id: int,
        provider_id: int,
        latitude: float,
        longitude: float,
        speed: float = 0.0,
        heading: float = 0.0,
        timestamp: Optional[datetime] = None
    ) -> dict:
        """
        Processes a single coordinate update from a provider.
        Saves to TrackingLog & TrackingHistory, recalculates matrix metrics,
        detects arrival if within 100m, and broadcasts updates via WebSocket.
        """
        if timestamp is None:
            timestamp = datetime.now(timezone.utc)

        # 1. Fetch booking
        booking_res = await db.execute(select(Booking).where(Booking.id == booking_id))
        booking = booking_res.scalar_one_or_none()
        if not booking:
            logger.warning(f"Booking {booking_id} not found for location update")
            return {"success": False, "message": "Booking not found"}

        # 2. Add TrackingLog entry
        log_entry = TrackingLog(
            booking_id=booking_id,
            provider_id=provider_id,
            latitude=latitude,
            longitude=longitude,
            speed=speed,
            heading=heading,
            recorded_at=timestamp
        )
        db.add(log_entry)

        # 3. Add TrackingHistory entry
        history_entry = TrackingHistory(
            booking_id=booking_id,
            provider_id=provider_id,
            latitude=latitude,
            longitude=longitude,
            speed=speed,
            heading=heading,
            timestamp=timestamp
        )
        db.add(history_entry)
        await db.flush()

        # 4. Compute ETA & Distance Matrix to Customer Location
        distance_km = 0.0
        duration_min = 0.0
        try:
            matrix = await MapService.get_distance_matrix(
                latitude, longitude,
                booking.pickup_latitude, booking.pickup_longitude
            )
            distance_km = matrix.get("distance_km", 0.0)
            duration_min = matrix.get("duration_min", 0.0)
        except Exception as me:
            logger.error(f"Failed to calculate distance/duration matrix: {me}")

        # 5. Arrival Detection (Distance <= 100 meters, i.e., 0.1 km)
        arrival_detected = False
        if distance_km <= 0.10 and booking.status == BookingStatus.EN_ROUTE:
            arrival_detected = True
            booking.status = BookingStatus.ARRIVED
            booking.provider_arrived_at = timestamp
            await db.flush()
            logger.info(f"Auto-arrival detected for provider {provider_id} on booking {booking_id}")
            
            # Send Notification to Customer
            try:
                from app.services.notification_service import NotificationService
                # Fetch provider name
                from app.models.user import User
                provider_res = await db.execute(select(User.name).where(User.id == provider_id))
                provider_name = provider_res.scalar() or "Provider"
                
                await NotificationService.notify_provider_arrived(
                    db=db,
                    customer_id=booking.customer_id,
                    provider_name=provider_name
                )
            except Exception as ne:
                logger.warning(f"Failed to send arrival notifications: {ne}")

        # 6. Broadcast payload via WebSocket
        payload = {
            "type": "tracking_update",
            "booking_id": booking_id,
            "latitude": latitude,
            "longitude": longitude,
            "speed": speed,
            "heading": heading,
            "timestamp": timestamp.isoformat(),
            "distance_km": distance_km,
            "duration_min": duration_min,
            "booking_status": booking.status.value,
            "arrival_detected": arrival_detected
        }

        try:
            from app.api.websocket import manager
            # Broadcast to tracking channel
            await manager.send_to_channel(f"tracking_{booking_id}", payload)
            
            # If status changed to arrived, notify individual client connections
            if arrival_detected:
                await manager.send_to_channel(f"customer_{booking.customer_id}", {
                    "type": "booking_status_update",
                    "data": {
                        "booking_id": booking_id,
                        "status": BookingStatus.ARRIVED.value
                    }
                })
                await manager.send_to_channel(f"provider_{provider_id}", {
                    "type": "booking_status_update",
                    "data": {
                        "booking_id": booking_id,
                        "status": BookingStatus.ARRIVED.value
                    }
                })
        except Exception as we:
            logger.warning(f"Failed to broadcast WS tracking update: {we}")

        return payload
