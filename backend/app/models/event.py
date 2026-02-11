import uuid
import enum
from datetime import datetime
from sqlalchemy import String, Text, Integer, Numeric, Boolean, DateTime, ForeignKey, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, TimestampMixin, UUIDMixin


class EventType(str, enum.Enum):
    EVENT = "EVENT"
    SEMINAR = "SEMINAR"


class EventScope(str, enum.Enum):
    ALL_SCHOOLS = "ALL_SCHOOLS"
    SELECTED_SCHOOLS = "SELECTED_SCHOOLS"


class Event(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "events"

    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    event_type: Mapped[str] = mapped_column(String(20), nullable=False)
    start_datetime: Mapped[datetime] = mapped_column(DateTime(), nullable=False)
    end_datetime: Mapped[datetime | None] = mapped_column(DateTime(), nullable=True)
    location: Mapped[str] = mapped_column(String(300), nullable=False)
    capacity: Mapped[int | None] = mapped_column(Integer, nullable=True)
    scope: Mapped[str] = mapped_column(String(30), nullable=False, default="ALL_SCHOOLS")
    wt_fee: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)
    escrima_fee: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)
    is_completed: Mapped[bool] = mapped_column(Boolean, default=False)
    created_by: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)

    creator = relationship("User", foreign_keys=[created_by])
    selected_schools = relationship("EventSchool", back_populates="event", lazy="selectin")
    registrations = relationship("EventRegistration", back_populates="event", lazy="selectin")
    evaluations = relationship("SeminarEvaluation", back_populates="event", lazy="selectin")


class EventSchool(Base, UUIDMixin):
    __tablename__ = "event_schools"
    __table_args__ = (UniqueConstraint("event_id", "school_id", name="uq_event_school"),)

    event_id: Mapped[str] = mapped_column(String(36), ForeignKey("events.id", ondelete="CASCADE"), nullable=False)
    school_id: Mapped[str] = mapped_column(String(36), ForeignKey("schools.id", ondelete="CASCADE"), nullable=False)

    event = relationship("Event", back_populates="selected_schools")
    school = relationship("School")


class EventRegistration(Base, UUIDMixin):
    __tablename__ = "event_registrations"
    __table_args__ = (UniqueConstraint("event_id", "student_id", name="uq_event_student_reg"),)

    event_id: Mapped[str] = mapped_column(String(36), ForeignKey("events.id", ondelete="CASCADE"), nullable=False)
    student_id: Mapped[str] = mapped_column(String(36), ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    register_wt: Mapped[bool] = mapped_column(Boolean, default=False)
    register_escrima: Mapped[bool] = mapped_column(Boolean, default=False)
    will_take_exam: Mapped[bool] = mapped_column(Boolean, default=False)
    exam_branch_wt: Mapped[bool] = mapped_column(Boolean, default=False)
    exam_branch_escrima: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(), server_default=func.now(), nullable=False)

    event = relationship("Event", back_populates="registrations")
    student = relationship("Student", back_populates="event_registrations")


class SeminarEvaluation(Base, UUIDMixin):
    __tablename__ = "seminar_evaluations"

    event_id: Mapped[str] = mapped_column(String(36), ForeignKey("events.id", ondelete="CASCADE"), nullable=False)
    student_id: Mapped[str] = mapped_column(String(36), ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    branch: Mapped[str] = mapped_column(String(20), nullable=False)
    passed: Mapped[bool] = mapped_column(Boolean, nullable=False)
    grade_before: Mapped[int] = mapped_column(Integer, nullable=False)
    grade_after: Mapped[int] = mapped_column(Integer, nullable=False)
    evaluated_by: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    evaluated_at: Mapped[datetime] = mapped_column(DateTime(), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(), server_default=func.now(), nullable=False)

    event = relationship("Event", back_populates="evaluations")
    student = relationship("Student")
    evaluator = relationship("User", foreign_keys=[evaluated_by])
