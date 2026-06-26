import asyncio
from unittest import IsolatedAsyncioTestCase
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from app.db.base import Base
import app.models  # Ensure models are imported for metadata discovery

class AsyncDatabaseTestCase(IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        # Create an in-memory SQLite engine
        self.engine = create_async_engine("sqlite+aiosqlite://", echo=False)
        self.AsyncSessionLocal = async_sessionmaker(
            self.engine,
            class_=AsyncSession,
            expire_on_commit=False,
        )
        
        # Create all tables in the database
        async with self.engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
            
        self.db = self.AsyncSessionLocal()

    async def asyncTearDown(self):
        if hasattr(self, "db"):
            await self.db.close()
        if hasattr(self, "engine"):
            async with self.engine.begin() as conn:
                await conn.run_sync(Base.metadata.drop_all)
            await self.engine.dispose()
