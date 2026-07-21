from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.auth import get_current_user, require_manage_grades, require_manager_or_above
from app.models.user import User, UserRole
from app.models.student import Student, StudentProgress, Branch
from app.models.school import SchoolManager
from app.models.grade import GradeRequirement
from app.models.grade_change_request import GradeChangeRequest, GradeChangeStatus
from app.models.audit_log import AuditAction
from app.services.audit import create_audit_log
from app.utils import utcnow_naive
from app.schemas.grade import (
    GradeRequirementCreate,
    GradeRequirementUpdate,
    GradeRequirementResponse,
    ManualGradeChangeRequest,
)
from app.schemas.grade_change_request import (
    GradeChangeRequestCreate,
    GradeChangeRequestResponse,
    GradeChangeRequestListResponse,
)

router = APIRouter()


def _change_request_to_response(r: GradeChangeRequest) -> GradeChangeRequestResponse:
    return GradeChangeRequestResponse(
        id=str(r.id),
        student_id=str(r.student_id),
        branch=r.branch,
        current_grade=r.current_grade,
        requested_grade=r.requested_grade,
        note=r.note,
        status=r.status,
        requested_by=str(r.requested_by),
        handled_by=str(r.handled_by) if r.handled_by else None,
        handled_at=r.handled_at,
        created_at=r.created_at,
        student_name=r.student.user.full_name if r.student and r.student.user else None,
        school_name=r.student.school.name if r.student and r.student.school else None,
        requested_by_name=r.requester.full_name if r.requester else None,
    )


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
    current_user: User = Depends(require_manage_grades),
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
    current_user: User = Depends(require_manage_grades),
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


async def _apply_grade_change(
    db: AsyncSession,
    student_id: str,
    branch: str,
    new_grade: int,
    note: str,
    performed_by: str,
    action: AuditAction,
) -> int:
    result = await db.execute(
        select(StudentProgress).where(
            StudentProgress.student_id == student_id,
            StudentProgress.branch == branch,
        )
    )
    progress = result.scalar_one_or_none()
    if not progress:
        raise HTTPException(status_code=404, detail="Öğrenci ilerleme kaydı bulunamadı")

    old_grade = progress.current_grade
    progress.current_grade = new_grade

    await create_audit_log(
        db,
        action=action,
        entity_type="StudentProgress",
        entity_id=progress.id,
        performed_by=performed_by,
        details=note,
        old_value=str(old_grade),
        new_value=str(new_grade),
    )
    return old_grade


async def _manager_school_ids(db: AsyncSession, user_id: str) -> list[str]:
    result = await db.execute(
        select(SchoolManager.school_id).where(SchoolManager.user_id == user_id)
    )
    return [row[0] for row in result.all()]


@router.post("/manual-change")
async def manual_grade_change(
    data: ManualGradeChangeRequest,
    current_user: User = Depends(require_manage_grades),
    db: AsyncSession = Depends(get_db),
):
    if not data.note or not data.note.strip():
        raise HTTPException(status_code=400, detail="Not alanı zorunludur")

    old_grade = await _apply_grade_change(
        db,
        student_id=data.student_id,
        branch=data.branch,
        new_grade=data.new_grade,
        note=data.note,
        performed_by=current_user.id,
        action=AuditAction.MANUAL_GRADE_CHANGE,
    )

    await db.commit()
    return {
        "message": f"Derece {old_grade} -> {data.new_grade} olarak güncellendi",
        "old_grade": old_grade,
        "new_grade": data.new_grade,
    }


@router.post("/change-requests", response_model=GradeChangeRequestResponse)
async def create_grade_change_request(
    data: GradeChangeRequestCreate,
    current_user: User = Depends(require_manager_or_above),
    db: AsyncSession = Depends(get_db),
):
    if not data.note or not data.note.strip():
        raise HTTPException(status_code=400, detail="Not alanı zorunludur")

    student_result = await db.execute(
        select(Student).where(Student.id == data.student_id)
    )
    student = student_result.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Öğrenci bulunamadı")

    if current_user.role == UserRole.MANAGER.value:
        school_ids = await _manager_school_ids(db, current_user.id)
        if student.school_id not in school_ids:
            raise HTTPException(status_code=403, detail="Bu öğrenci sizin okulunuzda değil")

    progress_result = await db.execute(
        select(StudentProgress).where(
            StudentProgress.student_id == data.student_id,
            StudentProgress.branch == data.branch,
        )
    )
    progress = progress_result.scalar_one_or_none()
    if not progress:
        raise HTTPException(status_code=404, detail="Öğrenci ilerleme kaydı bulunamadı")

    req = GradeChangeRequest(
        student_id=data.student_id,
        branch=data.branch,
        current_grade=progress.current_grade,
        requested_grade=data.requested_grade,
        note=data.note,
        status=GradeChangeStatus.PENDING.value,
        requested_by=current_user.id,
    )
    db.add(req)
    await db.flush()

    await create_audit_log(
        db,
        action=AuditAction.GRADE_CHANGE_REQUESTED,
        entity_type="GradeChangeRequest",
        entity_id=req.id,
        performed_by=current_user.id,
        details=data.note,
        old_value=str(progress.current_grade),
        new_value=str(data.requested_grade),
    )

    await db.commit()

    result = await db.execute(
        select(GradeChangeRequest)
        .options(
            selectinload(GradeChangeRequest.student).selectinload(Student.user),
            selectinload(GradeChangeRequest.student).selectinload(Student.school),
            selectinload(GradeChangeRequest.requester),
        )
        .where(GradeChangeRequest.id == req.id)
    )
    req = result.scalar_one()
    return _change_request_to_response(req)


