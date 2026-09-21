import uuid
from datetime import datetime
from pydantic import BaseModel


class RunRequest(BaseModel):
    session_id: uuid.UUID
    problem_id: uuid.UUID
    language: str
    source_code: str
    is_final: bool = False


class TestCaseResult(BaseModel):
    id: int
    input: str
    expected: str
    stdout: str
    stderr: str
    compile_error: str
    passed: bool
    status_label: str
    status_type: str
    time: str | None
    memory: str | None


class RunResponse(BaseModel):
    submission_id: uuid.UUID
    passed_cases: int
    total_cases: int
    is_accepted: bool
    results: list[TestCaseResult]


class SubmissionOut(BaseModel):
    id: uuid.UUID
    session_id: uuid.UUID
    problem_id: uuid.UUID
    language: str
    source_code: str
    passed_cases: int
    total_cases: int
    is_accepted: bool
    is_final: bool
    avg_runtime_ms: float | None
    avg_memory_kb: float | None
    submitted_at: datetime

    model_config = {"from_attributes": True}
