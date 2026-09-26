import uuid
from datetime import datetime
from pydantic import BaseModel
from app.models.session import SessionStatus


class SessionCreate(BaseModel):
    title: str
    duration_minutes: int = 60
    problem_ids: list[str] = []          # list of problem UUID strings
    candidate_name: str | None = None
    candidate_email: str | None = None   # Email for validation
    candidate_role: str | None = None
    scheduled_at: datetime | None = None
    send_invite: bool = True             # email the candidate their access details


class InviteStatus(BaseModel):
    sent: bool
    mode: str                            # "smtp" | "outbox"
    detail: str = ""


class SessionUpdate(BaseModel):
    title: str | None = None
    status: SessionStatus | None = None
    notes: str | None = None
    ai_summary: str | None = None
    final_score: int | None = None
    candidate_name: str | None = None
    candidate_email: str | None = None
    candidate_role: str | None = None
    scheduled_at: datetime | None = None
    duration_minutes: int | None = None


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
    candidate_email: str | None
    candidate_role: str | None
    notes: str | None
    ai_summary: str | None
    final_score: int | None
    invite_sent_at: datetime | None = None
    invite: InviteStatus | None = None   # set on responses that just (re)sent an invite

    model_config = {"from_attributes": True}


class InvitePreview(BaseModel):
    to: str
    subject: str
    html: str
    login_link: str


class SessionSummary(BaseModel):
    id: uuid.UUID
    title: str
    status: SessionStatus
    candidate_name: str | None
    candidate_email: str | None
    candidate_role: str | None
    duration_minutes: int
    started_at: datetime | None
    ended_at: datetime | None
    scheduled_at: datetime | None
    created_at: datetime
    final_score: int | None
    invite_sent_at: datetime | None = None
    problem_ids: str | None = None

    model_config = {"from_attributes": True}
