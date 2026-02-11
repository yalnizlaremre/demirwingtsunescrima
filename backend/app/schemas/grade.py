from pydantic import BaseModel


class GradeRequirementCreate(BaseModel):
    branch: str
    grade: int
    grade_name: str
    required_hours: float


class GradeRequirementUpdate(BaseModel):
    grade_name: str | None = None
    required_hours: float | None = None


class GradeRequirementResponse(BaseModel):
    id: str
    branch: str
    grade: int
    grade_name: str
    required_hours: float

    model_config = {"from_attributes": True}


class ManualGradeChangeRequest(BaseModel):
    student_id: str
    branch: str
    new_grade: int
    note: str
