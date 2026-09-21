import uuid
from datetime import datetime
from pydantic import BaseModel
from app.models.session import SessionStatus


class SessionCreate(BaseModel):
    title: str
    duration_minutes: int = 60
    problem_ids: list[str] = []          # list of problem UUID strings
    candidate_name: str | None = None
    candidate_role: str | None = None
    scheduled_at: datetime | None = None


class SessionUpdate(BaseModel):
    title: str | None = None
    status: SessionStatus | None = None
    notes: str | None = None
    ai_summary: str | None = None
    final_score: int | None = None
    candidate_name: str | None = None
    candidate_role: str | None = None


class SessionOut(BaseModel):
    id: uuid.UUID
    access_token: str
    title: str
    status: SessionStatus
    interviewer_id: uuid.UUID
    candidate_id: uuid.UUID | None
    problem_ids: str | None
    duration_minutes: int
    started_at: datetime | None
    ended_at: datetime | None
    scheduled_at: datetime | None
    created_at: datetime
    candidate_name: str | None
    candidate_role: str | None
    notes: str | None
    ai_summary: str | None
    final_score: int | None

    model_config = {"from_attributes": True}


class SessionSummary(BaseModel):
    id: uuid.UUID
    title: str
    status: SessionStatus
    candidate_name: str | None
    candidate_role: str | None
    duration_minutes: int
    started_at: datetime | None
    created_at: datetime
    final_score: int | None

    model_config = {"from_attributes": True}
