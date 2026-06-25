"""
Provider matching service — finds and assigns providers to bookings.
"""
import json
import logging
import random
import string
from datetime import datetime, timezone, timedelta
from typing import Optional, List

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, desc

from app.models.user import User, UserRole, UserStatus
from app.models.booking import Booking, BookingStatus, BookingDispatchOffer, OfferStatus
from app.services.reliability_service import ReliabilityService

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
    async def create_dispatch_offer(
        db: AsyncSession,
        booking: Booking,
        provider: User,
        expires_in_seconds: int = 120
    ) -> BookingDispatchOffer:
        """Create a dispatch offer for a provider and push it via WebSocket."""
        now = datetime.now(timezone.utc)
        expires_at = now + timedelta(seconds=expires_in_seconds)

        offer = BookingDispatchOffer(
            booking_id=booking.id,
            provider_id=provider.id,
            status=OfferStatus.PENDING,
            expires_at=expires_at,
        )
        db.add(offer)
        await db.flush()
        await db.refresh(offer)

        # Notify via WebSocket
        try:
            from app.api.websocket import manager
            from app.models.booking import ServiceCategory
            
            # Fetch service name
            cat_res = await db.execute(select(ServiceCategory.name).where(ServiceCategory.id == booking.service_category_id))
            service_name = cat_res.scalar() or "Site Service"

            await manager.send_to_channel(f"provider_{provider.id}", {
                "type": "job_offer",
                "data": {
                    "offer_id": offer.id,
                    "booking_id": booking.id,
                    "booking_number": booking.booking_number,
                    "service_name": service_name,
                    "pickup_address": booking.pickup_address,
                    "duration_hours": booking.duration_hours,
                    "estimated_earnings": float(booking.estimated_price) * 0.8,
                    "is_emergency": booking.is_emergency,
                    "expires_at": expires_at.isoformat(),
                }
            })
        except Exception as e:
            logger.warning(f"Failed to send WebSocket job offer to provider {provider.id}: {e}")

        return offer

    @staticmethod
    async def match_and_assign(
        db: AsyncSession,
        booking: Booking,
    ) -> Optional[User]:
        """Start dispatch matching pipeline: set status to searching and create initial offers."""
        # Check if already assigned
        if booking.provider_id:
            logger.info(f"Booking {booking.id} already has provider {booking.provider_id}")
            return None

        booking.status = BookingStatus.SEARCHING
        await db.flush()

        # Find available providers
        providers = await MatchingService.find_available_providers(
            db=db,
            service_category_id=booking.service_category_id,
        )

        if not providers:
            logger.warning(f"No providers found for booking {booking.id}")
            booking.status = BookingStatus.NO_PROVIDER
            await db.flush()
            
            # Notify customer of no provider
            try:
                from app.services.notification_service import NotificationService
                await NotificationService.create(
                    db=db,
                    user_id=booking.customer_id,
                    title="No Provider Available",
                    message=f"We couldn't find any available provider for your booking #{booking.booking_number}. A refund has been initiated.",
                    type="booking",
                )
            except Exception as e:
                logger.warning(f"Failed to send no provider notification: {e}")
            return None

        # Check which matching providers don't have active jobs
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

        final_list = available if available else providers
        ranked = MatchingService.rank_providers(final_list)

        if booking.is_emergency:
            # Emergency: dispatch to all available providers simultaneously
            logger.info(f"Emergency booking {booking.id} - dispatching to {len(ranked)} providers simultaneously")
            for provider in ranked:
                await MatchingService.create_dispatch_offer(db, booking, provider, expires_in_seconds=300)
            return ranked[0]
        else:
            # Regular booking: dispatch to top provider first
            best = ranked[0]
            await MatchingService.create_dispatch_offer(db, booking, best, expires_in_seconds=120)
            logger.info(f"Dispatched initial offer to provider {best.id} ({best.name}) for booking {booking.id}")
            return best

    @staticmethod
    async def route_next_dispatch(db: AsyncSession, booking_id: int) -> Optional[User]:
        """Find and route the dispatch offer to the next ranked provider in the queue."""
        result = await db.execute(select(Booking).where(Booking.id == booking_id))
        booking = result.scalar_one_or_none()
        if not booking or booking.status != BookingStatus.SEARCHING:
            return None

        # Get list of providers already offered
        offers_result = await db.execute(
            select(BookingDispatchOffer.provider_id).where(BookingDispatchOffer.booking_id == booking_id)
        )
        excluded_ids = [row[0] for row in offers_result.fetchall()]

        # Find providers excluding already offered
        providers = await MatchingService.find_available_providers(
            db=db,
            service_category_id=booking.service_category_id,
            exclude_provider_ids=excluded_ids,
        )

        if not providers:
            logger.warning(f"All matching providers exhausted for booking {booking_id}")
            booking.status = BookingStatus.NO_PROVIDER
            await db.flush()
            
            # Notify customer of no provider
            try:
                from app.services.notification_service import NotificationService
                await NotificationService.create(
                    db=db,
                    user_id=booking.customer_id,
                    title="No Provider Found",
                    message=f"We were unable to match a provider to your booking #{booking.booking_number}. We are processing your refund.",
                    type="booking",
                )
            except Exception as e:
                logger.warning(f"Failed to send no provider notification: {e}")
            return None

        # Check busy vs idle
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

        final_list = available if available else providers
        ranked = MatchingService.rank_providers(final_list)
        best = ranked[0]

        await MatchingService.create_dispatch_offer(db, booking, best, expires_in_seconds=120)
        logger.info(f"Routed next dispatch offer to provider {best.id} ({best.name}) for booking {booking_id}")
        return best

    @staticmethod
    async def respond_to_offer(db: AsyncSession, provider_id: int, offer_id: int, action: str) -> dict:
        """Handle provider response (accept/decline) to a dispatch job offer."""
        result = await db.execute(
            select(BookingDispatchOffer).where(
                BookingDispatchOffer.id == offer_id,
                BookingDispatchOffer.provider_id == provider_id
            )
        )
        offer = result.scalar_one_or_none()
        if not offer:
            return {"success": False, "message": "Job offer not found"}

        if offer.status != OfferStatus.PENDING:
            return {"success": False, "message": f"Offer has already been processed: status is {offer.status.value}"}

        booking_result = await db.execute(select(Booking).where(Booking.id == offer.booking_id))
        booking = booking_result.scalar_one_or_none()
        if not booking or booking.status != BookingStatus.SEARCHING:
            return {"success": False, "message": "Booking is no longer searching or has been cancelled"}

        if action.lower() == "accept":
            # Check if provider is busy
            active_result = await db.execute(
                select(func.count(Booking.id)).where(
                    Booking.provider_id == provider_id,
                    Booking.status.in_([
                        BookingStatus.ASSIGNED, BookingStatus.EN_ROUTE,
                        BookingStatus.ARRIVED, BookingStatus.VERIFIED,
                        BookingStatus.IN_PROGRESS,
                    ])
                )
            )
            active_count = active_result.scalar() or 0
            if active_count > 0:
                return {"success": False, "message": "You already have an active job in progress"}

            # Mark offer as accepted
            offer.status = OfferStatus.ACCEPTED
            
            # Bind provider to booking
            await MatchingService.assign_provider(db, booking, offer.provider)

            # Cancel/expire other pending offers for this booking (if emergency/parallel)
            await db.execute(
                select(BookingDispatchOffer)
                .where(
                    BookingDispatchOffer.booking_id == booking.id,
                    BookingDispatchOffer.id != offer.id,
                    BookingDispatchOffer.status == OfferStatus.PENDING
                )
            )
            other_offers = [row[0] for row in (await db.execute(
                select(BookingDispatchOffer).where(
                    BookingDispatchOffer.booking_id == booking.id,
                    BookingDispatchOffer.id != offer.id,
                    BookingDispatchOffer.status == OfferStatus.PENDING
                )
            )).fetchall()]
            for o in other_offers:
                o.status = OfferStatus.EXPIRED

            # Update reliability score
            await ReliabilityService.update_reliability_score(db, provider_id, "accept")
            await db.flush()

            return {"success": True, "message": "Offer accepted and job assigned", "booking": booking}

        elif action.lower() == "decline":
            # Mark offer as declined
            offer.status = OfferStatus.DECLINED
            
            # Update reliability score
            await ReliabilityService.update_reliability_score(db, provider_id, "decline")
            await db.flush()

            # Route to next provider
            await MatchingService.route_next_dispatch(db, booking.id)
            await db.flush()

            return {"success": True, "message": "Offer declined"}

        else:
            return {"success": False, "message": "Invalid response action"}

