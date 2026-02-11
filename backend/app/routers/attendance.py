from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.auth import get_current_user, require_manager_or_above
from app.models.user import User, UserRole
from app.models.school import SchoolManager
from app.models.lesson import Lesson
from app.models.attendance import Attendance
from app.models.student import Student, StudentProgress
from app.models.audit_log import AuditAction
from app.services.audit import create_audit_log
from app.schemas.attendance import AttendanceCreate, AttendanceResponse, AttendanceListResponse

router = APIRouter()


@router.post("/", response_model=AttendanceListResponse)
async def create_attendance(
    data: AttendanceCreate,
    current_user: User = Depends(require_manager_or_above),
    db: AsyncSession = Depends(get_db),
):
    # Get lesson
    lesson_result = await db.execute(
        select(Lesson).where(Lesson.id == data.lesson_id)
    )
    lesson = lesson_result.scalar_one_or_none()
    if not lesson:
        raise HTTPException(status_code=404, detail="Ders bulunamadı")

    # MANAGER check: own school only
    if current_user.role == UserRole.MANAGER.value:
        manager_schools = await db.execute(
            select(SchoolManager.school_id).where(SchoolManager.user_id == current_user.id)
        )
        school_ids = [row[0] for row in manager_schools.all()]
        if lesson.school_id not in school_ids:
            raise HTTPException(status_code=403, detail="Bu ders sizin okulunuzda değil")

    created = []
    for sid in data.student_ids:
        # Check student belongs to same school
        student_result = await db.execute(
            select(Student).options(selectinload(Student.user)).where(Student.id == sid)
        )
        student = student_result.scalar_one_or_none()
        if not student or student.school_id != lesson.school_id:
            continue

        # Check duplicate
        existing = await db.execute(
            select(Attendance).where(
                Attendance.lesson_id == lesson.id,
                Attendance.student_id == sid,
            )
        )
        if existing.scalar_one_or_none():
            continue

        hours = float(lesson.duration_hours)

        att = Attendance(
            lesson_id=lesson.id,
            student_id=sid,
            hours_credited=hours,
        )
        db.add(att)

        # Update student progress
        progress_result = await db.execute(
            select(StudentProgress).where(
                StudentProgress.student_id == sid,
                StudentProgress.branch == lesson.branch,
            )
        )
        progress = progress_result.scalar_one_or_none()
        if progress:
            progress.completed_hours = float(progress.completed_hours) + hours

        await create_audit_log(
            db,
            action=AuditAction.ATTENDANCE_CREATED,
            entity_type="Attendance",
            entity_id=sid,
            performed_by=current_user.id,
            details=f"Yoklama: {student.user.full_name}, {lesson.branch}, {hours} saat",
        )

        created.append(att)

    await db.commit()

    items = []
    for att in created:
        await db.refresh(att)
        student_result = await db.execute(
            select(Student).options(selectinload(Student.user)).where(Student.id == att.student_id)
        )
        student = student_result.scalar_one_or_none()
        items.append(
            AttendanceResponse(
                id=str(att.id),
                lesson_id=str(att.lesson_id),
                student_id=str(att.student_id),
                hours_credited=float(att.hours_credited),
                created_at=att.created_at,
                student_name=student.user.full_name if student and student.user else None,
            )
        )

    return AttendanceListResponse(items=items, total=len(items))


@router.get("/lesson/{lesson_id}", response_model=AttendanceListResponse)
async def get_lesson_attendance(
    lesson_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Attendance)
        .options(selectinload(Attendance.student).selectinload(Student.user))
        .where(Attendance.lesson_id == lesson_id)
    )
    attendances = result.scalars().all()

    return AttendanceListResponse(
        items=[
            AttendanceResponse(
                id=str(a.id),
                lesson_id=str(a.lesson_id),
                student_id=str(a.student_id),
                hours_credited=float(a.hours_credited),
                created_at=a.created_at,
                student_name=a.student.user.full_name if a.student and a.student.user else None,
            )
            for a in attendances
        ],
        total=len(attendances),
    )


@router.delete("/{attendance_id}")
async def delete_attendance(
    attendance_id: str,
    current_user: User = Depends(require_manager_or_above),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Attendance).where(Attendance.id == attendance_id)
    )
    att = result.scalar_one_or_none()
    if not att:
        raise HTTPException(status_code=404, detail="Yoklama kaydı bulunamadı")

    # Get lesson for branch info
    lesson_result = await db.execute(select(Lesson).where(Lesson.id == att.lesson_id))
    lesson = lesson_result.scalar_one_or_none()

    # Revert hours from student progress
    if lesson:
        progress_result = await db.execute(
            select(StudentProgress).where(
                StudentProgress.student_id == att.student_id,
                StudentProgress.branch == lesson.branch,
            )
        )
        progress = progress_result.scalar_one_or_none()
        if progress:
            progress.completed_hours = max(0, float(progress.completed_hours) - float(att.hours_credited))

    await create_audit_log(
        db,
        action=AuditAction.ATTENDANCE_DELETED,
        entity_type="Attendance",
        entity_id=att.id,
        performed_by=current_user.id,
        details=f"Yoklama silindi: {att.hours_credited} saat",
    )

    await db.delete(att)
    await db.commit()
    return {"message": "Yoklama silindi ve saatler geri alındı"}
