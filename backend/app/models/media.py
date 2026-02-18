import uuid
import enum
from datetime import datetime
from sqlalchemy import String, Integer, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, UUIDMixin


class MediaType(str, enum.Enum):
    IMAGE = "IMAGE"
    VIDEO = "VIDEO"
    YOUTUBE = "YOUTUBE"


class Media(Base, UUIDMixin):
    __tablename__ = "media"

    media_type: Mapped[str] = mapped_column(String(20), nullable=False)
    title: Mapped[str | None] = mapped_column(String(500), nullable=True)
    filename: Mapped[str] = mapped_column(String(500), nullable=False)
    original_filename: Mapped[str] = mapped_column(String(500), nullable=False)
    file_url: Mapped[str] = mapped_column(String(1000), nullable=False)
    file_size: Mapped[int] = mapped_column(Integer, nullable=False)
    mime_type: Mapped[str] = mapped_column(String(100), nullable=False)
    youtube_url: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    school_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("schools.id", ondelete="SET NULL"), nullable=True
    )
    uploaded_by: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(), server_default=func.now(), nullable=False
    )

    uploader = relationship("User", foreign_keys=[uploaded_by], lazy="selectin")
    school = relationship("School", foreign_keys=[school_id], lazy="selectin")
