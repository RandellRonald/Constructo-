"""
Provider matching service — finds and assigns providers to bookings.
"""
import json
import logging
import random
import string
from datetime import datetime, timezone
from typing import Optional, List

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, desc

from app.models.user import User, UserRole, UserStatus
from app.models.booking import Booking, BookingStatus

logger = logging.getLogger(__name__)


class MatchingService:
    """Service for matching providers to customer bookings."""

    @staticmethod
    async def find_available_providers(
        db: AsyncSession,
        service_category_id: int,
        district: Optional[str] = None,
        exclude_provider_ids: Optional[List[int]] = None,
    ) -> List[User]:
        """Find providers that serve the requested category and district."""
        query = select(User).where(
            User.role == UserRole.PROVIDER,
            User.status == UserStatus.ACTIVE,
        )

        if exclude_provider_ids:
            query = query.where(User.id.notin_(exclude_provider_ids))

        result = await db.execute(query)
        providers = result.scalars().all()

        # Filter by service category (stored as JSON string of category IDs)
        matching = []
        for provider in providers:
            try:
                if provider.service_categories:
                    categories = json.loads(provider.service_categories)
                    if str(service_category_id) in [str(c) for c in categories]:
                        # If district filter is set, check district match
                        if district and provider.district:
                            if provider.district.lower() != district.lower():
                                continue
                        matching.append(provider)
            except (json.JSONDecodeError, TypeError):
                continue

        return matching

    @staticmethod
    def rank_providers(providers: List[User]) -> List[User]:
        """Rank providers by rating, reliability, and completed jobs."""
        def score(p: User) -> float:
            rating_score = (p.average_rating or 0) * 20  # 0-100
            reliability_score = (p.reliability_score or 0)  # 0-100
            experience_score = min(100, (p.total_bookings_completed or 0) * 2)  # Cap at 100
            return rating_score * 0.4 + reliability_score * 0.35 + experience_score * 0.25

        return sorted(providers, key=score, reverse=True)

    @staticmethod
    def _generate_verification_code() -> str:
        """Generate a 6-digit numeric verification code."""
        return ''.join(random.choices(string.digits, k=6))

    @staticmethod
    async def assign_provider(
        db: AsyncSession,
        booking: Booking,
        provider: User,
    ) -> Booking:
        """Assign a provider to a booking."""
        now = datetime.now(timezone.utc)

        booking.provider_id = provider.id
        booking.status = BookingStatus.ASSIGNED
        booking.provider_assigned_at = now
        booking.verification_code = MatchingService._generate_verification_code()

        await db.flush()

        # Send notifications
        try:
            from app.services.notification_service import NotificationService
            await NotificationService.notify_booking_assigned(
                db=db,
                customer_id=booking.customer_id,
                provider_name=provider.name,
                booking_number=booking.booking_number,
            )
            await NotificationService.notify_provider_new_job(
                db=db,
                provider_id=provider.id,
                booking_number=booking.booking_number,
                service_name=f"Service #{booking.service_category_id}",
            )
        except Exception as e:
            logger.warning(f"Failed to send assignment notifications: {e}")

        return booking

    @staticmethod
    async def match_and_assign(
        db: AsyncSession,
        booking: Booking,
    ) -> Optional[User]:
        """Full matching pipeline: find → rank → assign top provider."""
        # Check if already assigned
        if booking.provider_id:
            logger.info(f"Booking {booking.id} already has provider {booking.provider_id}")
            return None

        # Find available providers
        providers = await MatchingService.find_available_providers(
            db=db,
            service_category_id=booking.service_category_id,
        )

        if not providers:
            logger.warning(f"No providers found for booking {booking.id}")
            booking.status = BookingStatus.NO_PROVIDER
            await db.flush()
            return None

        # Check which providers don't have active jobs
        available = []
        for provider in providers:
            active_result = await db.execute(
                select(func.count(Booking.id)).where(
                    Booking.provider_id == provider.id,
                    Booking.status.in_([
                        BookingStatus.ASSIGNED, BookingStatus.EN_ROUTE,
                        BookingStatus.ARRIVED, BookingStatus.VERIFIED,
                        BookingStatus.IN_PROGRESS,
                    ])
                )
            )
            active_count = active_result.scalar() or 0
            if active_count == 0:
                available.append(provider)

        if not available:
            logger.warning(f"All matching providers are busy for booking {booking.id}")
            # Still assign to the top-ranked overall provider
            ranked = MatchingService.rank_providers(providers)
            best = ranked[0]
        else:
            ranked = MatchingService.rank_providers(available)
            best = ranked[0]

        # Assign
        await MatchingService.assign_provider(db, booking, best)
        logger.info(f"Assigned provider {best.id} ({best.name}) to booking {booking.id}")
        return best
