import uuid
import secrets
import string
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.base import get_db
from app.models.session import InterviewSession, SessionStatus
from app.models.problem import Problem
from app.models.user import User, UserRole
from app.schemas.session import (
    SessionCreate, SessionUpdate, SessionOut, SessionSummary, InviteStatus, InvitePreview,
)
from app.services import email as mailer
from app.api.deps import get_current_user, require_interviewer

router = APIRouter(prefix="/sessions", tags=["sessions"])

CLOSED = (SessionStatus.completed, SessionStatus.cancelled)


def _generate_token() -> str:
    """Generate a human-readable 4-part access token like ABCD-1234-EFGH-5678."""
    parts = []
    for i in range(4):
        alphabet = string.ascii_uppercase if i % 2 == 0 else string.digits
        parts.append("".join(secrets.choice(alphabet) for _ in range(4)))
    return "-".join(parts)


async def _owned_session(session_id: uuid.UUID, db: AsyncSession, user: User) -> InterviewSession:
    session = (await db.execute(
        select(InterviewSession).where(InterviewSession.id == session_id)
    )).scalar_one_or_none()
    if not session:
        raise HTTPException(404, "Session not found")
    if session.interviewer_id != user.id and user.role != UserRole.admin:
        raise HTTPException(403, "Not your session")
    return session


def _problem_count(session: InterviewSession) -> int:
    return len([p for p in (session.problem_ids or "").split(",") if p])


def _render_invite(session: InterviewSession, interviewer: User) -> mailer.RenderedEmail:
    return mailer.render_invite(session, interviewer.full_name, interviewer.company, _problem_count(session))


async def _send_invite(session: InterviewSession, interviewer: User) -> InviteStatus:
    result = await mailer.send_email(_render_invite(session, interviewer))
    if result.sent or result.mode == "outbox":
        session.invite_sent_at = datetime.now(timezone.utc)
    return InviteStatus(sent=result.sent, mode=result.mode, detail=result.detail)


def _out(session: InterviewSession, invite: InviteStatus | None = None) -> SessionOut:
    out = SessionOut.model_validate(session)
    out.invite = invite
    return out


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
    # Only accept problems that exist, preserving the requested order
    problem_ids: list[str] = []
    if body.problem_ids:
        try:
            wanted = [uuid.UUID(p) for p in body.problem_ids]
        except ValueError:
            raise HTTPException(422, "Invalid problem id")
        found = set((await db.execute(select(Problem.id).where(Problem.id.in_(wanted)))).scalars().all())
        missing = [str(p) for p in wanted if p not in found]
        if missing:
            raise HTTPException(422, f"Unknown problem(s): {', '.join(missing)}")
        problem_ids = [str(p) for p in wanted]

    token = _generate_token()
    while (await db.execute(select(InterviewSession).where(InterviewSession.access_token == token))).scalar_one_or_none():
        token = _generate_token()

    session = InterviewSession(
        access_token=token,
        title=body.title,
        interviewer_id=current_user.id,
        duration_minutes=body.duration_minutes,
        problem_ids=",".join(problem_ids) if problem_ids else None,
        candidate_name=body.candidate_name,
        candidate_email=body.candidate_email.strip().lower() if body.candidate_email else None,
        candidate_role=body.candidate_role,
        scheduled_at=body.scheduled_at,
        status=SessionStatus.scheduled,
    )
    db.add(session)
    await db.flush()

    invite = None
    if body.send_invite and session.candidate_email:
        invite = await _send_invite(session, current_user)
        await db.flush()

    await db.refresh(session)
    return _out(session, invite)


@router.get("/by-token/{access_token}", response_model=SessionOut)
async def get_session_by_token(
    access_token: str,
    db: AsyncSession = Depends(get_db),
):
    """Public endpoint — used by candidate login page to validate the token."""
    result = await db.execute(
        select(InterviewSession).where(InterviewSession.access_token == access_token.strip().upper())
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(404, "Invalid access token")
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
    if current_user.role == UserRole.interviewer and session.interviewer_id != current_user.id:
        raise HTTPException(403, "Not your session")
    if current_user.role == UserRole.candidate and session.candidate_id != current_user.id:
        raise HTTPException(403, "Not your session")
    return session


@router.patch("/{session_id}", response_model=SessionOut)
async def update_session(
    session_id: uuid.UUID,
    body: SessionUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_interviewer),
):
    session = await _owned_session(session_id, db, current_user)
    for field, value in body.model_dump(exclude_unset=True).items():
        if field == "candidate_email" and value:
            value = value.strip().lower()
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
    session = await _owned_session(session_id, db, current_user)
    if session.status in CLOSED:
        raise HTTPException(409, "Session is no longer active")
    if session.status == SessionStatus.active:
        return session  # idempotent
    session.status = SessionStatus.active
    session.started_at = session.started_at or datetime.now(timezone.utc)
    await db.flush()
    await db.refresh(session)
    return session


@router.post("/{session_id}/end", response_model=SessionOut)
async def end_session(
    session_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_interviewer),
):
    session = await _owned_session(session_id, db, current_user)
    session.status = SessionStatus.completed
    session.ended_at = datetime.now(timezone.utc)
    await db.flush()
    await db.refresh(session)
    return session


@router.post("/{session_id}/cancel", response_model=SessionOut)
async def cancel_session(
    session_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_interviewer),
):
    """Withdraw an interview; its access token stops working."""
    session = await _owned_session(session_id, db, current_user)
    if session.status == SessionStatus.completed:
        raise HTTPException(409, "Completed sessions can't be cancelled")
    session.status = SessionStatus.cancelled
    session.ended_at = session.ended_at or datetime.now(timezone.utc)
    await db.flush()
    await db.refresh(session)
    return session


@router.post("/{session_id}/invite", response_model=SessionOut)
async def resend_invite(
    session_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_interviewer),
):
    session = await _owned_session(session_id, db, current_user)
    if not session.candidate_email:
        raise HTTPException(400, "Add a candidate email before sending an invite")
    if session.status in CLOSED:
        raise HTTPException(409, "Session is no longer active")
    invite = await _send_invite(session, current_user)
    await db.flush()
    await db.refresh(session)
    return _out(session, invite)


@router.get("/{session_id}/invite-preview", response_model=InvitePreview)
async def invite_preview(
    session_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_interviewer),
):
    """The exact invite the candidate receives — shown in-app, and the only way
    to see it locally when SMTP isn't configured."""
    session = await _owned_session(session_id, db, current_user)
    if not session.candidate_email:
        raise HTTPException(400, "This session has no candidate email")
    rendered = _render_invite(session, current_user)
    return InvitePreview(
        to=rendered.to, subject=rendered.subject, html=rendered.html,
        login_link=mailer.candidate_login_link(session.candidate_email, session.access_token),
    )


@router.post("/{session_id}/join", response_model=SessionOut)
async def join_session(
    session_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Candidate clicks "Begin Interview" — the session goes live and the clock starts."""
    result = await db.execute(select(InterviewSession).where(InterviewSession.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(404, "Session not found")
    if session.candidate_id != current_user.id:
        raise HTTPException(403, "Not your session")
    if session.status in CLOSED:
        raise HTTPException(410, "Session is no longer active")
    if session.status != SessionStatus.active:
        session.status = SessionStatus.active
        session.started_at = session.started_at or datetime.now(timezone.utc)
        await db.flush()
        await db.refresh(session)
    return session
