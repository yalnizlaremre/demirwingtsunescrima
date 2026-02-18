import uuid
import enum
from sqlalchemy import String, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, TimestampMixin, UUIDMixin


class UserRole(str, enum.Enum):
    SUPER_ADMIN = "SUPER_ADMIN"
    ADMIN = "ADMIN"
    MANAGER = "MANAGER"
    USER = "USER"
    MEMBER = "MEMBER"


class UserStatus(str, enum.Enum):
    PENDING = "PENDING"
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"


class InstructorTitle(str, enum.Enum):
    SIFU = "SIFU"
    SIHING = "SIHING"


class User(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    role: Mapped[str] = mapped_column(String(20), nullable=False, default=UserRole.USER.value)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default=UserStatus.PENDING.value)
    instructor_title: Mapped[str | None] = mapped_column(String(20), nullable=True)
    can_upload_media: Mapped[bool] = mapped_column(Boolean, default=False)
    avatar_url: Mapped[str | None] = mapped_column(String(1000), nullable=True)

    # Relationships
    managed_schools = relationship("SchoolManager", back_populates="manager", lazy="selectin")
    student_profile = relationship("Student", back_populates="user", uselist=False, lazy="selectin")

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}"
