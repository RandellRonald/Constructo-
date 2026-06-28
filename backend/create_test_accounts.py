import asyncio
from app.db.session import AsyncSessionLocal, engine
from app.db.base import Base
from app.models.user import UserRole, UserStatus
from app.services.auth_service import AuthService

async def main():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    async with AsyncSessionLocal() as db:
        try:
            user = await AuthService.register(db, 'QA Customer', 'qa.customer@example.com', '+919999000001', 'TestPass123!', 'customer')
            print('customer', user.id, user.email, user.phone, user.status)
        except Exception as e:
            print('customer_error', e)
        try:
            provider = await AuthService.register(db, 'QA Provider', 'qa.provider@example.com', '+919999000002', 'TestPass123!', 'provider', business_name='QA Construction', district='Kochi')
            print('provider', provider.id, provider.email, provider.phone, provider.status)
        except Exception as e:
            print('provider_error', e)
        try:
            admin = await AuthService.register(db, 'QA Admin', 'qa.admin@example.com', '+919999000003', 'TestPass123!', 'customer')
            admin.role = UserRole.ADMIN
            admin.status = UserStatus.ACTIVE
            await db.flush()
            print('admin', admin.id, admin.email, admin.phone, admin.role, admin.status)
        except Exception as e:
            print('admin_error', e)
        await db.commit()

asyncio.run(main())
