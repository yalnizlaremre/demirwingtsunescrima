from pydantic import BaseModel
from datetime import datetime


class GradeChangeRequestCreate(BaseModel):
    student_id: str
    branch: str
    requested_grade: int
    note: str


class GradeChangeRequestResponse(BaseModel):
    id: str
    student_id: str
    branch: str
    current_grade: int
    requested_grade: int
    note: str
    status: str
    requested_by: str
    handled_by: str | None
    handled_at: datetime | None
    created_at: datetime
    student_name: str | None = None
    school_name: str | None = None
    requested_by_name: str | None = None

    model_config = {"from_attributes": True}


class GradeChangeRequestListResponse(BaseModel):
    items: list[GradeChangeRequestResponse]
    total: int
