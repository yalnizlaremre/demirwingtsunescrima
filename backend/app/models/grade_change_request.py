import uuid
import enum
from datetime import datetime
from sqlalchemy import String, Integer, Text, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, UUIDMixin, TimestampMixin


class GradeChangeStatus(str, enum.Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


class GradeChangeRequest(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "grade_change_requests"

    student_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("students.id", ondelete="CASCADE"), nullable=False
    )
    branch: Mapped[str] = mapped_column(String(20), nullable=False)
    current_grade: Mapped[int] = mapped_column(Integer, nullable=False)
    requested_grade: Mapped[int] = mapped_column(Integer, nullable=False)
    note: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default=GradeChangeStatus.PENDING.value
    )
    requested_by: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=False
    )
    handled_by: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=True
    )
    handled_at: Mapped[datetime | None] = mapped_column(DateTime(), nullable=True)

    student = relationship("Student")
    requester = relationship("User", foreign_keys=[requested_by])
    handler = relationship("User", foreign_keys=[handled_by])
