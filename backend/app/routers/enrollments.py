from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.auth import get_current_user, require_manager_or_above, get_current_user_optional, require_admin_or_above
from app.models.enrollment import Enrollment, EnrollmentStatus
from app.models.user import User, UserRole, UserStatus
from app.models.school import School
from app.models.student import Student, StudentProgress, Branch
from app.schemas.enrollment import EnrollmentCreate, EnrollmentResponse, EnrollmentListResponse
from app.services.grade_hours import get_hours_for_grade

router = APIRouter()


@router.post("/", response_model=EnrollmentResponse)
async def create_enrollment(data: EnrollmentCreate, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    # user must be authenticated
    # ensure user is not already a student at the school
    # ensure only one pending enrollment per user/school
    existing_q = select(Enrollment).where(Enrollment.user_id == user.id, Enrollment.school_id == data.school_id)
    existing = (await db.execute(existing_q)).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="Zaten bu okul için bir talebiniz bulunuyor")

    # ensure school exists
    school_res = await db.execute(select(School).where(School.id == data.school_id))
    if not school_res.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Okul bulunamadı")

    e = Enrollment(user_id=user.id, school_id=data.school_id, notes=data.notes)
    db.add(e)
    await db.commit()
    await db.refresh(e)
    return EnrollmentResponse(
        id=str(e.id), user_id=e.user_id, school_id=e.school_id, status=e.status, notes=e.notes, created_at=e.created_at
    )


@router.get("/", response_model=EnrollmentListResponse)
async def list_enrollments(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    status: str | None = Query(None),
    current_user: User | None = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    # Admins/managers see all; ordinary users see their own
    query = select(Enrollment)
    count_q = select(func.count(Enrollment.id))

    if current_user is None:
        raise HTTPException(status_code=401, detail="Kimlik doğrulama gerekli")

    if current_user.role not in [UserRole.SUPER_ADMIN.value, UserRole.ADMIN.value, UserRole.MANAGER.value]:
        query = query.where(Enrollment.user_id == current_user.id)
        count_q = count_q.where(Enrollment.user_id == current_user.id)

    if status:
        query = query.where(Enrollment.status == status)
        count_q = count_q.where(Enrollment.status == status)

    total = (await db.execute(count_q)).scalar()
    res = (await db.execute(query.order_by(Enrollment.created_at.desc()).offset(skip).limit(limit))).scalars().all()

    # Enrich with user and school names
    items = []
    for r in res:
        user_obj = (await db.execute(select(User).where(User.id == r.user_id))).scalar_one_or_none()
        school_obj = (await db.execute(select(School).where(School.id == r.school_id))).scalar_one_or_none()
        items.append(EnrollmentResponse(
            id=str(r.id),
            user_id=r.user_id,
            school_id=r.school_id,
            status=r.status,
            notes=r.notes,
            created_at=r.created_at,
            user_name=user_obj.full_name if user_obj else None,
            user_email=user_obj.email if user_obj else None,
            school_name=school_obj.name if school_obj else None,
        ))

    return EnrollmentListResponse(items=items, total=total)


@router.post("/{enrollment_id}/approve")
async def approve_enrollment(enrollment_id: str, current_user: User = Depends(require_manager_or_above), db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Enrollment).where(Enrollment.id == enrollment_id))
    e = res.scalar_one_or_none()
    if not e:
        raise HTTPException(status_code=404, detail="Talep bulunamadı")
    e.status = EnrollmentStatus.APPROVED.value
    e.handled_by = current_user.id
    await db.commit()

    # Promote MEMBER to USER (student) role
    enrolled_user = (await db.execute(select(User).where(User.id == e.user_id))).scalar_one_or_none()
    if enrolled_user and enrolled_user.role == UserRole.MEMBER.value:
        enrolled_user.role = UserRole.USER.value
        await db.commit()

    # Create Student record if not exists
    student_exists = (await db.execute(select(Student).where(Student.user_id == e.user_id))).scalar_one_or_none()
    if not student_exists:
        s = Student(user_id=e.user_id, school_id=e.school_id)
        db.add(s)
        await db.flush()  # flush to get student id

        # Create StudentProgress records for both branches (BUG FIX)
        for branch in Branch:
            existing_progress = await db.execute(
                select(StudentProgress).where(
                    StudentProgress.student_id == s.id,
                    StudentProgress.branch == branch.value,
                )
            )
            if not existing_progress.scalar_one_or_none():
                initial_hours = get_hours_for_grade(1)
                progress = StudentProgress(
                    student_id=s.id,
                    branch=branch.value,
                    current_grade=1,
                    completed_hours=0,
                    remaining_hours=initial_hours["required"],
                )
                db.add(progress)

        await db.commit()
    return {"message": "Onaylandi"}


@router.post("/{enrollment_id}/reject")
async def reject_enrollment(enrollment_id: str, current_user: User = Depends(require_manager_or_above), db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Enrollment).where(Enrollment.id == enrollment_id))
    e = res.scalar_one_or_none()
    if not e:
        raise HTTPException(status_code=404, detail="Talep bulunamadı")
    e.status = EnrollmentStatus.REJECTED.value
    e.handled_by = current_user.id
    await db.commit()
    return {"message": "Reddedildi"}
