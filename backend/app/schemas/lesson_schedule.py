from pydantic import BaseModel
from datetime import datetime


class LessonScheduleCreate(BaseModel):
    school_id: str
    branch: str
    lesson_type: str
    day_of_week: int  # 0=Monday ... 6=Sunday
    start_time: str  # "19:00"
    start_date: str  # "2026-01-01"
    end_date: str  # "2026-12-31"
    notes: str | None = None


class LessonScheduleResponse(BaseModel):
    id: str
    school_id: str
    branch: str
    lesson_type: str
    day_of_week: int
    start_time: str
    duration_hours: float
    start_date: datetime
    end_date: datetime
    is_active: bool
    notes: str | None
    created_by: str
    created_at: datetime
    school_name: str | None = None
    generated_lesson_count: int = 0

    model_config = {"from_attributes": True}


class LessonScheduleListResponse(BaseModel):
    items: list[LessonScheduleResponse]
    total: int
