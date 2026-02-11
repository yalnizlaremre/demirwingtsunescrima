from pydantic import BaseModel
from datetime import datetime


class RequestCreate(BaseModel):
    request_type: str
    product_id: str | None = None
    size: str | None = None
    branch: str | None = None
    preferred_date: datetime | None = None
    notes: str | None = None


class RequestHandleAction(BaseModel):
    status: str  # APPROVED or REJECTED


class RequestResponse(BaseModel):
    id: str
    student_id: str
    request_type: str
    status: str
    product_id: str | None
    size: str | None
    branch: str | None
    preferred_date: datetime | None
    notes: str | None
    handled_by: str | None
    handled_at: datetime | None
    created_at: datetime
    student_name: str | None = None
    product_name: str | None = None

    model_config = {"from_attributes": True}


class RequestListResponse(BaseModel):
    items: list[RequestResponse]
    total: int
