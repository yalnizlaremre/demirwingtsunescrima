from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.auth import get_current_user, require_admin_or_above
from app.models.user import User
from app.models.student import Student, StudentProgress, Branch
from app.models.grade import GradeRequirement
from app.models.audit_log import AuditAction
from app.services.audit import create_audit_log
from app.schemas.grade import (
    GradeRequirementCreate,
    GradeRequirementUpdate,
    GradeRequirementResponse,
    ManualGradeChangeRequest,
)

router = APIRouter()


@router.get("/requirements", response_model=list[GradeRequirementResponse])
async def list_grade_requirements(
    branch: str | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(GradeRequirement)
    if branch:
        query = query.where(GradeRequirement.branch == branch)
    query = query.order_by(GradeRequirement.branch, GradeRequirement.grade)

    result = await db.execute(query)
    requirements = result.scalars().all()

    return [
        GradeRequirementResponse(
            id=str(r.id),
            branch=r.branch,
            grade=r.grade,
            grade_name=r.grade_name,
            required_hours=float(r.required_hours),
        )
        for r in requirements
    ]


@router.post("/requirements", response_model=GradeRequirementResponse)
async def create_grade_requirement(
    data: GradeRequirementCreate,
    current_user: User = Depends(require_admin_or_above),
    db: AsyncSession = Depends(get_db),
):
    req = GradeRequirement(
        branch=data.branch,
        grade=data.grade,
        grade_name=data.grade_name,
        required_hours=data.required_hours,
    )
    db.add(req)
    await db.commit()
    await db.refresh(req)

    return GradeRequirementResponse(
        id=str(req.id),
        branch=req.branch,
        grade=req.grade,
        grade_name=req.grade_name,
        required_hours=float(req.required_hours),
    )


@router.put("/requirements/{req_id}", response_model=GradeRequirementResponse)
async def update_grade_requirement(
    req_id: str,
    data: GradeRequirementUpdate,
    current_user: User = Depends(require_admin_or_above),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(GradeRequirement).where(GradeRequirement.id == req_id)
    )
    req = result.scalar_one_or_none()
    if not req:
        raise HTTPException(status_code=404, detail="Derece gereksinimi bulunamadı")

    if data.grade_name is not None:
        req.grade_name = data.grade_name
    if data.required_hours is not None:
        req.required_hours = data.required_hours

    await db.commit()
    await db.refresh(req)

    return GradeRequirementResponse(
        id=str(req.id),
        branch=req.branch,
        grade=req.grade,
        grade_name=req.grade_name,
        required_hours=float(req.required_hours),
    )


@router.post("/manual-change")
async def manual_grade_change(
    data: ManualGradeChangeRequest,
    current_user: User = Depends(require_admin_or_above),
    db: AsyncSession = Depends(get_db),
):
    if not data.note or not data.note.strip():
        raise HTTPException(status_code=400, detail="Not alanı zorunludur")

    result = await db.execute(
        select(StudentProgress).where(
            StudentProgress.student_id == data.student_id,
            StudentProgress.branch == data.branch,
        )
    )
    progress = result.scalar_one_or_none()
    if not progress:
        raise HTTPException(status_code=404, detail="Öğrenci ilerleme kaydı bulunamadı")

    old_grade = progress.current_grade
    progress.current_grade = data.new_grade

    await create_audit_log(
        db,
        action=AuditAction.MANUAL_GRADE_CHANGE,
        entity_type="StudentProgress",
        entity_id=progress.id,
        performed_by=current_user.id,
        details=data.note,
        old_value=str(old_grade),
        new_value=str(data.new_grade),
    )

    await db.commit()
    return {
        "message": f"Derece {old_grade} -> {data.new_grade} olarak güncellendi",
        "old_grade": old_grade,
        "new_grade": data.new_grade,
    }
