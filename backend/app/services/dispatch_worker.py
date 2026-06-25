"""
Dispatch worker – processes timed-out job offers and routes them to the next provider.
"""
import asyncio
import logging
from datetime import datetime, timezone
from sqlalchemy import select
from app.db.session import AsyncSessionLocal
from app.models.booking import BookingDispatchOffer, OfferStatus
from app.services.matching_service import MatchingService
from app.services.reliability_service import ReliabilityService

logger = logging.getLogger(__name__)

async def check_expired_offers():
    """Scan and process expired dispatch offers."""
    async with AsyncSessionLocal() as db:
        try:
            now = datetime.now(timezone.utc)
            # Find pending offers that have expired
            result = await db.execute(
                select(BookingDispatchOffer)
                .where(
                    BookingDispatchOffer.status == OfferStatus.PENDING,
                    BookingDispatchOffer.expires_at < now
                )
            )
            expired_offers = result.scalars().all()
            
            if expired_offers:
                logger.info(f"Found {len(expired_offers)} expired dispatch offers.")
                
            for offer in expired_offers:
                # Mark offer as expired
                offer.status = OfferStatus.EXPIRED
                await db.flush()
                
                # Penalize reliability score for timeout
                await ReliabilityService.update_reliability_score(db, offer.provider_id, "timeout")
                
                # Route to next provider
                await MatchingService.route_next_dispatch(db, offer.booking_id)
                await db.flush()
                
                # Notify provider
                try:
                    from app.services.notification_service import NotificationService
                    await NotificationService.create(
                        db=db,
                        user_id=offer.provider_id,
                        title="Job Offer Expired",
                        message="A dispatched job offer expired because you did not respond in time.",
                        type="booking"
                    )
                except Exception as ne:
                    logger.warning(f"Failed to send timeout notification to provider {offer.provider_id}: {ne}")
            
            await db.commit()
        except Exception as e:
            await db.rollback()
            logger.error(f"Error in dispatch worker scan: {e}", exc_info=True)

async def dispatch_worker_loop():
    """Continuous loop running every 10 seconds."""
    logger.info("Starting dispatch allocation worker loop...")
    while True:
        try:
            await check_expired_offers()
        except Exception as e:
            logger.error(f"Error in dispatch loop execution: {e}")
        await asyncio.sleep(10)
