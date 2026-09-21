import uuid
from datetime import datetime
from pydantic import BaseModel
from app.models.signal import SignalType, RiskLevel


class SignalCreate(BaseModel):
    session_id: uuid.UUID
    signal_type: SignalType
    detail: str | None = None       # JSON string with extra context
    elapsed_seconds: int | None = None


class SignalOut(BaseModel):
    id: uuid.UUID
    session_id: uuid.UUID
    signal_type: SignalType
    risk_level: RiskLevel
    detail: str | None
    elapsed_seconds: int | None
    timestamp: datetime

    model_config = {"from_attributes": True}


class SignalBatch(BaseModel):
    """Frontend sends batches of signals to reduce round-trips."""
    signals: list[SignalCreate]
