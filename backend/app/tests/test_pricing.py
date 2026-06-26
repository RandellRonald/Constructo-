from decimal import Decimal
from app.tests.base import AsyncDatabaseTestCase
from app.models.booking import ServiceCategory
from app.services.pricing_service import PricingService

class TestPricingService(AsyncDatabaseTestCase):
    async def asyncSetUp(self):
        await super().asyncSetUp()
        # Seed a service category for pricing checks
        self.category = ServiceCategory(
            name="Excavator Premium",
            slug="excavator-premium",
            description="Premium Excavator Service",
            base_hourly_rate=Decimal("1500.00"),
            overtime_hourly_rate=Decimal("1800.00"),
            emergency_fee=Decimal("1000.00"),
            reservation_fee=Decimal("300.00"),
            is_active=True,
        )
        self.db.add(self.category)
        await self.db.commit()
        await self.db.refresh(self.category)

    def test_get_peak_multiplier(self):
        # We can verify that get_peak_multiplier returns either 1.0 or 1.25
        multiplier = PricingService.get_peak_multiplier()
        self.assertIn(multiplier, [1.0, 1.25])

    async def test_get_surge_multiplier_no_bookings(self):
        # No bookings and no providers registered
        multiplier = await PricingService.get_surge_multiplier(self.db, self.category.id, "Ernakulam")
        self.assertEqual(multiplier, 1.0)

    async def test_calculate_booking_price_basic(self):
        # Verify basic calculation flow for a 3-hour job in "Ernakulam"
        # We temporarily mock get_peak_multiplier to return 1.0 for consistency
        original_get_peak = PricingService.get_peak_multiplier
        PricingService.get_peak_multiplier = lambda: 1.0
        
        try:
            breakdown = await PricingService.calculate_booking_price(
                self.db,
                service_category_id=self.category.id,
                duration_hours=3.0,
                district="Ernakulam",
                is_emergency=False
            )
            
            # Expected values:
            # base = 1500 * 3 = 4500
            # peak surcharge = 0
            # surge surcharge = 0 (multiplier is 1.0)
            # emergency_fee = 0
            # reservation_fee = 300
            # tax = (4500 + 300) * 0.18 = 864
            # total = 4500 + 300 + 864 = 5664
            self.assertEqual(breakdown["base_price"], 4500.00)
            self.assertEqual(breakdown["peak_multiplier"], 1.0)
            self.assertEqual(breakdown["surge_multiplier"], 1.0)
            self.assertEqual(breakdown["emergency_fee"], 0.0)
            self.assertEqual(breakdown["reservation_fee"], 300.0)
            self.assertEqual(breakdown["tax"], 864.00)
            self.assertEqual(breakdown["estimated_total"], 5664.00)
        finally:
            PricingService.get_peak_multiplier = original_get_peak

    async def test_calculate_booking_price_emergency(self):
        # Verify emergency calculation flow for a 2-hour job
        original_get_peak = PricingService.get_peak_multiplier
        PricingService.get_peak_multiplier = lambda: 1.0
        
        try:
            breakdown = await PricingService.calculate_booking_price(
                self.db,
                service_category_id=self.category.id,
                duration_hours=2.0,
                district="Ernakulam",
                is_emergency=True
            )
            
            # Expected values:
            # base = 1500 * 2 = 3000
            # peak surcharge = 0
            # surge surcharge = 0
            # emergency_fee = 1000
            # reservation_fee = 300
            # tax = (3000 + 1000 + 300) * 0.18 = 774
            # total = 3000 + 1000 + 300 + 774 = 5074
            self.assertEqual(breakdown["base_price"], 3000.00)
            self.assertEqual(breakdown["emergency_fee"], 1000.0)
            self.assertEqual(breakdown["tax"], 774.00)
            self.assertEqual(breakdown["estimated_total"], 5074.00)
        finally:
            PricingService.get_peak_multiplier = original_get_peak
