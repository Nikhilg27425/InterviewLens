import uuid
import secrets
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.db.base import get_db
from app.models.session import InterviewSession, SessionStatus
from app.models.user import User
from app.schemas.session import SessionCreate, SessionUpdate, SessionOut, SessionSummary
from app.api.deps import get_current_user, require_interviewer

router = APIRouter(prefix="/sessions", tags=["sessions"])


def _generate_token() -> str:
    """Generate a human-readable 4-part access token like ABCD-1234-EFGH-5678."""
    import random, string
    parts = []
    for i in range(4):
        if i % 2 == 0:
            parts.append("".join(random.choices(string.ascii_uppercase, k=4)))
        else:
            parts.append("".join(random.choices(string.digits, k=4)))
    return "-".join(parts)


@router.get("", response_model=list[SessionSummary])
async def list_sessions(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_interviewer),
):
    result = await db.execute(
        select(InterviewSession)
        .where(InterviewSession.interviewer_id == current_user.id)
        .order_by(InterviewSession.created_at.desc())
    )
    return result.scalars().all()


@router.post("", response_model=SessionOut, status_code=201)
async def create_session(
    body: SessionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_interviewer),
):
    token = _generate_token()
    # Ensure uniqueness (collision is astronomically rare, but just in case)
    while (await db.execute(select(InterviewSession).where(InterviewSession.access_token == token))).scalar_one_or_none():
        token = _generate_token()

    session = InterviewSession(
        access_token=token,
        title=body.title,
        interviewer_id=current_user.id,
        duration_minutes=body.duration_minutes,
        problem_ids=",".join(body.problem_ids) if body.problem_ids else None,
        candidate_name=body.candidate_name,
        candidate_email=body.candidate_email,
        candidate_role=body.candidate_role,
        scheduled_at=body.scheduled_at,
        status=SessionStatus.scheduled,
    )
    db.add(session)
    await db.flush()
    await db.refresh(session)
    return session


@router.get("/{session_id}", response_model=SessionOut)
async def get_session(
    session_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(InterviewSession).where(InterviewSession.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(404, "Session not found")
    # Interviewers can only see their own; candidates can see their assigned session
    if current_user.role == "interviewer" and session.interviewer_id != current_user.id:
        raise HTTPException(403, "Not your session")
    return session


@router.patch("/{session_id}", response_model=SessionOut)
async def update_session(
    session_id: uuid.UUID,
    body: SessionUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_interviewer),
):
    result = await db.execute(select(InterviewSession).where(InterviewSession.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(404, "Session not found")
    if session.interviewer_id != current_user.id:
        raise HTTPException(403, "Not your session")

    for field, value in body.model_dump(exclude_none=True).items():
        setattr(session, field, value)

    await db.flush()
    await db.refresh(session)
    return session


@router.post("/{session_id}/start", response_model=SessionOut)
async def start_session(
    session_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_interviewer),
):
    result = await db.execute(select(InterviewSession).where(InterviewSession.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(404, "Session not found")
    if session.status == SessionStatus.active:
        return session  # idempotent
    session.status = SessionStatus.active
    session.started_at = datetime.now(timezone.utc)
    await db.flush()
    await db.refresh(session)
    return session


@router.post("/{session_id}/end", response_model=SessionOut)
async def end_session(
    session_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_interviewer),
):
    result = await db.execute(select(InterviewSession).where(InterviewSession.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(404, "Session not found")
    session.status = SessionStatus.completed
    session.ended_at = datetime.now(timezone.utc)
    await db.flush()
    await db.refresh(session)
    return session


@router.get("/by-token/{access_token}", response_model=SessionOut)
async def get_session_by_token(
    access_token: str,
    db: AsyncSession = Depends(get_db),
):
    """Public endpoint — used by candidate login page to validate the token."""
    result = await db.execute(
        select(InterviewSession).where(InterviewSession.access_token == access_token)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(404, "Invalid access token")
    return session