@router.get("/change-requests", response_model=GradeChangeRequestListResponse)
async def list_grade_change_requests(
    status: str | None = None,
    school_id: str | None = None,
    current_user: User = Depends(require_manager_or_above),
    db: AsyncSession = Depends(get_db),
):
    query = select(GradeChangeRequest).options(
        selectinload(GradeChangeRequest.student).selectinload(Student.user),
        selectinload(GradeChangeRequest.student).selectinload(Student.school),
        selectinload(GradeChangeRequest.requester),
    )

    if current_user.role == UserRole.MANAGER.value:
        school_ids = await _manager_school_ids(db, current_user.id)
        student_ids_q = select(Student.id).where(Student.school_id.in_(school_ids))
        query = query.where(GradeChangeRequest.student_id.in_(student_ids_q))
    elif school_id:
        student_ids_q = select(Student.id).where(Student.school_id == school_id)
        query = query.where(GradeChangeRequest.student_id.in_(student_ids_q))

    if status:
        query = query.where(GradeChangeRequest.status == status)

    result = await db.execute(query.order_by(GradeChangeRequest.created_at.desc()))
    requests = result.scalars().unique().all()

    return GradeChangeRequestListResponse(
        items=[_change_request_to_response(r) for r in requests],
        total=len(requests),
    )


@router.post("/change-requests/{request_id}/approve", response_model=GradeChangeRequestResponse)
async def approve_grade_change_request(
    request_id: str,
    current_user: User = Depends(require_manage_grades),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(GradeChangeRequest).where(GradeChangeRequest.id == request_id)
    )
    req = result.scalar_one_or_none()
    if not req:
        raise HTTPException(status_code=404, detail="Talep bulunamadı")
    if req.status != GradeChangeStatus.PENDING.value:
        raise HTTPException(status_code=400, detail="Bu talep zaten işlenmiş")

    await _apply_grade_change(
        db,
        student_id=req.student_id,
        branch=req.branch,
        new_grade=req.requested_grade,
        note=f"Talep onaylandı (eğitmen notu: {req.note})",
        performed_by=current_user.id,
        action=AuditAction.GRADE_CHANGE_APPROVED,
    )

    req.status = GradeChangeStatus.APPROVED.value
    req.handled_by = current_user.id
    req.handled_at = utcnow_naive()

    await db.commit()

    result = await db.execute(
        select(GradeChangeRequest)
        .options(
            selectinload(GradeChangeRequest.student).selectinload(Student.user),
            selectinload(GradeChangeRequest.student).selectinload(Student.school),
            selectinload(GradeChangeRequest.requester),
        )
        .where(GradeChangeRequest.id == req.id)
    )
    req = result.scalar_one()
    return _change_request_to_response(req)


@router.post("/change-requests/{request_id}/reject", response_model=GradeChangeRequestResponse)
async def reject_grade_change_request(
    request_id: str,
    current_user: User = Depends(require_manage_grades),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(GradeChangeRequest).where(GradeChangeRequest.id == request_id)
    )
    req = result.scalar_one_or_none()
    if not req:
        raise HTTPException(status_code=404, detail="Talep bulunamadı")
    if req.status != GradeChangeStatus.PENDING.value:
        raise HTTPException(status_code=400, detail="Bu talep zaten işlenmiş")

    req.status = GradeChangeStatus.REJECTED.value
    req.handled_by = current_user.id
    req.handled_at = utcnow_naive()

    await create_audit_log(
        db,
        action=AuditAction.GRADE_CHANGE_REJECTED,
        entity_type="GradeChangeRequest",
        entity_id=req.id,
        performed_by=current_user.id,
        details=f"Talep reddedildi: {req.note}",
    )

    await db.commit()

    result = await db.execute(
        select(GradeChangeRequest)
        .options(
            selectinload(GradeChangeRequest.student).selectinload(Student.user),
            selectinload(GradeChangeRequest.student).selectinload(Student.school),
            selectinload(GradeChangeRequest.requester),
        )
        .where(GradeChangeRequest.id == req.id)
    )
    req = result.scalar_one()
    return _change_request_to_response(req)
