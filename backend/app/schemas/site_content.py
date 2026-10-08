from pydantic import BaseModel, field_validator

from app.schemas.validators import validate_media_url, validate_web_url
from datetime import datetime


class SiteContentCreate(BaseModel):
    slug: str
    title: str | None = None
    body: str | None = None
    image_url: str | None = None
    youtube_url: str | None = None

    @field_validator("image_url")
    @classmethod
    def _check_cover(cls, v):
        return validate_media_url(v)

    @field_validator("youtube_url")
    @classmethod
    def _check_youtube(cls, v):
        return validate_web_url(v)


class SiteContentUpdate(BaseModel):
    title: str | None = None
    body: str | None = None
    image_url: str | None = None
    youtube_url: str | None = None

    @field_validator("image_url")
    @classmethod
    def _check_cover(cls, v):
        return validate_media_url(v)

    @field_validator("youtube_url")
    @classmethod
    def _check_youtube(cls, v):
        return validate_web_url(v)


class SiteContentResponse(BaseModel):
    id: str
    slug: str
    title: str | None
    body: str | None
    image_url: str | None
    youtube_url: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class SiteContentListResponse(BaseModel):
    items: list[SiteContentResponse]
