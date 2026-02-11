from sqlalchemy import String, Integer, Numeric, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base, TimestampMixin, UUIDMixin


class GradeRequirement(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "grade_requirements"
    __table_args__ = (
        UniqueConstraint("branch", "grade", name="uq_branch_grade"),
    )

    branch: Mapped[str] = mapped_column(String(20), nullable=False)
    grade: Mapped[int] = mapped_column(Integer, nullable=False)
    grade_name: Mapped[str] = mapped_column(String(100), nullable=False)
    required_hours: Mapped[float] = mapped_column(Numeric(8, 2), nullable=False)
