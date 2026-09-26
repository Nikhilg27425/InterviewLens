import uuid
from datetime import datetime
from pydantic import BaseModel, Field, field_validator
from app.models.problem import Difficulty


class TestCaseOut(BaseModel):
    id: uuid.UUID
    label: str
    stdin: str
    expected: str
    is_hidden: bool = False   # candidates never receive hidden cases at all
    order_index: int

    model_config = {"from_attributes": True}


class TestCaseCreate(BaseModel):
    label: str = ""
    stdin: str = ""
    expected: str
    is_hidden: bool = False
    order_index: int = 0


class ProblemCreate(BaseModel):
    slug: str | None = None          # derived from the title when omitted
    title: str = Field(min_length=1, max_length=255)
    difficulty: Difficulty
    points: int = Field(default=10, ge=0, le=1000)
    description: str = Field(min_length=1)
    constraints: str = "[]"
    examples: str = "[]"
    starter_code: str = "{}"
    custom_test_default: str | None = None
    order_index: int = 0
    tags: str = "[]"
    test_cases: list[TestCaseCreate] = []

    @field_validator("test_cases")
    @classmethod
    def at_least_one_case(cls, v: list[TestCaseCreate]) -> list[TestCaseCreate]:
        if not v:
            raise ValueError("Add at least one test case")
        return v


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
    tags: str | None = "[]"
    created_by: uuid.UUID | None = None
    updated_at: datetime | None = None
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
    tags: str | None = "[]"
    created_by: uuid.UUID | None = None
    updated_at: datetime | None = None
    test_case_count: int = 0
    hidden_case_count: int = 0

    model_config = {"from_attributes": True}
