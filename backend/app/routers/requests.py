from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.auth import get_current_user, require_manager_or_above
from app.models.user import User, UserRole
from app.models.student import Student
from app.models.school import SchoolManager
from app.models.request import Request, RequestType, RequestStatus
from app.models.product import Product
from app.models.audit_log import AuditAction
from app.services.audit import create_audit_log
from app.schemas.request import (
    RequestCreate, RequestHandleAction, RequestResponse, RequestListResponse,
)

router = APIRouter()


@router.get("/", response_model=RequestListResponse)
async def list_requests(
    request_type: str | None = None,
    status: str | None = None,
    school_id: str | None = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Request).options(
        selectinload(Request.student).selectinload(Student.user),
        selectinload(Request.product),
    )
    count_query = select(func.count(Request.id))

    # MANAGER: only own school
    if current_user.role == UserRole.MANAGER.value:
        school_ids_q = select(SchoolManager.school_id).where(
            SchoolManager.user_id == current_user.id
        )
        student_ids_q = select(Student.id).where(Student.school_id.in_(school_ids_q))
        query = query.where(Request.student_id.in_(student_ids_q))
        count_query = count_query.where(Request.student_id.in_(student_ids_q))
    # USER: own requests only
    elif current_user.role == UserRole.USER.value:
        student_ids_q = select(Student.id).where(Student.user_id == current_user.id)
        query = query.where(Request.student_id.in_(student_ids_q))
        count_query = count_query.where(Request.student_id.in_(student_ids_q))

    if request_type:
        query = query.where(Request.request_type == request_type)
        count_query = count_query.where(Request.request_type == request_type)
    if status:
        query = query.where(Request.status == status)
        count_query = count_query.where(Request.status == status)
    if school_id:
        student_ids_q2 = select(Student.id).where(Student.school_id == school_id)
        query = query.where(Request.student_id.in_(student_ids_q2))
        count_query = count_query.where(Request.student_id.in_(student_ids_q2))

    total_result = await db.execute(count_query)
    total = total_result.scalar()

    result = await db.execute(
        query.order_by(Request.created_at.desc()).offset(skip).limit(limit)
    )
    requests = result.scalars().unique().all()

    return RequestListResponse(
        items=[
            RequestResponse(
                id=str(r.id),
                student_id=str(r.student_id),
                request_type=r.request_type,
                status=r.status,
                product_id=str(r.product_id) if r.product_id else None,
                size=r.size,
                branch=r.branch,
                preferred_date=r.preferred_date,
                notes=r.notes,
                handled_by=str(r.handled_by) if r.handled_by else None,
                handled_at=r.handled_at,
                created_at=r.created_at,
                student_name=r.student.user.full_name if r.student and r.student.user else None,
                product_name=r.product.name if r.product else None,
            )
            for r in requests
        ],
        total=total,
    )


@router.post("/", response_model=RequestResponse)
async def create_request(
    data: RequestCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    student_result = await db.execute(
        select(Student).where(Student.user_id == current_user.id)
    )
    student = student_result.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=400, detail="Öğrenci profili bulunamadı")

    req = Request(
        student_id=student.id,
        request_type=data.request_type,
        product_id=data.product_id,
        size=data.size,
        branch=data.branch,
        preferred_date=data.preferred_date,
        notes=data.notes,
    )
    db.add(req)
    await db.commit()
    await db.refresh(req)

    return RequestResponse(
        id=str(req.id),
        student_id=str(req.student_id),
        request_type=req.request_type,
        status=req.status,
        product_id=str(req.product_id) if req.product_id else None,
        size=req.size,
        branch=req.branch,
        preferred_date=req.preferred_date,
        notes=req.notes,
        handled_by=None,
        handled_at=None,
        created_at=req.created_at,
    )


@router.post("/{request_id}/handle")
async def handle_request(
    request_id: str,
    data: RequestHandleAction,
    current_user: User = Depends(require_manager_or_above),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Request).where(Request.id == request_id)
    )
    req = result.scalar_one_or_none()
    if not req:
        raise HTTPException(status_code=404, detail="Talep bulunamadı")

    if req.status != RequestStatus.PENDING.value:
        raise HTTPException(status_code=400, detail="Bu talep zaten işlenmiş")

    req.status = data.status
    req.handled_by = current_user.id
    req.handled_at = datetime.now(timezone.utc)

    await create_audit_log(
        db,
        action=AuditAction.REQUEST_HANDLED,
        entity_type="Request",
        entity_id=req.id,
        performed_by=current_user.id,
        details=f"Talep {data.status}: {req.request_type}",
    )

    await db.commit()
    return {"message": f"Talep {data.status} olarak güncellendi"}
