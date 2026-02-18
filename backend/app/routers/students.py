import os
import uuid as uuid_mod
import aiofiles
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.auth import get_current_user, require_manager_or_above
from app.config import settings
from app.models.user import User, UserRole, UserStatus
from app.models.student import Student, StudentProgress, Branch
from app.models.school import SchoolManager
from app.models.audit_log import AuditAction
from app.services.audit import create_audit_log
from app.schemas.student import (
    StudentResponse,
    StudentProgressResponse,
    StudentListResponse,
    ApproveStudentRequest,
    StudentProfileResponse,
    BranchProgressDetail,
)
from app.services.grade_hours import get_hours_for_grade, check_exam_eligibility

router = APIRouter()

ALLOWED_AVATAR_TYPES = {"image/jpeg", "image/png", "image/webp"}


def _student_to_response(student: Student) -> StudentResponse:
    return StudentResponse(
        id=str(student.id),
        user_id=str(student.user_id),
        school_id=str(student.school_id),
        date_of_birth=student.date_of_birth,
        emergency_contact=student.emergency_contact,
        emergency_phone=student.emergency_phone,
        notes=student.notes,
        created_at=student.created_at,
        user_name=student.user.full_name if student.user else None,
        user_email=student.user.email if student.user else None,
        school_name=student.school.name if student.school else None,
        progress=[
            StudentProgressResponse(
                id=str(p.id),
                branch=p.branch,
                current_grade=p.current_grade,
                completed_hours=float(p.completed_hours),
                remaining_hours=float(p.remaining_hours),
            )
            for p in (student.progress or [])
        ],
    )


