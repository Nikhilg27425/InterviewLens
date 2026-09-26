"""
Analytics API — behavioral timeline, code snapshots, similarity analysis.
"""
import uuid
import json
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.db.base import get_db
from app.models.snapshot import CodeSnapshot
from app.models.similarity import SimilarityReport
from app.models.submission import Submission
from app.models.problem import Problem
from app.models.user import User
from app.models.signal import ProctoringSignal, RiskLevel
from app.models.session import InterviewSession, SessionStatus
from app.schemas.analytics import (
    SnapshotCreate, BehavioralTimeline, EngagementPoint, SimilarityReportOut,
)
from app.services.similarity import compare_against_corpus
from app.api.deps import get_current_user, get_session_for_user, require_interviewer
from app.websocket.manager import manager

router = APIRouter(prefix="/analytics", tags=["analytics"])


# ── Code snapshots ────────────────────────────────────────────────────────────

@router.post("/snapshot", status_code=201)
async def save_snapshot(
    body: SnapshotCreate,
    background: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Called from the frontend every 30s or on significant code change."""
    await get_session_for_user(body.session_id, db, current_user)
    # Get previous snapshot to compute delta
    prev_result = await db.execute(
        select(CodeSnapshot)
        .where(
            CodeSnapshot.session_id == body.session_id,
            CodeSnapshot.problem_id == body.problem_id,
        )
        .order_by(CodeSnapshot.captured_at.desc())
        .limit(1)
    )
    prev = prev_result.scalar_one_or_none()

    prev_code  = prev.source_code if prev else ""
    chars_added   = max(0, len(body.source_code) - len(prev_code))
    chars_removed = max(0, len(prev_code) - len(body.source_code))

    snap = CodeSnapshot(
        session_id=body.session_id,
        problem_id=body.problem_id,
        language=body.language,
        source_code=body.source_code,
        char_count=len(body.source_code),
        chars_added=chars_added,
        chars_removed=chars_removed,
        keystroke_rate=body.keystroke_rate,
        elapsed_seconds=body.elapsed_seconds,
    )
    db.add(snap)
    await db.flush()

    # Async similarity check against the starter code
    if body.problem_id:
        background.add_task(
            _run_similarity_check,
            body.session_id,
            body.problem_id,
            body.language,
            body.source_code,
        )

    # Broadcast updated engagement to interviewer
    background.add_task(
        manager.broadcast_to_session,
        str(body.session_id),
        {
            "type":           "snapshot",
            "elapsed_seconds": body.elapsed_seconds,
            "char_count":      len(body.source_code),
            "chars_added":     chars_added,
            "keystroke_rate":  body.keystroke_rate,
            "language":        body.language,
        },
    )

    return {"saved": True}


async def _run_similarity_check(session_id, problem_id, language, source_code):
    """Background task: compare candidate code against starter/reference corpus."""
    from app.db.base import AsyncSessionLocal
    from sqlalchemy.orm import selectinload

    async with AsyncSessionLocal() as db:
        prob = (await db.execute(
            select(Problem).options(selectinload(Problem.test_cases)).where(Problem.id == problem_id)
        )).scalar_one_or_none()
        if not prob:
            return

        try:
            starter = json.loads(prob.starter_code or "{}")
        except Exception:
            starter = {}

        corpus = [{"label": f"starter_{lang}", "code": code} for lang, code in starter.items() if code]
        if not corpus:
            return

        result_tuple = compare_against_corpus(source_code, language, corpus)
        if not result_tuple:
            return

        result, matched_label = result_tuple

        report = SimilarityReport(
            session_id=session_id,
            problem_id=problem_id,
            language=language,
            overall_score=result.overall_score * 100,
            structural_score=result.structural_score * 100,
            token_score=result.token_score * 100,
            literal_score=result.literal_score * 100,
            matched_source=matched_label,
            source_type="internal",
            is_flagged=result.is_flagged,
            diff_json=result.diff_json,
        )
        db.add(report)
        await db.commit()

        # Broadcast to interviewer if flagged
        if result.is_flagged:
            await manager.broadcast_to_session(
                str(session_id),
                {
                    "type":          "similarity_alert",
                    "overall_score": report.overall_score,
                    "is_flagged":    True,
                    "language":      language,
                },
            )


# ── Behavioral timeline ───────────────────────────────────────────────────────

@router.get("/session/{session_id}/timeline", response_model=BehavioralTimeline)
async def get_behavioral_timeline(
    session_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await get_session_for_user(session_id, db, current_user)
    # Engagement from snapshots
    snaps_result = await db.execute(
        select(CodeSnapshot)
        .where(CodeSnapshot.session_id == session_id)
        .order_by(CodeSnapshot.elapsed_seconds)
    )
    snaps = snaps_result.scalars().all()

    engagement = [
        EngagementPoint(
            elapsed_seconds=s.elapsed_seconds or 0,
            keystroke_rate=s.keystroke_rate or 0.0,
            char_count=s.char_count,
        )
        for s in snaps
    ]

    # Signals
    sigs_result = await db.execute(
        select(ProctoringSignal)
        .where(ProctoringSignal.session_id == session_id)
        .order_by(ProctoringSignal.elapsed_seconds)
    )
    signals = [
        {
            "type":             s.signal_type,
            "risk_level":       s.risk_level,
            "elapsed_seconds":  s.elapsed_seconds,
            "timestamp":        s.timestamp.isoformat(),
            "detail":           s.detail,
        }
        for s in sigs_result.scalars().all()
    ]

    # Composite scores
    high_risk_sigs = [s for s in signals if s["risk_level"] in ("high", "critical")]
    risk_score = min(100.0, len(high_risk_sigs) * 15.0)

    avg_keystroke = (
        sum(e.keystroke_rate for e in engagement) / len(engagement)
        if engagement else 0.0
    )
    focus_score = min(100.0, avg_keystroke * 10)

    return BehavioralTimeline(
        session_id=session_id,
        engagement=engagement,
        signals=signals,
        risk_score=risk_score,
        focus_score=focus_score,
    )


# ── Similarity reports ────────────────────────────────────────────────────────

@router.get("/session/{session_id}/similarity", response_model=list[SimilarityReportOut])
async def get_similarity_reports(
    session_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await get_session_for_user(session_id, db, current_user)
    result = await db.execute(
        select(SimilarityReport)
        .where(SimilarityReport.session_id == session_id)
        .order_by(SimilarityReport.overall_score.desc())
    )
    return result.scalars().all()


@router.post("/session/{session_id}/similarity/run")
async def run_similarity_now(
    session_id: uuid.UUID,
    problem_id: uuid.UUID,
    language: str,
    source_code: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """On-demand similarity scan (triggered by interviewer)."""
    await get_session_for_user(session_id, db, current_user)
    prob = (await db.execute(
        select(Problem).where(Problem.id == problem_id)
    )).scalar_one_or_none()
    if not prob:
        raise HTTPException(404, "Problem not found")

    try:
        starter = json.loads(prob.starter_code or "{}")
    except Exception:
        starter = {}

    corpus = [{"label": f"starter_{lang}", "code": code} for lang, code in starter.items() if code]
    result_tuple = compare_against_corpus(source_code, language, corpus)
    if not result_tuple:
        return {"message": "No corpus to compare against"}

    result, matched_label = result_tuple

    report = SimilarityReport(
        session_id=session_id,
        problem_id=problem_id,
        language=language,
        overall_score=result.overall_score * 100,
        structural_score=result.structural_score * 100,
        token_score=result.token_score * 100,
        literal_score=result.literal_score * 100,
        matched_source=matched_label,
        source_type="internal",
        is_flagged=result.is_flagged,
        diff_json=result.diff_json,
    )
    db.add(report)
    await db.flush()
    await db.refresh(report)
    return report


# ── Computed behavioral score ─────────────────────────────────────────────────

@router.get("/session/{session_id}/score")
async def get_session_score(
    session_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return computed engagement/focus/risk/integrity scores for a session."""
    await get_session_for_user(session_id, db, current_user)
    from app.services.analytics import compute_scores

    # Snapshots
    snaps = (await db.execute(
        select(CodeSnapshot)
        .where(CodeSnapshot.session_id == session_id)
        .order_by(CodeSnapshot.elapsed_seconds)
    )).scalars().all()

    # Signals
    sigs = (await db.execute(
        select(ProctoringSignal)
        .where(ProctoringSignal.session_id == session_id)
    )).scalars().all()

    # Similarity scores
    sim_scores = [
        r.overall_score for r in (await db.execute(
            select(SimilarityReport).where(SimilarityReport.session_id == session_id)
        )).scalars().all()
    ]

    result = compute_scores(
        snapshots=[{"elapsed_seconds": s.elapsed_seconds, "keystroke_rate": s.keystroke_rate, "char_count": s.char_count} for s in snaps],
        signals=[{"risk_level": s.risk_level.value, "signal_type": s.signal_type.value} for s in sigs],
        similarity_scores=sim_scores,
    )

    return {
        "session_id":       str(session_id),
        "engagement_score": result.engagement_score,
        "focus_score":      result.focus_score,
        "risk_score":       result.risk_score,
        "integrity_score":  result.integrity_score,
        "summary":          result.summary,
        "signal_count":     len(sigs),
        "snapshot_count":   len(snaps),
    }


# ── Interviewer-wide overview (dashboard + insights) ──────────────────────────

PASS_SCORE = 70


@router.get("/overview")
async def get_overview(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_interviewer),
):
    """Aggregates across all of the current interviewer's sessions."""
    sessions = (await db.execute(
        select(InterviewSession).where(InterviewSession.interviewer_id == current_user.id)
    )).scalars().all()
    ids = [s.id for s in sessions]

    # Signal counts per session per risk level
    per_session: dict[str, dict[str, int]] = {str(i): {"high": 0, "medium": 0, "low": 0} for i in ids}
    if ids:
        rows = (await db.execute(
            select(ProctoringSignal.session_id, ProctoringSignal.risk_level, func.count())
            .where(ProctoringSignal.session_id.in_(ids))
            .group_by(ProctoringSignal.session_id, ProctoringSignal.risk_level)
        )).all()
        for sid, risk, count in rows:
            bucket = "high" if risk in (RiskLevel.high, RiskLevel.critical) else risk.value
            if bucket in per_session[str(sid)]:
                per_session[str(sid)][bucket] += count

    scored = [s.final_score for s in sessions if s.final_score is not None]
    flagged_ids = {sid for sid, c in per_session.items() if c["high"] > 0}

    # Last 6 calendar months, oldest first
    now = datetime.now(timezone.utc)
    months = []
    y, m = now.year, now.month
    for _ in range(6):
        months.append((y, m))
        y, m = (y - 1, 12) if m == 1 else (y, m - 1)
    months.reverse()
    monthly = []
    for y, m in months:
        in_month = [s for s in sessions if s.created_at.year == y and s.created_at.month == m]
        monthly.append({
            "month": datetime(y, m, 1).strftime("%b"),
            "interviews": len(in_month),
            "passed": sum(1 for s in in_month if (s.final_score or 0) >= PASS_SCORE),
            "flagged": sum(1 for s in in_month if str(s.id) in flagged_ids),
        })

    buckets = [(0, 20), (21, 40), (41, 60), (61, 80), (81, 100)]
    distribution = [
        {"range": f"{lo}-{hi}", "count": sum(1 for sc in scored if lo <= sc <= hi)}
        for lo, hi in buckets
    ]

    return {
        "total_interviews": len(sessions),
        "completed": sum(1 for s in sessions if s.status == SessionStatus.completed),
        "avg_score": round(sum(scored) / len(scored), 1) if scored else None,
        "pass_rate": round(100 * sum(1 for sc in scored if sc >= PASS_SCORE) / len(scored)) if scored else None,
        "high_risk_signals": sum(c["high"] for c in per_session.values()),
        "flagged_sessions": len(flagged_ids),
        "per_session": per_session,
        "monthly": monthly,
        "score_distribution": distribution,
    }
