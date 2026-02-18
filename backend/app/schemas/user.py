from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional


class UserBase(BaseModel):
    email: EmailStr
    first_name: str
    last_name: str
    phone: str | None = None


class UserCreate(UserBase):
    password: str
    role: str = "USER"
    instructor_title: str | None = None
    can_upload_media: bool = False


class UserUpdate(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    phone: str | None = None
    role: str | None = None
    status: str | None = None
    instructor_title: str | None = None
    can_upload_media: bool | None = None


class UserResponse(BaseModel):
    id: str
    email: str
    first_name: str
    last_name: str
    phone: str | None
    role: str
    status: str
    instructor_title: str | None
    can_upload_media: bool
    avatar_url: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class UserListResponse(BaseModel):
    items: list[UserResponse]
    total: int
