import uuid
from datetime import datetime
from pydantic import BaseModel
from app.models.signal import SignalType, RiskLevel


class SnapshotCreate(BaseModel):
    session_id: uuid.UUID
    problem_id: uuid.UUID | None = None
    language: str
    source_code: str
    elapsed_seconds: int | None = None
    keystroke_rate: float | None = None


class EngagementPoint(BaseModel):
    elapsed_seconds: int
    keystroke_rate: float
    char_count: int


class BehavioralTimeline(BaseModel):
    session_id: uuid.UUID
    engagement: list[EngagementPoint]
    signals: list[dict]
    risk_score: float          # 0-100 composite
    focus_score: float         # 0-100


class SimilarityReportOut(BaseModel):
    id: uuid.UUID
    session_id: uuid.UUID
    problem_id: uuid.UUID | None
    language: str
    overall_score: float
    structural_score: float
    token_score: float
    literal_score: float
    matched_source: str | None
    source_type: str | None
    is_flagged: bool
    diff_json: str | None
    analyzed_at: datetime

    model_config = {"from_attributes": True}
