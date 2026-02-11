import uuid
import enum
from datetime import datetime
from sqlalchemy import String, Text, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, UUIDMixin


class AuditAction(str, enum.Enum):
    GRADE_CHANGE = "GRADE_CHANGE"
    ATTENDANCE_CREATED = "ATTENDANCE_CREATED"
    ATTENDANCE_DELETED = "ATTENDANCE_DELETED"
    SEMINAR_EVALUATED = "SEMINAR_EVALUATED"
    EMAIL_SENT = "EMAIL_SENT"
    USER_STATUS_CHANGE = "USER_STATUS_CHANGE"
    STUDENT_APPROVED = "STUDENT_APPROVED"
    STUDENT_REJECTED = "STUDENT_REJECTED"
    REQUEST_HANDLED = "REQUEST_HANDLED"
    EVENT_COMPLETED = "EVENT_COMPLETED"
    MANUAL_GRADE_CHANGE = "MANUAL_GRADE_CHANGE"


class AuditLog(Base, UUIDMixin):
    __tablename__ = "audit_logs"

    action: Mapped[str] = mapped_column(String(50), nullable=False)
    entity_type: Mapped[str] = mapped_column(String(50), nullable=False)
    entity_id: Mapped[str] = mapped_column(String(36), nullable=False)
    performed_by: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=False
    )
    details: Mapped[str | None] = mapped_column(Text, nullable=True)
    old_value: Mapped[str | None] = mapped_column(Text, nullable=True)
    new_value: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(), server_default=func.now(), nullable=False
    )

    performer = relationship("User", foreign_keys=[performed_by], lazy="selectin")
