import uuid
from pydantic import BaseModel
from app.models.problem import Difficulty


class TestCaseOut(BaseModel):
    id: uuid.UUID
    label: str
    stdin: str
    expected: str
    order_index: int
    # is_hidden intentionally omitted — candidates never see hidden flags

    model_config = {"from_attributes": True}


class TestCaseCreate(BaseModel):
    label: str
    stdin: str
    expected: str
    is_hidden: bool = False
    order_index: int = 0


class ProblemCreate(BaseModel):
    slug: str
    title: str
    difficulty: Difficulty
    points: int = 10
    description: str
    constraints: str = "[]"
    examples: str = "[]"
    starter_code: str = "{}"
    custom_test_default: str | None = None
    order_index: int = 0
    test_cases: list[TestCaseCreate] = []


class ProblemOut(BaseModel):
    id: uuid.UUID
    slug: str
    title: str
    difficulty: Difficulty
    points: int
    description: str
    constraints: str
    examples: str
    starter_code: str
    custom_test_default: str | None
    order_index: int
    test_cases: list[TestCaseOut] = []

    model_config = {"from_attributes": True}


class ProblemSummary(BaseModel):
    """Lightweight version for lists."""
    id: uuid.UUID
    slug: str
    title: str
    difficulty: Difficulty
    points: int
    order_index: int

    model_config = {"from_attributes": True}
