import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Text, ForeignKey, DateTime, Integer, Float
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.db.base import Base


class CodeSnapshot(Base):
    """Periodic code snapshots saved during a session (every ~30s or on significant change).
    Used for engagement scoring, replay, and similarity analysis."""

    __tablename__ = "code_snapshots"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("interview_sessions.id", ondelete="CASCADE"), index=True)
    problem_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("problems.id"), nullable=True)

    language:    Mapped[str] = mapped_column(String(40), nullable=False)
    source_code: Mapped[str] = mapped_column(Text, nullable=False)
    char_count:  Mapped[int] = mapped_column(Integer, default=0)

    # delta from previous snapshot
    chars_added:   Mapped[int] = mapped_column(Integer, default=0)
    chars_removed: Mapped[int] = mapped_column(Integer, default=0)

    # engagement proxy: keystrokes-per-minute in this window
    keystroke_rate: Mapped[float | None] = mapped_column(Float, nullable=True)

    elapsed_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True)
    captured_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)

    session: Mapped["InterviewSession"] = relationship("InterviewSession", back_populates="snapshots")
    problem: Mapped["Problem | None"]   = relationship("Problem")
