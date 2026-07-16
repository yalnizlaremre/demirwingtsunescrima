from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base, TimestampMixin, UUIDMixin


class SiteContent(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "site_contents"

    slug: Mapped[str] = mapped_column(String(100), index=True, nullable=False)
    title: Mapped[str | None] = mapped_column(String(300), nullable=True)
    body: Mapped[str | None] = mapped_column(Text, nullable=True)
    image_url: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    youtube_url: Mapped[str | None] = mapped_column(String(1000), nullable=True)
