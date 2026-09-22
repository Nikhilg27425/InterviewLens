import asyncio
from app.db.base import AsyncSessionLocal
from app.models.session import InterviewSession
from sqlalchemy import select

async def check_session():
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(InterviewSession).where(
                InterviewSession.id == 'dd2172dd-73eb-4d91-a853-90e5d4491b91'
            )
        )
        session = result.scalar_one_or_none()
        
        if session:
            print(f"✓ Session found")
            print(f"  ID: {session.id}")
            print(f"  Title: {session.title}")
            print(f"  Status: {session.status}")
            print(f"  Candidate ID: {session.candidate_id}")
            print(f"  Candidate Email: {session.candidate_email}")
            print(f"  Interviewer ID: {session.interviewer_id}")
            print(f"  Access Token: {session.access_token}")
        else:
            print("✗ Session not found")

if __name__ == "__main__":
    asyncio.run(check_session())
