import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Text, Integer, ForeignKey, DateTime, Boolean, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, ARRAY
import enum
from app.db.base import Base


class SessionStatus(str, enum.Enum):
    scheduled  = "scheduled"
    waiting    = "waiting"    # candidate in waiting room
    active     = "active"
    completed  = "completed"
    cancelled  = "cancelled"


class InterviewSession(Base):
    __tablename__ = "interview_sessions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    access_token: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    title: Mapped[str]  = mapped_column(String(255), nullable=False)
    status: Mapped[SessionStatus] = mapped_column(SAEnum(SessionStatus), default=SessionStatus.scheduled)

    interviewer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    candidate_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    # comma-separated problem UUIDs in order
    problem_ids: Mapped[str | None] = mapped_column(Text, nullable=True)

    duration_minutes: Mapped[int] = mapped_column(Integer, default=60)
    started_at: Mapped[datetime | None]  = mapped_column(DateTime(timezone=True), nullable=True)
    ended_at: Mapped[datetime | None]    = mapped_column(DateTime(timezone=True), nullable=True)
    scheduled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Candidate metadata (denormalised for speed)
    candidate_name: Mapped[str | None]  = mapped_column(String(255), nullable=True)
    candidate_email: Mapped[str | None] = mapped_column(String(255), nullable=True)  # Email for validation
    candidate_role: Mapped[str | None]  = mapped_column(String(255), nullable=True)

    # Notes / summary (filled post-session)
    notes: Mapped[str | None]   = mapped_column(Text, nullable=True)
    ai_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    final_score: Mapped[int | None] = mapped_column(Integer, nullable=True)

    interviewer: Mapped["User"] = relationship("User", back_populates="sessions_as_interviewer", foreign_keys=[interviewer_id])
    candidate: Mapped["User | None"] = relationship("User", back_populates="sessions_as_candidate", foreign_keys=[candidate_id])

    submissions:  Mapped[list["Submission"]]       = relationship("Submission",       back_populates="session", cascade="all, delete-orphan")
    signals:      Mapped[list["ProctoringSignal"]] = relationship("ProctoringSignal", back_populates="session", cascade="all, delete-orphan")
    snapshots:    Mapped[list["CodeSnapshot"]]     = relationship("CodeSnapshot",     back_populates="session", cascade="all, delete-orphan")
    similarities: Mapped[list["SimilarityReport"]] = relationship("SimilarityReport", back_populates="session", cascade="all, delete-orphan")
