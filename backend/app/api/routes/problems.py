import json
import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.db.base import get_db
from app.models.problem import Problem, TestCase
from app.models.user import User
from app.schemas.problem import ProblemCreate, ProblemOut, ProblemSummary
from app.api.deps import get_current_user, require_interviewer

router = APIRouter(prefix="/problems", tags=["problems"])


@router.get("", response_model=list[ProblemSummary])
async def list_problems(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(select(Problem).order_by(Problem.order_index))
    return result.scalars().all()


@router.get("/{problem_id}", response_model=ProblemOut)
async def get_problem(
    problem_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Problem)
        .options(selectinload(Problem.test_cases))
        .where(Problem.id == problem_id)
    )
    problem = result.scalar_one_or_none()
    if not problem:
        raise HTTPException(404, "Problem not found")
    return problem


@router.get("/slug/{slug}", response_model=ProblemOut)
async def get_problem_by_slug(
    slug: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Problem)
        .options(selectinload(Problem.test_cases))
        .where(Problem.slug == slug)
    )
    problem = result.scalar_one_or_none()
    if not problem:
        raise HTTPException(404, "Problem not found")
    return problem


@router.post("", response_model=ProblemOut, status_code=201)
async def create_problem(
    body: ProblemCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_interviewer),
):
    existing = (await db.execute(select(Problem).where(Problem.slug == body.slug))).scalar_one_or_none()
    if existing:
        raise HTTPException(400, "Slug already exists")

    problem = Problem(
        slug=body.slug,
        title=body.title,
        difficulty=body.difficulty,
        points=body.points,
        description=body.description,
        constraints=body.constraints,
        examples=body.examples,
        starter_code=body.starter_code,
        custom_test_default=body.custom_test_default,
        order_index=body.order_index,
    )
    db.add(problem)
    await db.flush()

    for tc_data in body.test_cases:
        tc = TestCase(
            problem_id=problem.id,
            label=tc_data.label,
            stdin=tc_data.stdin,
            expected=tc_data.expected,
            is_hidden=tc_data.is_hidden,
            order_index=tc_data.order_index,
        )
        db.add(tc)

    await db.flush()
    await db.refresh(problem)

    # reload with test cases
    result = await db.execute(
        select(Problem).options(selectinload(Problem.test_cases)).where(Problem.id == problem.id)
    )
    return result.scalar_one()


@router.delete("/{problem_id}", status_code=204)
async def delete_problem(
    problem_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_interviewer),
):
    result = await db.execute(select(Problem).where(Problem.id == problem_id))
    problem = result.scalar_one_or_none()
    if not problem:
        raise HTTPException(404, "Problem not found")
    await db.delete(problem)
