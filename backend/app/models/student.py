import uuid
import enum
from datetime import date
from sqlalchemy import String, Text, Date, Integer, Numeric, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, TimestampMixin, UUIDMixin


class Branch(str, enum.Enum):
    WING_TSUN = "WING_TSUN"
    ESCRIMA = "ESCRIMA"


class Student(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "students"

    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    school_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("schools.id", ondelete="CASCADE"), nullable=False
    )
    date_of_birth: Mapped[date | None] = mapped_column(Date, nullable=True)
    emergency_contact: Mapped[str | None] = mapped_column(String(200), nullable=True)
    emergency_phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    user = relationship("User", back_populates="student_profile")
    school = relationship("School", back_populates="students")
    progress = relationship("StudentProgress", back_populates="student", lazy="selectin")
    attendances = relationship("Attendance", back_populates="student", lazy="selectin")
    event_registrations = relationship("EventRegistration", back_populates="student", lazy="selectin")
    requests = relationship("Request", back_populates="student", lazy="selectin")


class StudentProgress(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "student_progress"
    __table_args__ = (
        UniqueConstraint("student_id", "branch", name="uq_student_branch_progress"),
    )

    student_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("students.id", ondelete="CASCADE"), nullable=False
    )
    branch: Mapped[str] = mapped_column(String(20), nullable=False)
    current_grade: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    completed_hours: Mapped[float] = mapped_column(Numeric(8, 2), default=0, nullable=False)
    remaining_hours: Mapped[float] = mapped_column(Numeric(8, 2), default=0, nullable=False)

    student = relationship("Student", back_populates="progress")
