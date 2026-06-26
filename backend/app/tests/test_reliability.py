from app.tests.base import AsyncDatabaseTestCase
from app.models.user import User, UserRole, UserStatus
from app.services.reliability_service import ReliabilityService

class TestReliabilityService(AsyncDatabaseTestCase):
    async def asyncSetUp(self):
        await super().asyncSetUp()
        # Create a test provider
        self.provider = User(
            name="Test Provider",
            email="provider@test.com",
            phone="9876543210",
            password_hash="hash",
            role=UserRole.PROVIDER,
            status=UserStatus.ACTIVE,
            reliability_score=100.0,
        )
        self.db.add(self.provider)
        await self.db.commit()
        await self.db.refresh(self.provider)

    async def test_update_reliability_accept(self):
        new_score = await ReliabilityService.update_reliability_score(self.db, self.provider.id, "accept")
        self.assertEqual(new_score, 100.0) # Cannot exceed 100.0

    async def test_update_reliability_decline(self):
        new_score = await ReliabilityService.update_reliability_score(self.db, self.provider.id, "decline")
        self.assertEqual(new_score, 98.0) # 100.0 - 2.0 = 98.0

    async def test_update_reliability_timeout(self):
        new_score = await ReliabilityService.update_reliability_score(self.db, self.provider.id, "timeout")
        self.assertEqual(new_score, 95.0) # 100.0 - 5.0 = 95.0

    async def test_update_reliability_cancel(self):
        new_score = await ReliabilityService.update_reliability_score(self.db, self.provider.id, "cancel")
        self.assertEqual(new_score, 85.0) # 100.0 - 15.0 = 85.0

    async def test_update_reliability_complete(self):
        # Set score to 90.0 first
        self.provider.reliability_score = 90.0
        await self.db.commit()
        new_score = await ReliabilityService.update_reliability_score(self.db, self.provider.id, "complete")
        self.assertEqual(new_score, 92.0) # 90.0 + 2.0 = 92.0

    async def test_update_reliability_min_clamp(self):
        # Set score to 5.0
        self.provider.reliability_score = 5.0
        await self.db.commit()
        new_score = await ReliabilityService.update_reliability_score(self.db, self.provider.id, "cancel")
        self.assertEqual(new_score, 0.0) # Clamped to 0.0
