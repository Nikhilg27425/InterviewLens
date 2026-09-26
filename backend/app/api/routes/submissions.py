import uuid
import json
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.db.base import get_db
from app.models.session import InterviewSession, SessionStatus
from app.models.problem import Problem
from app.models.submission import Submission
from app.models.user import User
from app.schemas.submission import RunRequest, RunResponse, TestCaseResult, SubmissionOut
from app.services import judge0 as j0
from app.api.deps import get_current_user, get_session_for_user
from app.websocket.manager import manager  # broadcast results to interviewer room

router = APIRouter(prefix="/submissions", tags=["submissions"])


@router.post("/run", response_model=RunResponse)
async def run_code(
    body: RunRequest,
    background: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Validate session
    sess = await get_session_for_user(body.session_id, db, current_user)
    if sess.status not in (SessionStatus.active, SessionStatus.waiting):
        raise HTTPException(400, "Session is not active")

    # Load problem + test cases
    prob = (await db.execute(
        select(Problem).options(selectinload(Problem.test_cases)).where(Problem.id == body.problem_id)
    )).scalar_one_or_none()
    if not prob:
        raise HTTPException(404, "Problem not found")

    # Only run non-hidden test cases for "run" (not final submit)
    visible_cases = [
        {"label": tc.label, "stdin": tc.stdin, "expected": tc.expected}
        for tc in sorted(prob.test_cases, key=lambda t: t.order_index)
        if not (tc.is_hidden and not body.is_final)
    ]

    try:
        raw_results = await j0.run_all(body.source_code, body.language, visible_cases)
    except Exception as e:
        raise HTTPException(502, f"Code execution failed: {e}")

    # Aggregate
    passed = sum(1 for r in raw_results if r["passed"])
    total  = len(raw_results)

    runtimes = [float(r["time"].rstrip("ms")) for r in raw_results if r.get("time")]
    memories = [float(r["memory"].rstrip(" KB")) for r in raw_results if r.get("memory")]

    # Persist submission
    sub = Submission(
        session_id=body.session_id,
        problem_id=body.problem_id,
        candidate_id=current_user.id,
        language=body.language,
        source_code=body.source_code,
        results_json=json.dumps(raw_results),
        passed_cases=passed,
        total_cases=total,
        is_accepted=(passed == total),
        avg_runtime_ms=sum(runtimes) / len(runtimes) if runtimes else None,
        avg_memory_kb=sum(memories) / len(memories) if memories else None,
        is_final=body.is_final,
    )
    db.add(sub)
    await db.flush()

    # Broadcast to interviewer's live session room
    background.add_task(
        manager.broadcast_to_session,
        str(body.session_id),
        {
            "type":          "code_run",
            "submission_id": str(sub.id),
            "problem_id":    str(body.problem_id),
            "language":      body.language,
            "passed":        passed,
            "total":         total,
            "is_accepted":   passed == total,
            "is_final":      body.is_final,
        },
    )

    results = [
        TestCaseResult(
            id=r["id"],
            input=r["input"],
            expected=r.get("expected", ""),
            stdout=r.get("stdout", ""),
            stderr=r.get("stderr", ""),
            compile_error=r.get("compile_error", ""),
            passed=r["passed"],
            status_label=r["status_label"],
            status_type=r["status_type"],
            time=r.get("time"),
            memory=r.get("memory"),
        )
        for r in raw_results
    ]

    return RunResponse(
        submission_id=sub.id,
        passed_cases=passed,
        total_cases=total,
        is_accepted=passed == total,
        results=results,
    )


@router.post("/run-custom")
async def run_custom(
    session_id: uuid.UUID,
    language: str,
    source_code: str,
    stdin: str = "",
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await get_session_for_user(session_id, db, current_user)
    try:
        result = await j0.run_custom(source_code, language, stdin)
    except Exception as e:
        raise HTTPException(502, f"Execution failed: {e}")
    return result


@router.get("/session/{session_id}", response_model=list[SubmissionOut])
async def list_session_submissions(
    session_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await get_session_for_user(session_id, db, current_user)
    result = await db.execute(
        select(Submission)
        .where(Submission.session_id == session_id)
        .order_by(Submission.submitted_at.desc())
    )
    return result.scalars().all()
