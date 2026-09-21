from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.base import get_db
from app.models.user import User, UserRole
from app.models.session import InterviewSession, SessionStatus
from app.core.security import hash_password, verify_password, create_access_token
from app.schemas.user import UserCreate, UserLogin, CandidateLogin, TokenResponse, UserOut, CandidateCreate
from app.api.deps import get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])


# ── Interviewer registration ──────────────────────────────────────────────────

@router.post("/register", response_model=UserOut, status_code=201)
async def register_interviewer(body: UserCreate, db: AsyncSession = Depends(get_db)):
    existing = (await db.execute(select(User).where(User.email == body.email))).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        email=body.email,
        full_name=body.full_name,
        hashed_password=hash_password(body.password),
        role=body.role,
        company=body.company,
    )
    db.add(user)
    await db.flush()
    return user


# ── Interviewer login ─────────────────────────────────────────────────────────

@router.post("/login", response_model=TokenResponse)
async def login_interviewer(body: UserLogin, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()
    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account disabled")
    if user.role == UserRole.candidate:
        raise HTTPException(status_code=403, detail="Use /auth/candidate/login for candidates")

    token = create_access_token(str(user.id), extra={"role": user.role})
    return TokenResponse(
        access_token=token,
        role=user.role,
        user_id=str(user.id),
        full_name=user.full_name,
    )


# ── Candidate login (email + session access token) ────────────────────────────

@router.post("/candidate/login", response_model=TokenResponse)
async def login_candidate(body: CandidateLogin, db: AsyncSession = Depends(get_db)):
    # Verify session token exists and is not completed/cancelled
    sess_result = await db.execute(
        select(InterviewSession).where(InterviewSession.access_token == body.access_token)
    )
    session = sess_result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Invalid access token")
    if session.status in (SessionStatus.completed, SessionStatus.cancelled):
        raise HTTPException(status_code=410, detail="Session is no longer active")

    # Get or create candidate user
    user_result = await db.execute(select(User).where(User.email == body.email))
    user = user_result.scalar_one_or_none()

    if not user:
        # Auto-create candidate account on first login
        user = User(
            email=body.email,
            full_name=session.candidate_name or body.email.split("@")[0],
            hashed_password=hash_password(body.access_token),  # token is the initial password
            role=UserRole.candidate,
        )
        db.add(user)
        await db.flush()

    # Link candidate to session if not already linked
    if session.candidate_id is None:
        session.candidate_id = user.id
        if not session.candidate_name:
            session.candidate_name = user.full_name

    token = create_access_token(str(user.id), extra={"role": user.role, "session_id": str(session.id)})
    return TokenResponse(
        access_token=token,
        role=user.role,
        user_id=str(user.id),
        full_name=user.full_name,
    )


# ── Current user ──────────────────────────────────────────────────────────────

@router.get("/me", response_model=UserOut)
async def me(current_user: User = Depends(get_current_user)):
    return current_user
