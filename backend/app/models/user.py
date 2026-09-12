import uuid
import enum
from sqlalchemy import String, Boolean, Integer, Text, JSON
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
    bio: Mapped[str | None] = mapped_column(Text, nullable=True)
    display_order: Mapped[int] = mapped_column(Integer, default=0)
    is_featured_instructor: Mapped[bool] = mapped_column(Boolean, default=False)
    instagram_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    extra_permissions: Mapped[list[str] | None] = mapped_column(JSON, nullable=True, default=list)

    # Relationships
    # NOT: passive_deletes=True (bool) yeterli degil - lazy="selectin" bu iliskiyi
    # HER User sorgusunda onceden yukler, ve zaten yuklu bir koleksiyon icin SQLAlchemy
    # yine de FK'yi NULL'a cekmeye calisir (bkz. lessons.py'deki attendances ayni bug).
    # "all" string degeri bu nulling'i tamamen kapatip DB'nin ON DELETE CASCADE'ine birakiyor.
    managed_schools = relationship("SchoolManager", back_populates="manager", lazy="selectin", passive_deletes="all")
    student_profile = relationship("Student", back_populates="user", uselist=False, lazy="selectin", passive_deletes="all")

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}"
