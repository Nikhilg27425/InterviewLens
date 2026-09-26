import re
import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from app.db.base import get_db
from app.models.problem import Problem, TestCase
from app.models.submission import Submission
from app.models.session import InterviewSession, SessionStatus
from app.models.user import User, UserRole
from app.schemas.problem import ProblemCreate, ProblemOut, ProblemSummary
from app.api.deps import get_current_user, require_interviewer

router = APIRouter(prefix="/problems", tags=["problems"])


def _slugify(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")[:100] or "problem"


async def _unique_slug(db: AsyncSession, base: str, exclude_id: uuid.UUID | None = None) -> str:
    slug, n = base, 2
    while True:
        q = select(Problem.id).where(Problem.slug == slug)
        if exclude_id:
            q = q.where(Problem.id != exclude_id)
        if not (await db.execute(q)).scalar_one_or_none():
            return slug
        slug = f"{base}-{n}"
        n += 1


def _for_viewer(problem: Problem, user: User) -> ProblemOut:
    """Candidates never receive hidden test cases — not even their inputs."""
    out = ProblemOut.model_validate(problem)
    if user.role == UserRole.candidate:
        out.test_cases = [tc for tc in out.test_cases if not tc.is_hidden]
    return out


async def _load(db: AsyncSession, **where) -> Problem | None:
    q = select(Problem).options(selectinload(Problem.test_cases))
    for k, v in where.items():
        q = q.where(getattr(Problem, k) == v)
    return (await db.execute(q)).scalar_one_or_none()


def _set_test_cases(problem: Problem, body: ProblemCreate):
    problem.test_cases = [
        TestCase(
            # Unlabelled cases show their input to the candidate, like the seeded problems
            label=tc.label.strip() or tc.stdin.strip().replace("\n", " ")[:80] or f"Case {i + 1}",
            stdin=tc.stdin,
            expected=tc.expected,
            is_hidden=tc.is_hidden,
            order_index=i,
        )
        for i, tc in enumerate(body.test_cases)
    ]


@router.get("", response_model=list[ProblemSummary])
async def list_problems(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    counts = (
        select(
            TestCase.problem_id,
            func.count().label("total"),
            func.count().filter(TestCase.is_hidden.is_(True)).label("hidden"),
        )
        .group_by(TestCase.problem_id)
        .subquery()
    )
    rows = (await db.execute(
        select(Problem, counts.c.total, counts.c.hidden)
        .outerjoin(counts, counts.c.problem_id == Problem.id)
        .order_by(Problem.order_index, Problem.title)
    )).all()
    result = []
    for problem, total, hidden in rows:
        s = ProblemSummary.model_validate(problem)
        s.test_case_count = total or 0
        s.hidden_case_count = hidden or 0
        result.append(s)
    return result


@router.get("/slug/{slug}", response_model=ProblemOut)
async def get_problem_by_slug(
    slug: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    problem = await _load(db, slug=slug)
    if not problem:
        raise HTTPException(404, "Problem not found")
    return _for_viewer(problem, current_user)


@router.get("/{problem_id}", response_model=ProblemOut)
async def get_problem(
    problem_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    problem = await _load(db, id=problem_id)
    if not problem:
        raise HTTPException(404, "Problem not found")
    return _for_viewer(problem, current_user)


@router.post("", response_model=ProblemOut, status_code=201)
async def create_problem(
    body: ProblemCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_interviewer),
):
    slug = await _unique_slug(db, _slugify(body.slug or body.title))
    max_order = (await db.execute(select(func.max(Problem.order_index)))).scalar() or 0

    problem = Problem(
        slug=slug,
        title=body.title.strip(),
        difficulty=body.difficulty,
        points=body.points,
        description=body.description,
        constraints=body.constraints,
        examples=body.examples,
        starter_code=body.starter_code,
        custom_test_default=body.custom_test_default,
        order_index=body.order_index or max_order + 1,
        tags=body.tags,
        created_by=current_user.id,
    )
    _set_test_cases(problem, body)
    db.add(problem)
    await db.flush()
    return _for_viewer(await _load(db, id=problem.id), current_user)


@router.put("/{problem_id}", response_model=ProblemOut)
async def update_problem(
    problem_id: uuid.UUID,
    body: ProblemCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_interviewer),
):
    problem = await _load(db, id=problem_id)
    if not problem:
        raise HTTPException(404, "Problem not found")

    if body.slug and _slugify(body.slug) != problem.slug:
        problem.slug = await _unique_slug(db, _slugify(body.slug), exclude_id=problem.id)
    problem.title = body.title.strip()
    problem.difficulty = body.difficulty
    problem.points = body.points
    problem.description = body.description
    problem.constraints = body.constraints
    problem.examples = body.examples
    problem.starter_code = body.starter_code
    problem.custom_test_default = body.custom_test_default
    problem.tags = body.tags
    if body.order_index:
        problem.order_index = body.order_index
    _set_test_cases(problem, body)

    await db.flush()
    await db.refresh(problem, attribute_names=["test_cases", "updated_at"])
    return _for_viewer(problem, current_user)


@router.delete("/{problem_id}", status_code=204)
async def delete_problem(
    problem_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_interviewer),
):
    problem = await _load(db, id=problem_id)
    if not problem:
        raise HTTPException(404, "Problem not found")
    used = (await db.execute(
        select(func.count()).select_from(Submission).where(Submission.problem_id == problem_id)
    )).scalar()
    if used:
        raise HTTPException(409, "This problem has candidate submissions and can't be deleted. Edit it instead.")
    in_open_session = (await db.execute(
        select(func.count()).select_from(InterviewSession).where(
            InterviewSession.problem_ids.contains(str(problem_id)),
            InterviewSession.status.not_in([SessionStatus.completed, SessionStatus.cancelled]),
        )
    )).scalar()
    if in_open_session:
        raise HTTPException(409, "This problem is part of an upcoming or live interview and can't be deleted yet.")
    await db.delete(problem)
