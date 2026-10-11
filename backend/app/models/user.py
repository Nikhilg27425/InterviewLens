import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Boolean, DateTime, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
import enum
from app.db.base import Base


class UserRole(str, enum.Enum):
    interviewer = "interviewer"
    candidate   = "candidate"
    admin       = "admin"


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str]    = mapped_column(String(255), unique=True, nullable=False, index=True)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    hashed_password: Mapped[str | None] = mapped_column(String(255), nullable=True)  # Nullable for OAuth users
    role: Mapped[UserRole] = mapped_column(SAEnum(UserRole), nullable=False, default=UserRole.interviewer)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # company field for interviewers
    company: Mapped[str | None] = mapped_column(String(255), nullable=True)
    
    # OAuth fields
    oauth_provider: Mapped[str | None] = mapped_column(String(50), nullable=True)  # 'google', 'github', None
    oauth_id: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)  # Provider's user ID
    profile_picture: Mapped[str | None] = mapped_column(String(500), nullable=True)  # Profile picture URL

    # relationships
    sessions_as_interviewer: Mapped[list["InterviewSession"]] = relationship(
        "InterviewSession", back_populates="interviewer", foreign_keys="InterviewSession.interviewer_id"
    )
    sessions_as_candidate: Mapped[list["InterviewSession"]] = relationship(
        "InterviewSession", back_populates="candidate", foreign_keys="InterviewSession.candidate_id"
    )

    @property
    def has_password(self) -> bool:
        return self.hashed_password is not None

    def __repr__(self) -> str:
        return f"<User {self.email} ({self.role})>"
