import uuid
from sqlalchemy import String, Text, Integer, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
import enum
from app.db.base import Base


class Difficulty(str, enum.Enum):
    easy   = "Easy"
    medium = "Medium"
    hard   = "Hard"


class Problem(Base):
    __tablename__ = "problems"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    slug: Mapped[str]       = mapped_column(String(120), unique=True, nullable=False, index=True)
    title: Mapped[str]      = mapped_column(String(255), nullable=False)
    difficulty: Mapped[Difficulty] = mapped_column(SAEnum(Difficulty), nullable=False)
    points: Mapped[int]     = mapped_column(Integer, default=10)
    description: Mapped[str] = mapped_column(Text, nullable=False)   # HTML allowed
    constraints: Mapped[str] = mapped_column(Text, default="[]")     # JSON array of strings
    examples: Mapped[str]    = mapped_column(Text, default="[]")     # JSON array of {input,output,explanation?}
    starter_code: Mapped[str] = mapped_column(Text, default="{}")    # JSON map lang->code
    custom_test_default: Mapped[str | None] = mapped_column(Text, nullable=True)
    order_index: Mapped[int] = mapped_column(Integer, default=0)

    test_cases: Mapped[list["TestCase"]] = relationship(
        "TestCase", back_populates="problem", order_by="TestCase.order_index", cascade="all, delete-orphan"
    )
    submissions: Mapped[list["Submission"]] = relationship("Submission", back_populates="problem")


class TestCase(Base):
    __tablename__ = "test_cases"

    id: Mapped[uuid.UUID]   = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    problem_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("problems.id", ondelete="CASCADE"))
    label: Mapped[str]      = mapped_column(String(255), nullable=False)
    stdin: Mapped[str]      = mapped_column(Text, nullable=False)
    expected: Mapped[str]   = mapped_column(Text, nullable=False)
    is_hidden: Mapped[bool] = mapped_column(default=False)  # hidden from candidate
    order_index: Mapped[int] = mapped_column(Integer, default=0)

    problem: Mapped["Problem"] = relationship("Problem", back_populates="test_cases")
