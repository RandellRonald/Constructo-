"""
Reliability service – tracks and updates provider reliability scores.
"""
import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.user import User

logger = logging.getLogger(__name__)

class ReliabilityService:
    """Service to manage provider reliability score updates."""

    @staticmethod
    async def update_reliability_score(db: AsyncSession, provider_id: int, action: str) -> float:
        """
        Updates the provider's reliability score based on their actions.
        Clamps the score between 0.0 and 100.0.
        """
        result = await db.execute(select(User).where(User.id == provider_id))
        provider = result.scalar_one_or_none()
        
        if not provider:
            logger.warning(f"Provider #{provider_id} not found for reliability score update.")
            return 100.0

        current_score = provider.reliability_score or 100.0
        
        # Scoring rules
        adjustments = {
            "accept": 1.0,      # Small bonus for accepting
            "decline": -2.0,    # Small penalty for declining
            "timeout": -5.0,    # Higher penalty for ignoring/timing out
            "cancel": -15.0,    # Heavy penalty for cancelling after acceptance
            "complete": 2.0,    # Good bonus for successful completion
        }

        diff = adjustments.get(action.lower(), 0.0)
        new_score = max(0.0, min(100.0, current_score + diff))
        
        provider.reliability_score = new_score
        await db.flush()
        
        logger.info(
            f"Provider #{provider_id} reliability score updated from {current_score} to {new_score} "
            f"due to action: {action}"
        )
        return new_score
