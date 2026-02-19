import enum
from datetime import datetime
from sqlalchemy import String, Text, Numeric, Boolean, Integer, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, UUIDMixin


class LessonSchedule(Base, UUIDMixin):
    __tablename__ = "lesson_schedules"

    school_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("schools.id", ondelete="CASCADE"), nullable=False
    )
    branch: Mapped[str] = mapped_column(String(20), nullable=False)
    lesson_type: Mapped[str] = mapped_column(String(20), nullable=False)
    day_of_week: Mapped[int] = mapped_column(Integer, nullable=False)  # 0=Monday ... 6=Sunday
    start_time: Mapped[str] = mapped_column(String(5), nullable=False)  # "19:00"
    duration_hours: Mapped[float] = mapped_column(Numeric(4, 2), nullable=False)
    start_date: Mapped[datetime] = mapped_column(DateTime(), nullable=False)
    end_date: Mapped[datetime] = mapped_column(DateTime(), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_by: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(), server_default=func.now(), nullable=False
    )

    school = relationship("School")
    creator = relationship("User", foreign_keys=[created_by])
    lessons = relationship("Lesson", back_populates="schedule", lazy="selectin")
