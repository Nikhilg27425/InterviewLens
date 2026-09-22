import asyncio
from app.db.base import AsyncSessionLocal
from app.models.user import User
from sqlalchemy import select

async def check_user():
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.email == 'interviewer@test.com'))
        user = result.scalar_one_or_none()
        
        if user:
            print(f"✓ User found: {user.email}")
            print(f"  Role: {user.role}")
            print(f"  User ID: {user.id}")
            print(f"  Full Name: {user.full_name}")
        else:
            print("✗ User not found")

if __name__ == "__main__":
    asyncio.run(check_user())
