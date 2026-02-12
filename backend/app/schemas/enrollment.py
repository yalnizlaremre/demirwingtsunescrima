from pydantic import BaseModel
from typing import Optional


class EnrollmentCreate(BaseModel):
    school_id: str
    notes: Optional[str] = None


class EnrollmentResponse(BaseModel):
    id: str
    user_id: str
    school_id: str
    status: str
    notes: Optional[str] = None
    created_at: str
    user_name: Optional[str] = None
    user_email: Optional[str] = None
    school_name: Optional[str] = None

    model_config = {"from_attributes": True}


class EnrollmentListResponse(BaseModel):
    items: list[EnrollmentResponse]
    total: int
