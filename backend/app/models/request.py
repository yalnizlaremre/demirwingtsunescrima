import uuid
import enum
from datetime import datetime
from sqlalchemy import String, Text, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, TimestampMixin, UUIDMixin


class RequestType(str, enum.Enum):
    PRODUCT = "PRODUCT"
    PRIVATE_LESSON = "PRIVATE_LESSON"
    GROUP_LESSON = "GROUP_LESSON"


class RequestStatus(str, enum.Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


class Request(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "requests"

    student_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("students.id", ondelete="CASCADE"), nullable=False
    )
    request_type: Mapped[str] = mapped_column(String(20), nullable=False)
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default=RequestStatus.PENDING.value
    )

    product_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("products.id", ondelete="SET NULL"), nullable=True
    )
    size: Mapped[str | None] = mapped_column(String(50), nullable=True)

    branch: Mapped[str | None] = mapped_column(String(20), nullable=True)
    preferred_date: Mapped[datetime | None] = mapped_column(DateTime(), nullable=True)

    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    handled_by: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=True
    )
    handled_at: Mapped[datetime | None] = mapped_column(DateTime(), nullable=True)

    student = relationship("Student", back_populates="requests")
    product = relationship("Product")
    handler = relationship("User", foreign_keys=[handled_by])
