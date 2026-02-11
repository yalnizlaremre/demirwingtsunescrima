import uuid
from datetime import datetime
from sqlalchemy import String, Numeric, DateTime, ForeignKey, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, UUIDMixin


class Attendance(Base, UUIDMixin):
    __tablename__ = "attendances"
    __table_args__ = (
        UniqueConstraint("lesson_id", "student_id", name="uq_lesson_student"),
    )

    lesson_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("lessons.id", ondelete="CASCADE"), nullable=False
    )
    student_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("students.id", ondelete="CASCADE"), nullable=False
    )
    hours_credited: Mapped[float] = mapped_column(Numeric(4, 2), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(), server_default=func.now(), nullable=False
    )

    lesson = relationship("Lesson", back_populates="attendances")
    student = relationship("Student", back_populates="attendances")
