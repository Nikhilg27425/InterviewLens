import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Text, ForeignKey, DateTime, Enum as SAEnum, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
import enum
from app.db.base import Base


class SignalType(str, enum.Enum):
    # Visibility / focus
    tab_switch      = "tab_switch"
    window_blur     = "window_blur"
    window_focus    = "window_focus"
    fullscreen_exit = "fullscreen_exit"

    # Clipboard
    clipboard_paste = "clipboard_paste"
    clipboard_copy  = "clipboard_copy"
    large_paste     = "large_paste"       # > 50 chars pasted at once

    # Mouse / keyboard
    right_click     = "right_click"
    devtools_open   = "devtools_open"

    # Camera (client sends when face detection result changes)
    multiple_faces  = "multiple_faces"
    no_face         = "no_face"

    # Code
    code_similarity = "code_similarity"
    rapid_code_gain = "rapid_code_gain"   # >100 chars added in <5s

    # System
    session_start   = "session_start"
    session_end     = "session_end"
    problem_switch  = "problem_switch"


class RiskLevel(str, enum.Enum):
    info     = "info"
    low      = "low"
    medium   = "medium"
    high     = "high"
    critical = "critical"


RISK_MAP: dict[SignalType, RiskLevel] = {
    SignalType.tab_switch:      RiskLevel.medium,
    SignalType.window_blur:     RiskLevel.low,
    SignalType.window_focus:    RiskLevel.info,
    SignalType.fullscreen_exit: RiskLevel.low,
    SignalType.clipboard_paste: RiskLevel.medium,
    SignalType.clipboard_copy:  RiskLevel.low,
    SignalType.large_paste:     RiskLevel.high,
    SignalType.right_click:     RiskLevel.low,
    SignalType.devtools_open:   RiskLevel.high,
    SignalType.multiple_faces:  RiskLevel.high,
    SignalType.no_face:         RiskLevel.medium,
    SignalType.code_similarity: RiskLevel.high,
    SignalType.rapid_code_gain: RiskLevel.medium,
    SignalType.session_start:   RiskLevel.info,
    SignalType.session_end:     RiskLevel.info,
    SignalType.problem_switch:  RiskLevel.info,
}


class ProctoringSignal(Base):
    __tablename__ = "proctoring_signals"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("interview_sessions.id", ondelete="CASCADE"), index=True)
    candidate_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    signal_type: Mapped[SignalType] = mapped_column(SAEnum(SignalType), nullable=False, index=True)
    risk_level:  Mapped[RiskLevel]  = mapped_column(SAEnum(RiskLevel),  nullable=False)
    detail:      Mapped[str | None] = mapped_column(Text, nullable=True)    # JSON blob with extra context
    timestamp:   Mapped[datetime]   = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)

    # elapsed seconds since session started (for timeline rendering)
    elapsed_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True)

    session:   Mapped["InterviewSession"] = relationship("InterviewSession", back_populates="signals")
    candidate: Mapped["User | None"]      = relationship("User")
