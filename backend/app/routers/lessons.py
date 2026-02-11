from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.auth import get_current_user, require_manager_or_above
from app.models.user import User, UserRole
from app.models.school import SchoolManager
from app.models.lesson import Lesson, LessonType, LESSON_DURATION
from app.models.student import Branch
from app.schemas.lesson import LessonCreate, LessonUpdate, LessonResponse, LessonListResponse

router = APIRouter()


@router.get("/", response_model=LessonListResponse)
async def list_lessons(
    school_id: str | None = None,
    branch: str | None = None,
    lesson_type: str | None = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Lesson).options(selectinload(Lesson.school), selectinload(Lesson.attendances))
    count_query = select(func.count(Lesson.id))

    if current_user.role == UserRole.MANAGER.value:
        school_ids_q = select(SchoolManager.school_id).where(
            SchoolManager.user_id == current_user.id
        )
        query = query.where(Lesson.school_id.in_(school_ids_q))
        count_query = count_query.where(Lesson.school_id.in_(school_ids_q))

    if school_id:
        query = query.where(Lesson.school_id == school_id)
        count_query = count_query.where(Lesson.school_id == school_id)
    if branch:
        query = query.where(Lesson.branch == branch)
        count_query = count_query.where(Lesson.branch == branch)
    if lesson_type:
        query = query.where(Lesson.lesson_type == lesson_type)
        count_query = count_query.where(Lesson.lesson_type == lesson_type)

    total_result = await db.execute(count_query)
    total = total_result.scalar()

    result = await db.execute(
        query.order_by(Lesson.lesson_date.desc()).offset(skip).limit(limit)
    )
    lessons = result.scalars().unique().all()

    return LessonListResponse(
        items=[
            LessonResponse(
                id=str(l.id),
                school_id=str(l.school_id),
                branch=l.branch,
                lesson_type=l.lesson_type,
                lesson_date=l.lesson_date,
                duration_hours=float(l.duration_hours),
                created_by=str(l.created_by),
                notes=l.notes,
                created_at=l.created_at,
                school_name=l.school.name if l.school else None,
                attendance_count=len(l.attendances) if l.attendances else 0,
            )
            for l in lessons
        ],
        total=total,
    )


@router.post("/", response_model=LessonResponse)
async def create_lesson(
    data: LessonCreate,
    current_user: User = Depends(require_manager_or_above),
    db: AsyncSession = Depends(get_db),
):
    # MANAGER check: only own school
    if current_user.role == UserRole.MANAGER.value:
        manager_schools = await db.execute(
            select(SchoolManager.school_id).where(SchoolManager.user_id == current_user.id)
        )
        school_ids = [row[0] for row in manager_schools.all()]
        if data.school_id not in school_ids:
            raise HTTPException(status_code=403, detail="Bu okul için ders oluşturamazsınız")

    lt = LessonType(data.lesson_type)
    duration = LESSON_DURATION[lt]

    lesson = Lesson(
        school_id=data.school_id,
        branch=data.branch,
        lesson_type=data.lesson_type,
        lesson_date=data.lesson_date,
        duration_hours=duration,
        created_by=current_user.id,
        notes=data.notes,
    )
    db.add(lesson)
    await db.commit()
    await db.refresh(lesson)

    return LessonResponse(
        id=str(lesson.id),
        school_id=str(lesson.school_id),
        branch=lesson.branch,
        lesson_type=lesson.lesson_type,
        lesson_date=lesson.lesson_date,
        duration_hours=float(lesson.duration_hours),
        created_by=str(lesson.created_by),
        notes=lesson.notes,
        created_at=lesson.created_at,
    )


@router.get("/{lesson_id}", response_model=LessonResponse)
async def get_lesson(
    lesson_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Lesson)
        .options(selectinload(Lesson.school), selectinload(Lesson.attendances))
        .where(Lesson.id == lesson_id)
    )
    lesson = result.scalar_one_or_none()
    if not lesson:
        raise HTTPException(status_code=404, detail="Ders bulunamadı")

    return LessonResponse(
        id=str(lesson.id),
        school_id=str(lesson.school_id),
        branch=lesson.branch,
        lesson_type=lesson.lesson_type,
        lesson_date=lesson.lesson_date,
        duration_hours=float(lesson.duration_hours),
        created_by=str(lesson.created_by),
        notes=lesson.notes,
        created_at=lesson.created_at,
        school_name=lesson.school.name if lesson.school else None,
        attendance_count=len(lesson.attendances) if lesson.attendances else 0,
    )


@router.delete("/{lesson_id}")
async def delete_lesson(
    lesson_id: str,
    current_user: User = Depends(require_manager_or_above),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Lesson).where(Lesson.id == lesson_id))
    lesson = result.scalar_one_or_none()
    if not lesson:
        raise HTTPException(status_code=404, detail="Ders bulunamadı")

    await db.delete(lesson)
    await db.commit()
    return {"message": "Ders silindi"}
