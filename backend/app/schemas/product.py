from pydantic import BaseModel
from datetime import datetime


class ProductCategoryCreate(BaseModel):
    name: str
    description: str | None = None


class ProductCategoryResponse(BaseModel):
    id: str
    name: str
    description: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class ProductCreate(BaseModel):
    name: str
    category_id: str | None = None
    description: str | None = None
    sizes: str | None = None
    image_url: str | None = None


class ProductUpdate(BaseModel):
    name: str | None = None
    category_id: str | None = None
    description: str | None = None
    sizes: str | None = None
    image_url: str | None = None
    is_active: bool | None = None


class ProductResponse(BaseModel):
    id: str
    name: str
    category_id: str | None
    description: str | None
    image_url: str | None
    sizes: str | None
    is_active: bool
    created_at: datetime
    category_name: str | None = None

    model_config = {"from_attributes": True}


class ProductListResponse(BaseModel):
    items: list[ProductResponse]
    total: int
