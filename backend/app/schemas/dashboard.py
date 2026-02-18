from pydantic import BaseModel


class DashboardStats(BaseModel):
    total_schools: int
    total_students: int
    total_managers: int
    active_events: int
    pending_requests: int
    pending_approvals: int


class ManagerDashboardStats(BaseModel):
    school_name: str
    total_students: int
    pending_requests: int
    pending_approvals: int
    upcoming_events: int


class StudentDashboardStats(BaseModel):
    school_name: str | None
    wt_grade: int | None
    wt_completed_hours: float | None
    wt_remaining_hours: float | None
    wt_required_hours: int | None = None
    wt_minimum_hours: int | None = None
    escrima_grade: int | None
    escrima_completed_hours: float | None
    escrima_remaining_hours: float | None
    escrima_required_hours: int | None = None
    escrima_minimum_hours: int | None = None
    upcoming_events: int
