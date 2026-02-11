from pydantic import BaseModel
from datetime import datetime


class AttendanceCreate(BaseModel):
    lesson_id: str
    student_ids: list[str]


class AttendanceResponse(BaseModel):
    id: str
    lesson_id: str
    student_id: str
    hours_credited: float
    created_at: datetime
    student_name: str | None = None

    model_config = {"from_attributes": True}


class AttendanceListResponse(BaseModel):
    items: list[AttendanceResponse]
    total: int
