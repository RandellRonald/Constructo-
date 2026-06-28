import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select
from app.models.chat import ChatMessage
from app.models.user import User

async def test():
    engine = create_async_engine("sqlite+aiosqlite:///constructo.db")
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with async_session() as db:
        try:
            # Let's find a booking id from chat messages or bookings
            from app.models.booking import Booking
            b_res = await db.execute(select(Booking))
            bookings = b_res.scalars().all()
            for b in bookings:
                print(f"Booking ID: {b.id}, Customer: {b.customer_id}, Provider: {b.provider_id}")
                # Try querying chat history
                chat_result = await db.execute(
                    select(ChatMessage)
                    .where(ChatMessage.booking_id == b.id)
                    .order_by(ChatMessage.created_at.asc())
                )
                messages = chat_result.scalars().all()
                print(f"  Messages count: {len(messages)}")
                for msg in messages:
                    sender_res = await db.execute(select(User.name).where(User.id == msg.sender_id))
                    sender_name = sender_res.scalar() or "Unknown"
                    print(f"    Msg: {msg.message} from {sender_name}")
        except Exception as e:
            import traceback
            traceback.print_exc()

asyncio.run(test())
