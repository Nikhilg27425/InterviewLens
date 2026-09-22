import asyncio
from app.db.base import AsyncSessionLocal
from app.models.session import InterviewSession, SessionStatus
from sqlalchemy import select

async def start_session():
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(InterviewSession).where(
                InterviewSession.id == 'dd2172dd-73eb-4d91-a853-90e5d4491b91'
            )
        )
        session = result.scalar_one_or_none()
        
        if session:
            print(f"Before: Status = {session.status}")
            session.status = SessionStatus.active
            await db.commit()
            print(f"After: Status = {session.status}")
            print(f"✓ Session is now live!")
        else:
            print("✗ Session not found")

if __name__ == "__main__":
    asyncio.run(start_session())