@router.post("/my-profile/avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Kullanici kendi profil resmini yukler."""
    content_type = file.content_type or ""
    if content_type not in ALLOWED_AVATAR_TYPES:
        raise HTTPException(status_code=400, detail="Sadece JPEG, PNG veya WebP yukleyebilirsiniz")

    content = await file.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Dosya boyutu 5MB'dan buyuk olamaz")

    # Delete old avatar if exists
    if current_user.avatar_url:
        old_file = os.path.join(settings.UPLOAD_DIR, os.path.basename(current_user.avatar_url))
        if os.path.exists(old_file):
            os.remove(old_file)

    # Save new avatar
    ext = os.path.splitext(file.filename)[1] if file.filename else ".jpg"
    unique_name = f"avatar_{uuid_mod.uuid4()}{ext}"
    file_path = os.path.join(settings.UPLOAD_DIR, unique_name)

    async with aiofiles.open(file_path, "wb") as f:
        await f.write(content)

    current_user.avatar_url = f"/uploads/{unique_name}"
    await db.commit()

    return {"avatar_url": current_user.avatar_url}


@router.get("/my-profile", response_model=StudentProfileResponse)
async def get_my_profile(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Ogrencinin kendi profil bilgilerini getirir."""
    result = await db.execute(
        select(Student)
        .options(
            selectinload(Student.user),
            selectinload(Student.school),
            selectinload(Student.progress),
        )
        .where(Student.user_id == current_user.id)
    )
    student = result.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Öğrenci profili bulunamadı")

    progress_details = []
    for p in (student.progress or []):
        grade = p.current_grade
        hours = get_hours_for_grade(grade)
        completed = float(p.completed_hours)
        remaining = max(0, hours["required"] - completed)
        eligibility = check_exam_eligibility(grade, completed)
        progress_details.append(BranchProgressDetail(
            branch=p.branch,
            current_grade=grade,
            completed_hours=completed,
            required_hours=hours["required"],
            minimum_hours=hours["minimum"],
            remaining_hours=remaining,
            exam_eligibility=eligibility,
        ))

    return StudentProfileResponse(
        id=str(student.id),
        user_id=str(student.user_id),
        first_name=student.user.first_name,
        last_name=student.user.last_name,
        email=student.user.email,
        phone=student.user.phone,
        school_name=student.school.name if student.school else None,
        school_id=str(student.school_id) if student.school_id else None,
        progress=progress_details,
    )


@router.get("/", response_model=StudentListResponse)
async def list_students(
    school_id: str | None = None,
    search: str | None = None,
    branch: str | None = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Student).options(
        selectinload(Student.user),
        selectinload(Student.school),
        selectinload(Student.progress),
    )
    count_query = select(func.count(Student.id))

    # MANAGER only sees own school students
    if current_user.role == UserRole.MANAGER.value:
        school_ids_q = select(SchoolManager.school_id).where(
            SchoolManager.user_id == current_user.id
        )
        query = query.where(Student.school_id.in_(school_ids_q))
        count_query = count_query.where(Student.school_id.in_(school_ids_q))
    # USER only sees themselves
    elif current_user.role == UserRole.USER.value:
        query = query.where(Student.user_id == current_user.id)
        count_query = count_query.where(Student.user_id == current_user.id)

    if school_id:
        query = query.where(Student.school_id == school_id)
        count_query = count_query.where(Student.school_id == school_id)

    if search:
        # Join with User to search by name
        query = query.join(Student.user).where(
            User.first_name.ilike(f"%{search}%") | User.last_name.ilike(f"%{search}%")
        )

    total_result = await db.execute(count_query)
    total = total_result.scalar()

    result = await db.execute(
        query.order_by(Student.created_at.desc()).offset(skip).limit(limit)
    )
    students = result.scalars().unique().all()

    return StudentListResponse(
        items=[_student_to_response(s) for s in students],
        total=total,
    )


@router.get("/pending", response_model=StudentListResponse)
async def list_pending_students(
    current_user: User = Depends(require_manager_or_above),
    db: AsyncSession = Depends(get_db),
):
    query = (
        select(Student)
        .options(
            selectinload(Student.user),
            selectinload(Student.school),
            selectinload(Student.progress),
        )
        .join(Student.user)
        .where(User.status == UserStatus.PENDING.value)
    )

    # MANAGER only sees own school
    if current_user.role == UserRole.MANAGER.value:
        school_ids_q = select(SchoolManager.school_id).where(
            SchoolManager.user_id == current_user.id
        )
        query = query.where(Student.school_id.in_(school_ids_q))

    result = await db.execute(query.order_by(Student.created_at.desc()))
    students = result.scalars().unique().all()

    return StudentListResponse(
        items=[_student_to_response(s) for s in students],
        total=len(students),
    )


@router.get("/{student_id}", response_model=StudentResponse)
async def get_student(
    student_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Student)
        .options(
            selectinload(Student.user),
            selectinload(Student.school),
            selectinload(Student.progress),
        )
        .where(Student.id == student_id)
    )
    student = result.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Öğrenci bulunamadı")

    return _student_to_response(student)


@router.post("/{student_id}/approve")
async def approve_student(
    student_id: str,
    data: ApproveStudentRequest,
    current_user: User = Depends(require_manager_or_above),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Student).options(selectinload(Student.user)).where(Student.id == student_id)
    )
    student = result.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Öğrenci bulunamadı")

    if student.user.status != UserStatus.PENDING.value:
        raise HTTPException(status_code=400, detail="Bu öğrenci zaten işlenmiş")

    # MANAGER can only approve own school students
    if current_user.role == UserRole.MANAGER.value:
        manager_schools = await db.execute(
            select(SchoolManager.school_id).where(SchoolManager.user_id == current_user.id)
        )
        school_ids = [row[0] for row in manager_schools.all()]
        if student.school_id not in school_ids:
            raise HTTPException(status_code=403, detail="Bu öğrenci sizin okulunuzda değil")

    if data.approved:
        student.user.status = UserStatus.ACTIVE.value
        # Create progress records for both branches
        for branch in Branch:
            existing = await db.execute(
                select(StudentProgress).where(
                    StudentProgress.student_id == student.id,
                    StudentProgress.branch == branch.value,
                )
            )
            if not existing.scalar_one_or_none():
                initial_hours = get_hours_for_grade(1)
                progress = StudentProgress(
                    student_id=student.id,
                    branch=branch.value,
                    current_grade=1,
                    completed_hours=0,
                    remaining_hours=initial_hours["required"],
                )
                db.add(progress)

        await create_audit_log(
            db,
            action=AuditAction.STUDENT_APPROVED,
            entity_type="Student",
            entity_id=student.id,
            performed_by=current_user.id,
            details=f"Öğrenci onaylandı: {student.user.full_name}",
        )
    else:
        student.user.status = UserStatus.INACTIVE.value
        await create_audit_log(
            db,
            action=AuditAction.STUDENT_REJECTED,
            entity_type="Student",
            entity_id=student.id,
            performed_by=current_user.id,
            details=f"Öğrenci reddedildi: {student.user.full_name}",
        )

    await db.commit()
    return {"message": "Öğrenci onaylandı" if data.approved else "Öğrenci reddedildi"}
