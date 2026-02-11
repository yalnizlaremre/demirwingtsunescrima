from pydantic import BaseModel
from datetime import datetime, date


class StudentCreate(BaseModel):
    user_id: str
    school_id: str
    date_of_birth: date | None = None
    emergency_contact: str | None = None
    emergency_phone: str | None = None
    notes: str | None = None


class StudentUpdate(BaseModel):
    school_id: str | None = None
    date_of_birth: date | None = None
    emergency_contact: str | None = None
    emergency_phone: str | None = None
    notes: str | None = None


class StudentProgressResponse(BaseModel):
    id: str
    branch: str
    current_grade: int
    completed_hours: float
    remaining_hours: float

    model_config = {"from_attributes": True}


class StudentResponse(BaseModel):
    id: str
    user_id: str
    school_id: str
    date_of_birth: date | None
    emergency_contact: str | None
    emergency_phone: str | None
    notes: str | None
    created_at: datetime
    user_name: str | None = None
    user_email: str | None = None
    school_name: str | None = None
    progress: list[StudentProgressResponse] = []

    model_config = {"from_attributes": True}


class StudentListResponse(BaseModel):
    items: list[StudentResponse]
    total: int


class ApproveStudentRequest(BaseModel):
    approved: bool
