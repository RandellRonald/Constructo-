import json
from decimal import Decimal
from app.tests.base import AsyncDatabaseTestCase
from app.models.user import User, UserRole, UserStatus
from app.models.booking import Booking, BookingStatus, ServiceCategory
from app.services.matching_service import MatchingService

class TestMatchingService(AsyncDatabaseTestCase):
    async def asyncSetUp(self):
        await super().asyncSetUp()
        # Seed test category
        self.category = ServiceCategory(
            name="Crane Lift",
            slug="crane-lift",
            base_hourly_rate=Decimal("2000.00"),
            overtime_hourly_rate=Decimal("2500.00"),
            emergency_fee=Decimal("1500.00"),
            reservation_fee=Decimal("500.00"),
            is_active=True,
        )
        self.db.add(self.category)
        
        # Seed test customer
        self.customer = User(
            name="Test Customer",
            email="customer@test.com",
            phone="9000000001",
            password_hash="hash",
            role=UserRole.CUSTOMER,
            status=UserStatus.ACTIVE,
        )
        self.db.add(self.customer)
        await self.db.commit()
        await self.db.refresh(self.category)
        await self.db.refresh(self.customer)

        # Seed providers with different ratings & reliability
        self.p1 = User(
            name="High Rated Provider",
            email="p1@test.com",
            phone="8000000001",
            password_hash="hash",
            role=UserRole.PROVIDER,
            status=UserStatus.ACTIVE,
            district="Ernakulam",
            service_categories=json.dumps([self.category.id]),
            average_rating=4.9,
            reliability_score=98.0,
            total_bookings_completed=50,
        )
        self.p2 = User(
            name="Medium Rated Provider",
            email="p2@test.com",
            phone="8000000002",
            password_hash="hash",
            role=UserRole.PROVIDER,
            status=UserStatus.ACTIVE,
            district="Ernakulam",
            service_categories=json.dumps([self.category.id]),
            average_rating=4.2,
            reliability_score=85.0,
            total_bookings_completed=10,
        )
        self.p3 = User(
            name="Low Rated Provider",
            email="p3@test.com",
            phone="8000000003",
            password_hash="hash",
            role=UserRole.PROVIDER,
            status=UserStatus.ACTIVE,
            district="Trivandrum",  # Different district
            service_categories=json.dumps([self.category.id]),
            average_rating=3.5,
            reliability_score=70.0,
            total_bookings_completed=2,
        )
        self.db.add_all([self.p1, self.p2, self.p3])
        await self.db.commit()

    def test_rank_providers(self):
        ranked = MatchingService.rank_providers([self.p2, self.p1])
        # High rated provider should be ranked first
        self.assertEqual(ranked[0].id, self.p1.id)
        self.assertEqual(ranked[1].id, self.p2.id)

    def test_generate_verification_code(self):
        code = MatchingService._generate_verification_code()
        self.assertEqual(len(code), 6)
        self.assertTrue(code.isdigit())

    async def test_find_available_providers(self):
        # Find providers for Ernakulam district (should be p1, p2)
        matching = await MatchingService.find_available_providers(
            self.db,
            service_category_id=self.category.id,
            district="Ernakulam"
        )
        matching_ids = [p.id for p in matching]
        self.assertIn(self.p1.id, matching_ids)
        self.assertIn(self.p2.id, matching_ids)
        self.assertNotIn(self.p3.id, matching_ids) # p3 is in Trivandrum

    async def test_assign_provider(self):
        booking = Booking(
            booking_number="CNST-0001",
            customer_id=self.customer.id,
            service_category_id=self.category.id,
            pickup_address="Kochi Metro Station",
            pickup_latitude=9.9816,
            pickup_longitude=76.2999,
            duration_hours=2.0,
            estimated_price=Decimal("4500.00"),
            status=BookingStatus.CREATED,
        )
        self.db.add(booking)
        await self.db.commit()
        await self.db.refresh(booking)

        updated_booking = await MatchingService.assign_provider(self.db, booking, self.p1)
        self.assertEqual(updated_booking.provider_id, self.p1.id)
        self.assertEqual(updated_booking.status, BookingStatus.ASSIGNED)
        self.assertIsNotNone(updated_booking.verification_code)
        self.assertEqual(len(updated_booking.verification_code), 6)
