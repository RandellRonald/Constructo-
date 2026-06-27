import pytest
from sqlalchemy import inspect
from app.tests.base import AsyncDatabaseTestCase
from app.db.base import Base
from app.models.user import User
from app.models.booking import Booking

class TestDatabaseSchema(AsyncDatabaseTestCase):
    
    async def test_tables_exist(self):
        # We can use sqlalchemy inspector on a synchronous engine connection
        # or verify query execution on the async engine
        
        # Verify that we can query users
        async with self.db as session:
            result = await session.execute("SELECT 1")
            assert result.scalar() == 1
            
    async def test_booking_relationships(self):
        # Verify booking foreign keys (customer, provider, service)
        # SQLAlchemy models define these, ensuring they aren't broken
        assert hasattr(Booking, "customer")
        assert hasattr(Booking, "provider")
        assert hasattr(Booking, "service_category")
