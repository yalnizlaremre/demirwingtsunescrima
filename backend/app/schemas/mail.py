from pydantic import BaseModel
from datetime import datetime


class SendMailRequest(BaseModel):
    subject: str
    body: str
    school_ids: list[str] | None = None  # None = all schools
    branch: str | None = None
    grade_min: int | None = None
    grade_max: int | None = None


class EmailLogResponse(BaseModel):
    id: str
    sent_by: str
    subject: str
    body: str
    recipient_count: int
    filters_applied: str | None
    created_at: datetime
    sender_name: str | None = None

    model_config = {"from_attributes": True}


class EmailLogListResponse(BaseModel):
    items: list[EmailLogResponse]
    total: int
