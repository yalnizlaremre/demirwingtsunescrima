from pydantic import BaseModel
from datetime import datetime


class EventCreate(BaseModel):
    name: str
    description: str | None = None
    event_type: str
    start_datetime: datetime
    end_datetime: datetime
    location: str | None = None
    capacity: int | None = None
    scope: str = "ALL_SCHOOLS"
    selected_school_ids: list[str] = []
    wt_fee: float | None = None
    escrima_fee: float | None = None


class EventUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    start_datetime: datetime | None = None
    end_datetime: datetime | None = None
    location: str | None = None
    capacity: int | None = None
    scope: str | None = None
    selected_school_ids: list[str] | None = None
    wt_fee: float | None = None
    escrima_fee: float | None = None


class EventResponse(BaseModel):
    id: str
    name: str
    description: str | None
    event_type: str
    start_datetime: datetime
    end_datetime: datetime
    location: str | None
    capacity: int | None
    scope: str
    wt_fee: float | None
    escrima_fee: float | None
    is_completed: bool
    created_by: str
    created_at: datetime
    registration_count: int = 0
    selected_school_ids: list[str] = []

    model_config = {"from_attributes": True}


class EventListResponse(BaseModel):
    items: list[EventResponse]
    total: int


class EventRegistrationCreate(BaseModel):
    register_wt: bool = False
    register_escrima: bool = False
    will_take_exam: bool = False
    exam_branch_wt: bool = False
    exam_branch_escrima: bool = False


class EventRegistrationResponse(BaseModel):
    id: str
    event_id: str
    student_id: str
    register_wt: bool
    register_escrima: bool
    will_take_exam: bool
    exam_branch_wt: bool
    exam_branch_escrima: bool
    created_at: datetime
    student_name: str | None = None

    model_config = {"from_attributes": True}


class SeminarEvaluateRequest(BaseModel):
    passed_student_ids: list[str]
