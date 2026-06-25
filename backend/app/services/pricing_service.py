"""
Pricing engine service – calculates base, peak hour, surge, emergency, and tax breakdowns.
"""
import logging
from decimal import Decimal
from datetime import datetime, timezone
from typing import Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.models.booking import Booking, BookingStatus, ServiceCategory

logger = logging.getLogger(__name__)

class PricingService:
    """Service to calculate dynamic and surge pricing rules."""

    @staticmethod
    async def get_surge_multiplier(db: AsyncSession, service_category_id: int, district: str) -> float:
        """
        Calculates surge pricing multiplier based on demand vs supply in a district.
        Surge = 1.0 + min(0.5, (active_bookings_count / max(1, available_providers_count)) * 0.1)
        """
        # Active bookings in district/category
        from app.models.user import User, UserRole, UserStatus
        import json
        
        # Count bookings currently searching or active
        bookings_res = await db.execute(
            select(func.count(Booking.id))
            .where(
                Booking.service_category_id == service_category_id,
                Booking.status.in_([BookingStatus.SEARCHING, BookingStatus.ASSIGNED, BookingStatus.IN_PROGRESS])
            )
        )
        active_bookings = bookings_res.scalar() or 0

        # Count active providers in district who serve this category
        prov_res = await db.execute(
            select(User)
            .where(
                User.role == UserRole.PROVIDER,
                User.status == UserStatus.ACTIVE,
                User.district == district
            )
        )
        providers = prov_res.scalars().all()
        
        available_count = 0
        for p in providers:
            try:
                if p.service_categories:
                    cats = json.loads(p.service_categories)
                    if str(service_category_id) in [str(c) for c in cats]:
                        available_count += 1
            except Exception:
                continue

        multiplier = 1.0 + min(0.5, (active_bookings / max(1, available_count)) * 0.1)
        return round(multiplier, 2)

    @staticmethod
    def get_peak_multiplier() -> float:
        """
        Peak Hour Fee: 1.25x applied between 8 PM and 6 AM, or all day on Sundays.
        """
        now = datetime.now() # Local time check
        hour = now.hour
        weekday = now.weekday() # 6 is Sunday

        if hour >= 20 or hour < 6 or weekday == 6:
            return 1.25
        return 1.0

    @staticmethod
    async def calculate_booking_price(
        db: AsyncSession,
        service_category_id: int,
        duration_hours: float,
        district: str,
        is_emergency: bool = False
    ) -> Dict[str, Any]:
        """Calculates detailed price breakdown including all multipliers and tax."""
        result = await db.execute(
            select(ServiceCategory).where(ServiceCategory.id == service_category_id)
        )
        category = result.scalar_one_or_none()
        if not category:
            raise ValueError("Service category not found")

        base_hourly_rate = float(category.base_hourly_rate)
        base_price = base_hourly_rate * duration_hours

        # Apply peak hour multiplier
        peak_multiplier = PricingService.get_peak_multiplier()
        peak_price = base_price * peak_multiplier
        peak_surcharge = peak_price - base_price

        # Apply surge pricing multiplier
        surge_multiplier = await PricingService.get_surge_multiplier(db, service_category_id, district)
        surge_price = peak_price * surge_multiplier
        surge_surcharge = surge_price - peak_price

        # Emergency fee
        emergency_fee = float(category.emergency_fee) if is_emergency else 0.0

        # Reservation fee
        reservation_fee = float(category.reservation_fee)

        # Tax (18% GST on service total)
        taxable_amount = surge_price + emergency_fee + reservation_fee
        tax = round(taxable_amount * 0.18, 2)
        total = round(taxable_amount + tax, 2)

        return {
            "hourly_rate": base_hourly_rate,
            "base_price": round(base_price, 2),
            "peak_multiplier": peak_multiplier,
            "peak_surcharge": round(peak_surcharge, 2),
            "surge_multiplier": surge_multiplier,
            "surge_surcharge": round(surge_surcharge, 2),
            "emergency_fee": emergency_fee,
            "reservation_fee": reservation_fee,
            "tax": tax,
            "estimated_total": total
        }
