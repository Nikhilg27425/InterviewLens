import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.db.base import get_db
from app.models.signal import ProctoringSignal, RISK_MAP, SignalType, RiskLevel
from app.models.session import InterviewSession, SessionStatus
from app.models.user import User
from app.schemas.signal import SignalCreate, SignalOut, SignalBatch
from app.api.deps import get_current_user
from app.websocket.manager import manager

router = APIRouter(prefix="/signals", tags=["signals"])


async def _save_signal(db: AsyncSession, sig: SignalCreate, candidate_id: uuid.UUID) -> ProctoringSignal:
    risk = RISK_MAP.get(sig.signal_type, RiskLevel.info)
    record = ProctoringSignal(
        session_id=sig.session_id,
        candidate_id=candidate_id,
        signal_type=sig.signal_type,
        risk_level=risk,
        detail=sig.detail,
        elapsed_seconds=sig.elapsed_seconds,
    )
    db.add(record)
    return record


@router.post("", response_model=SignalOut, status_code=201)
async def record_signal(
    body: SignalCreate,
    background: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    sess = (await db.execute(
        select(InterviewSession).where(InterviewSession.id == body.session_id)
    )).scalar_one_or_none()
    if not sess:
        raise HTTPException(404, "Session not found")

    record = await _save_signal(db, body, current_user.id)
    await db.flush()
    await db.refresh(record)

    # Broadcast to interviewer room in background
    background.add_task(
        manager.broadcast_to_session,
        str(body.session_id),
        {
            "type":            "signal",
            "signal_type":     record.signal_type,
            "risk_level":      record.risk_level,
            "detail":          record.detail,
            "elapsed_seconds": record.elapsed_seconds,
            "timestamp":       record.timestamp.isoformat(),
        },
    )

    return record


@router.post("/batch", status_code=201)
async def record_signals_batch(
    body: SignalBatch,
    background: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Accept multiple signals at once (frontend batches every 5s)."""
    records = []
    for sig in body.signals:
        r = await _save_signal(db, sig, current_user.id)
        records.append(r)

    await db.flush()

    # Batch broadcast
    for r in records:
        await db.refresh(r)
        background.add_task(
            manager.broadcast_to_session,
            str(r.session_id),
            {
                "type":            "signal",
                "signal_type":     r.signal_type,
                "risk_level":      r.risk_level,
                "detail":          r.detail,
                "elapsed_seconds": r.elapsed_seconds,
                "timestamp":       r.timestamp.isoformat(),
            },
        )

    return {"saved": len(records)}


@router.get("/session/{session_id}", response_model=list[SignalOut])
async def get_session_signals(
    session_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(
        select(ProctoringSignal)
        .where(ProctoringSignal.session_id == session_id)
        .order_by(ProctoringSignal.timestamp)
    )
    return result.scalars().all()


@router.get("/session/{session_id}/summary")
async def get_signal_summary(
    session_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Return counts per signal type + per risk level."""
    result = await db.execute(
        select(ProctoringSignal.signal_type, ProctoringSignal.risk_level, func.count())
        .where(ProctoringSignal.session_id == session_id)
        .group_by(ProctoringSignal.signal_type, ProctoringSignal.risk_level)
    )
    rows = result.all()
    by_type = {}
    by_risk = {}
    for signal_type, risk_level, count in rows:
        by_type[signal_type] = by_type.get(signal_type, 0) + count
        by_risk[risk_level]  = by_risk.get(risk_level, 0) + count

    total_risk_score = (
        by_risk.get("critical", 0) * 25 +
        by_risk.get("high", 0)     * 15 +
        by_risk.get("medium", 0)   *  8 +
        by_risk.get("low", 0)      *  3
    )

    return {
        "by_type":          by_type,
        "by_risk":          by_risk,
        "total_signals":    sum(c for _, _, c in rows),
        "risk_score":       min(100, total_risk_score),
    }
