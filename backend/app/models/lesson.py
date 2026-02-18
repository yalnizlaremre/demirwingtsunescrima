import uuid
import enum
from datetime import datetime
from sqlalchemy import String, Text, Numeric, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, UUIDMixin


class LessonType(str, enum.Enum):
    GROUP = "GROUP"
    PRIVATE = "PRIVATE"


LESSON_DURATION = {
    LessonType.GROUP: 2.0,
    LessonType.PRIVATE: 2.0,
}


class Lesson(Base, UUIDMixin):
    __tablename__ = "lessons"

    school_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("schools.id", ondelete="CASCADE"), nullable=False
    )
    branch: Mapped[str] = mapped_column(String(20), nullable=False)
    lesson_type: Mapped[str] = mapped_column(String(20), nullable=False)
    lesson_date: Mapped[datetime] = mapped_column(DateTime(), nullable=False)
    duration_hours: Mapped[float] = mapped_column(Numeric(4, 2), nullable=False)
    created_by: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=False
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(), server_default=func.now(), nullable=False
    )

    school = relationship("School", back_populates="lessons")
    creator = relationship("User", foreign_keys=[created_by])
    attendances = relationship("Attendance", back_populates="lesson", lazy="selectin")
