import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Text, Integer, ForeignKey, DateTime, Boolean, Float
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.db.base import Base


class Submission(Base):
    __tablename__ = "submissions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("interview_sessions.id", ondelete="CASCADE"))
    problem_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("problems.id"))
    candidate_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    language: Mapped[str] = mapped_column(String(40), nullable=False)
    source_code: Mapped[str] = mapped_column(Text, nullable=False)

    # Judge0 results — stored per test case as JSON
    results_json: Mapped[str | None] = mapped_column(Text, nullable=True)   # JSON array

    # Aggregate pass/fail
    passed_cases: Mapped[int] = mapped_column(Integer, default=0)
    total_cases:  Mapped[int] = mapped_column(Integer, default=0)
    is_accepted:  Mapped[bool] = mapped_column(Boolean, default=False)

    # Timing
    avg_runtime_ms: Mapped[float | None] = mapped_column(Float, nullable=True)
    avg_memory_kb:  Mapped[float | None] = mapped_column(Float, nullable=True)

    is_final: Mapped[bool] = mapped_column(Boolean, default=False)  # final submit vs run
    submitted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    session:   Mapped["InterviewSession"] = relationship("InterviewSession", back_populates="submissions")
    problem:   Mapped["Problem"]          = relationship("Problem", back_populates="submissions")
    candidate: Mapped["User | None"]      = relationship("User")
