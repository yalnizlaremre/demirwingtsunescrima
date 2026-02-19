from pydantic import BaseModel
from datetime import datetime


class LessonCreate(BaseModel):
    school_id: str
    branch: str
    lesson_type: str
    lesson_date: datetime
    notes: str | None = None


class LessonUpdate(BaseModel):
    branch: str | None = None
    lesson_type: str | None = None
    lesson_date: datetime | None = None
    notes: str | None = None


class LessonResponse(BaseModel):
    id: str
    school_id: str
    branch: str
    lesson_type: str
    lesson_date: datetime
    duration_hours: float
    created_by: str
    notes: str | None
    created_at: datetime
    school_name: str | None = None
    attendance_count: int = 0
    schedule_id: str | None = None

    model_config = {"from_attributes": True}


class LessonListResponse(BaseModel):
    items: list[LessonResponse]
    total: int
