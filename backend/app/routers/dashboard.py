from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.auth import get_current_user
from app.models.user import User, UserRole, UserStatus
from app.models.school import School, SchoolManager
from app.models.student import Student, StudentProgress, Branch
from app.models.event import Event
from app.models.request import Request, RequestStatus
from app.schemas.dashboard import DashboardStats, ManagerDashboardStats, StudentDashboardStats
from app.services.grade_hours import get_hours_for_grade

router = APIRouter()


@router.get("/stats")
async def get_dashboard_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.role in (UserRole.SUPER_ADMIN.value, UserRole.ADMIN.value):
        return await _admin_stats(db)
    elif current_user.role == UserRole.MANAGER.value:
        return await _manager_stats(current_user, db)
    else:
        return await _student_stats(current_user, db)


async def _admin_stats(db: AsyncSession) -> DashboardStats:
    schools = await db.execute(select(func.count(School.id)))
    students = await db.execute(
        select(func.count(Student.id))
        .join(Student.user)
        .where(User.status == UserStatus.ACTIVE.value)
    )
    managers = await db.execute(
        select(func.count(User.id)).where(User.role == UserRole.MANAGER.value)
    )
    active_events = await db.execute(
        select(func.count(Event.id)).where(Event.is_completed == False)
    )
    pending_requests = await db.execute(
        select(func.count(Request.id)).where(Request.status == RequestStatus.PENDING.value)
    )
    pending_approvals = await db.execute(
        select(func.count(User.id)).where(
            User.status == UserStatus.PENDING.value,
            User.role == UserRole.USER.value,
        )
    )

    return DashboardStats(
        total_schools=schools.scalar() or 0,
        total_students=students.scalar() or 0,
        total_managers=managers.scalar() or 0,
        active_events=active_events.scalar() or 0,
        pending_requests=pending_requests.scalar() or 0,
        pending_approvals=pending_approvals.scalar() or 0,
    )


async def _manager_stats(user: User, db: AsyncSession) -> ManagerDashboardStats:
    # Get manager's school
    sm_result = await db.execute(
        select(SchoolManager)
        .options(selectinload(SchoolManager.school))
        .where(SchoolManager.user_id == user.id)
    )
    sm = sm_result.scalar_one_or_none()
    school_name = sm.school.name if sm and sm.school else "Bilinmiyor"
    school_id = sm.school_id if sm else None

    total_students = 0
    pending_requests_count = 0
    pending_approvals_count = 0

    if school_id:
        students = await db.execute(
            select(func.count(Student.id))
            .join(Student.user)
            .where(Student.school_id == school_id, User.status == UserStatus.ACTIVE.value)
        )
        total_students = students.scalar() or 0

        student_ids_q = select(Student.id).where(Student.school_id == school_id)
        pr = await db.execute(
            select(func.count(Request.id)).where(
                Request.student_id.in_(student_ids_q),
                Request.status == RequestStatus.PENDING.value,
            )
        )
        pending_requests_count = pr.scalar() or 0

        pa = await db.execute(
            select(func.count(Student.id))
            .join(Student.user)
            .where(Student.school_id == school_id, User.status == UserStatus.PENDING.value)
        )
        pending_approvals_count = pa.scalar() or 0

    upcoming_events = await db.execute(
        select(func.count(Event.id)).where(
            Event.is_completed == False,
            Event.start_datetime >= datetime.now(timezone.utc),
        )
    )

    return ManagerDashboardStats(
        school_name=school_name,
        total_students=total_students,
        pending_requests=pending_requests_count,
        pending_approvals=pending_approvals_count,
        upcoming_events=upcoming_events.scalar() or 0,
    )


async def _student_stats(user: User, db: AsyncSession) -> StudentDashboardStats:
    student_result = await db.execute(
        select(Student)
        .options(selectinload(Student.school), selectinload(Student.progress))
        .where(Student.user_id == user.id)
    )
    student = student_result.scalar_one_or_none()

    wt_grade = None
    wt_completed = None
    wt_remaining = None
    wt_required = None
    wt_minimum = None
    escrima_grade = None
    escrima_completed = None
    escrima_remaining = None
    escrima_required = None
    escrima_minimum = None
    school_name = None

    if student:
        school_name = student.school.name if student.school else None
        for p in student.progress:
            hours_info = get_hours_for_grade(p.current_grade)
            completed = float(p.completed_hours)
            remaining = max(0, hours_info["required"] - completed)
            if p.branch == Branch.WING_TSUN.value:
                wt_grade = p.current_grade
                wt_completed = completed
                wt_remaining = remaining
                wt_required = hours_info["required"]
                wt_minimum = hours_info["minimum"]
            elif p.branch == Branch.ESCRIMA.value:
                escrima_grade = p.current_grade
                escrima_completed = completed
                escrima_remaining = remaining
                escrima_required = hours_info["required"]
                escrima_minimum = hours_info["minimum"]

    upcoming_events = await db.execute(
        select(func.count(Event.id)).where(
            Event.is_completed == False,
            Event.start_datetime >= datetime.now(timezone.utc),
        )
    )

    return StudentDashboardStats(
        school_name=school_name,
        wt_grade=wt_grade,
        wt_completed_hours=wt_completed,
        wt_remaining_hours=wt_remaining,
        wt_required_hours=wt_required,
        wt_minimum_hours=wt_minimum,
        escrima_grade=escrima_grade,
        escrima_completed_hours=escrima_completed,
        escrima_remaining_hours=escrima_remaining,
        escrima_required_hours=escrima_required,
        escrima_minimum_hours=escrima_minimum,
        upcoming_events=upcoming_events.scalar() or 0,
    )
