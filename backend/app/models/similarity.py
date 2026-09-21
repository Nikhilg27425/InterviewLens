import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Text, ForeignKey, DateTime, Float, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.db.base import Base


class SimilarityReport(Base):
    __tablename__ = "similarity_reports"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("interview_sessions.id", ondelete="CASCADE"), index=True)
    problem_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("problems.id"), nullable=True)
    submission_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("submissions.id"), nullable=True)

    language: Mapped[str] = mapped_column(String(40), nullable=False)

    # Overall composite score 0-100
    overall_score: Mapped[float] = mapped_column(Float, default=0.0)

    # Component scores
    structural_score:  Mapped[float] = mapped_column(Float, default=0.0)   # AST similarity
    token_score:       Mapped[float] = mapped_column(Float, default=0.0)   # token sequence
    literal_score:     Mapped[float] = mapped_column(Float, default=0.0)   # difflib SequenceMatcher

    # Source info
    matched_source: Mapped[str | None] = mapped_column(String(512), nullable=True)  # e.g. "LeetCode solution #42"
    source_type: Mapped[str | None]    = mapped_column(String(64), nullable=True)   # "internal" | "external"

    is_flagged: Mapped[bool] = mapped_column(Boolean, default=False)
    diff_json:  Mapped[str | None] = mapped_column(Text, nullable=True)   # JSON with highlighted diff

    analyzed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    session:    Mapped["InterviewSession"] = relationship("InterviewSession", back_populates="similarities")
    problem:    Mapped["Problem | None"]   = relationship("Problem")
    submission: Mapped["Submission | None"] = relationship("Submission")
