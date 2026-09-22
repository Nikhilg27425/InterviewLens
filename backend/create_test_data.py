"""
Script to create test data for InterviewLens
Creates test interviewer and candidate credentials
"""
import asyncio
import secrets
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from app.core.config import settings
from app.core.security import hash_password
from app.models.user import User
from app.models.session import InterviewSession
from app.models.problem import Problem

async def create_test_data():
    # Create async engine
    engine = create_async_engine(settings.DATABASE_URL, echo=True)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        async with session.begin():
            # Create test interviewer
            interviewer_email = "interviewer@test.com"
            from sqlalchemy import select
            
            result = await session.execute(
                select(User).where(User.email == interviewer_email)
            )
            existing_interviewer = result.scalar_one_or_none()
            
            if not existing_interviewer:
                interviewer = User(
                    email=interviewer_email,
                    full_name="Test Interviewer",
                    hashed_password=hash_password("password123"),
                    role="interviewer"
                )
                session.add(interviewer)
                await session.flush()
                print(f"✓ Created interviewer: {interviewer_email} / password123")
            else:
                interviewer = existing_interviewer
                print(f"✓ Interviewer already exists: {interviewer_email}")
            
            # Create test candidate credentials
            candidate_email = "candidate@test.com"
            access_token = f"{secrets.token_hex(2).upper()}-{secrets.token_hex(2).upper()}-{secrets.token_hex(2).upper()}-{secrets.token_hex(2).upper()}"
            
            # Check if session already exists
            result = await session.execute(
                select(InterviewSession).where(InterviewSession.candidate_email == candidate_email)
            )
            existing_session = result.scalar_one_or_none()
            
            if not existing_session:
                # Create a test problem first
                problem = Problem(
                    title="Two Sum",
                    description="Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.",
                    difficulty="Easy",
                    starter_code_python="def twoSum(nums, target):\n    pass",
                    starter_code_javascript="function twoSum(nums, target) {\n    // your code here\n}",
                    starter_code_java="class Solution {\n    public int[] twoSum(int[] nums, int target) {\n        // your code here\n    }\n}"
                )
                session.add(problem)
                await session.flush()
                
                # Get or create candidate user
                candidate_result = await session.execute(
                    select(User).where(User.email == candidate_email)
                )
                candidate_user = candidate_result.scalar_one_or_none()
                
                if not candidate_user:
                    candidate_user = User(
                        email=candidate_email,
                        full_name="Test Candidate",
                        role="candidate",
                        hashed_password=None  # Candidates don't need passwords
                    )
                    session.add(candidate_user)
                    await session.flush()
                    print(f"✓ Created candidate user: {candidate_email}")
                
                # Create interview session linked to BOTH interviewer and candidate
                interview_session = InterviewSession(
                    title="Technical Interview - Full Stack Role",
                    interviewer_id=interviewer.id,
                    candidate_id=candidate_user.id,  # Link to candidate user
                    problem_ids=str(problem.id),
                    access_token=access_token,
                    candidate_name="Test Candidate",
                    candidate_email=candidate_email,
                    candidate_role="Full Stack Developer",
                    duration_minutes=60,
                    status="scheduled"
                )
                session.add(interview_session)
                await session.commit()
                print(f"✓ Created interview session: {candidate_email}")
                print(f"  Access Token: {access_token}")
                print(f"  Linked to interviewer: {interviewer.email}")
            else:
                print(f"✓ Interview session already exists: {candidate_email}")
                print(f"  Access Token: {existing_session.access_token}")
                access_token = existing_session.access_token
    
    await engine.dispose()
    print("\n✅ Test data creation complete!")
    print("\nTest Credentials:")
    print("================")
    print("Interviewer Login:")
    print(f"  Email: interviewer@test.com")
    print(f"  Password: password123")
    print("\nCandidate Login:")
    print(f"  Email: candidate@test.com")
    print(f"  Token: {access_token}")

if __name__ == "__main__":
    asyncio.run(create_test_data())
