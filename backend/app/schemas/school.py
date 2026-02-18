from pydantic import BaseModel
from datetime import datetime


class SchoolCreate(BaseModel):
    name: str
    address: str | None = None
    description: str | None = None
    phone: str | None = None
    email: str | None = None


class SchoolUpdate(BaseModel):
    name: str | None = None
    address: str | None = None
    description: str | None = None
    phone: str | None = None
    email: str | None = None
    is_active: bool | None = None


class SchoolResponse(BaseModel):
    id: str
    name: str
    address: str | None
    description: str | None
    phone: str | None
    email: str | None
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class SchoolListResponse(BaseModel):
    items: list[SchoolResponse]
    total: int


class InstructorInfo(BaseModel):
    id: str
    first_name: str
    last_name: str
    email: str
    instructor_title: str | None = None

    model_config = {"from_attributes": True}


class LessonInfo(BaseModel):
    id: str
    branch: str
    lesson_type: str
    lesson_date: datetime
    duration_hours: float
    notes: str | None = None

    model_config = {"from_attributes": True}


class SchoolDetailResponse(BaseModel):
    id: str
    name: str
    address: str | None
    description: str | None
    phone: str | None
    email: str | None
    is_active: bool
    created_at: datetime
    instructors: list[InstructorInfo] = []
    lessons: list[LessonInfo] = []
    media: list[dict] = []

    model_config = {"from_attributes": True}


class AssignManagerRequest(BaseModel):
    user_id: str
