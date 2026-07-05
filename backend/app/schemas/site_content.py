from pydantic import BaseModel
from datetime import datetime


class SiteContentCreate(BaseModel):
    slug: str
    title: str | None = None
    body: str | None = None
    image_url: str | None = None
    youtube_url: str | None = None


class SiteContentUpdate(BaseModel):
    title: str | None = None
    body: str | None = None
    image_url: str | None = None
    youtube_url: str | None = None


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
