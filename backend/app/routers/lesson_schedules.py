from datetime import datetime, timedelta, date
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.auth import get_current_user, require_manager_or_above
from app.models.user import User, UserRole
from app.models.school import SchoolManager
from app.models.lesson_schedule import LessonSchedule
from app.models.lesson import Lesson, LessonType, LESSON_DURATION
from app.schemas.lesson_schedule import (
    LessonScheduleCreate,
    LessonScheduleResponse,
    LessonScheduleListResponse,
)

router = APIRouter()


DAY_NAMES_TR = {
    0: "Pazartesi",
    1: "Sali",
    2: "Carsamba",
    3: "Persembe",
    4: "Cuma",
    5: "Cumartesi",
    6: "Pazar",
}


def _generate_lesson_dates(day_of_week: int, start_dt: date, end_dt: date) -> list[date]:
    """Generate all dates matching the given day_of_week between start and end."""
    dates = []
    current = start_dt
    # Find the first occurrence of the target day
    while current.weekday() != day_of_week:
        current += timedelta(days=1)
    # Iterate weekly
    while current <= end_dt:
        dates.append(current)
        current += timedelta(days=7)
    return dates


def _schedule_to_response(schedule: LessonSchedule) -> LessonScheduleResponse:
    return LessonScheduleResponse(
        id=str(schedule.id),
        school_id=str(schedule.school_id),
        branch=schedule.branch,
        lesson_type=schedule.lesson_type,
        day_of_week=schedule.day_of_week,
        start_time=schedule.start_time,
        duration_hours=float(schedule.duration_hours),
        start_date=schedule.start_date,
        end_date=schedule.end_date,
        is_active=schedule.is_active,
        notes=schedule.notes,
        created_by=str(schedule.created_by),
        created_at=schedule.created_at,
        school_name=schedule.school.name if schedule.school else None,
        generated_lesson_count=len(schedule.lessons) if schedule.lessons else 0,
    )


@router.get("/", response_model=LessonScheduleListResponse)
async def list_schedules(
    school_id: str | None = None,
    is_active: bool | None = True,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(LessonSchedule).options(
        selectinload(LessonSchedule.school),
        selectinload(LessonSchedule.lessons),
    )
    count_q = select(func.count(LessonSchedule.id))

    # MANAGER only sees own schools
    if current_user.role == UserRole.MANAGER.value:
        school_ids_q = select(SchoolManager.school_id).where(
            SchoolManager.user_id == current_user.id
        )
        query = query.where(LessonSchedule.school_id.in_(school_ids_q))
        count_q = count_q.where(LessonSchedule.school_id.in_(school_ids_q))

    if school_id:
        query = query.where(LessonSchedule.school_id == school_id)
        count_q = count_q.where(LessonSchedule.school_id == school_id)
    if is_active is not None:
        query = query.where(LessonSchedule.is_active == is_active)
        count_q = count_q.where(LessonSchedule.is_active == is_active)

    total = (await db.execute(count_q)).scalar()
    result = await db.execute(
        query.order_by(LessonSchedule.created_at.desc()).offset(skip).limit(limit)
    )
    schedules = result.scalars().unique().all()

    return LessonScheduleListResponse(
        items=[_schedule_to_response(s) for s in schedules],
        total=total,
    )


@router.post("/")
async def create_schedule(
    data: LessonScheduleCreate,
    current_user: User = Depends(require_manager_or_above),
    db: AsyncSession = Depends(get_db),
):
    # Validate day_of_week
    if data.day_of_week < 0 or data.day_of_week > 6:
        raise HTTPException(status_code=400, detail="day_of_week 0-6 arasi olmali")

    # Validate lesson_type
    try:
        lt = LessonType(data.lesson_type)
    except ValueError:
        raise HTTPException(status_code=400, detail="Gecersiz ders turu")

    # MANAGER check
    if current_user.role == UserRole.MANAGER.value:
        manager_schools = await db.execute(
            select(SchoolManager.school_id).where(SchoolManager.user_id == current_user.id)
        )
        school_ids = [row[0] for row in manager_schools.all()]
        if data.school_id not in school_ids:
            raise HTTPException(status_code=403, detail="Bu okul icin program olusturamazsiniz")

    # Parse dates
    try:
        start_dt = datetime.strptime(data.start_date, "%Y-%m-%d").date()
        end_dt = datetime.strptime(data.end_date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Tarih formati YYYY-MM-DD olmali")

    if end_dt <= start_dt:
        raise HTTPException(status_code=400, detail="Bitis tarihi baslangictan sonra olmali")

    # Validate start_time format
    try:
        hour, minute = data.start_time.split(":")
        int(hour)
        int(minute)
    except (ValueError, AttributeError):
        raise HTTPException(status_code=400, detail="Saat formati HH:MM olmali")

    duration = LESSON_DURATION[lt]

    # Create schedule
    schedule = LessonSchedule(
        school_id=data.school_id,
        branch=data.branch,
        lesson_type=data.lesson_type,
        day_of_week=data.day_of_week,
        start_time=data.start_time,
        duration_hours=duration,
        start_date=datetime.combine(start_dt, datetime.min.time()),
        end_date=datetime.combine(end_dt, datetime.min.time()),
        is_active=True,
        notes=data.notes,
        created_by=current_user.id,
    )
    db.add(schedule)
    await db.flush()  # get schedule.id

    # Generate lesson instances
    lesson_dates = _generate_lesson_dates(data.day_of_week, start_dt, end_dt)
    hour, minute = data.start_time.split(":")

    generated = 0
    for d in lesson_dates:
        lesson_datetime = datetime(d.year, d.month, d.day, int(hour), int(minute))
        lesson = Lesson(
            school_id=data.school_id,
            branch=data.branch,
            lesson_type=data.lesson_type,
            lesson_date=lesson_datetime,
            duration_hours=duration,
            created_by=current_user.id,
            notes=data.notes,
            schedule_id=schedule.id,
        )
        db.add(lesson)
        generated += 1

    await db.commit()

    # Reload with relationships
    result = await db.execute(
        select(LessonSchedule)
        .options(selectinload(LessonSchedule.school), selectinload(LessonSchedule.lessons))
        .where(LessonSchedule.id == schedule.id)
    )
    schedule = result.scalar_one()

    day_name = DAY_NAMES_TR.get(data.day_of_week, "?")

    return {
        "schedule": _schedule_to_response(schedule).model_dump(),
        "generated_count": generated,
        "message": f"Her {day_name} {data.start_time} icin {generated} ders olusturuldu",
    }


@router.get("/{schedule_id}", response_model=LessonScheduleResponse)
async def get_schedule(
    schedule_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(LessonSchedule)
        .options(selectinload(LessonSchedule.school), selectinload(LessonSchedule.lessons))
        .where(LessonSchedule.id == schedule_id)
    )
    schedule = result.scalar_one_or_none()
    if not schedule:
        raise HTTPException(status_code=404, detail="Program bulunamadi")

    return _schedule_to_response(schedule)


@router.delete("/{schedule_id}")
async def delete_schedule(
    schedule_id: str,
    current_user: User = Depends(require_manager_or_above),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(LessonSchedule)
        .options(selectinload(LessonSchedule.lessons))
        .where(LessonSchedule.id == schedule_id)
    )
    schedule = result.scalar_one_or_none()
    if not schedule:
        raise HTTPException(status_code=404, detail="Program bulunamadi")

    # Deactivate schedule
    schedule.is_active = False

    # Delete future lessons with no attendance
    now = datetime.utcnow()
    deleted_count = 0
    for lesson in (schedule.lessons or []):
        if lesson.lesson_date > now:
            # Check if lesson has attendance
            att_count = len(lesson.attendances) if lesson.attendances else 0
            if att_count == 0:
                await db.delete(lesson)
                deleted_count += 1

    await db.commit()
    return {
        "message": f"Program deaktif edildi. {deleted_count} gelecek ders silindi.",
    }


@router.post("/{schedule_id}/generate")
async def extend_schedule(
    schedule_id: str,
    new_end_date: str | None = None,
    current_user: User = Depends(require_manager_or_above),
    db: AsyncSession = Depends(get_db),
):
    """Mevcut programa yeni dersler ekle (tarih uzatma)."""
    result = await db.execute(
        select(LessonSchedule)
        .options(selectinload(LessonSchedule.school), selectinload(LessonSchedule.lessons))
        .where(LessonSchedule.id == schedule_id)
    )
    schedule = result.scalar_one_or_none()
    if not schedule:
        raise HTTPException(status_code=404, detail="Program bulunamadi")

    if not schedule.is_active:
        raise HTTPException(status_code=400, detail="Program aktif degil")

    # Update end_date if provided
    if new_end_date:
        try:
            new_end_dt = datetime.strptime(new_end_date, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(status_code=400, detail="Tarih formati YYYY-MM-DD olmali")
        schedule.end_date = datetime.combine(new_end_dt, datetime.min.time())

    start_dt = schedule.start_date.date() if isinstance(schedule.start_date, datetime) else schedule.start_date
    end_dt = schedule.end_date.date() if isinstance(schedule.end_date, datetime) else schedule.end_date

    # Find existing lesson dates for this schedule
    existing_dates = set()
    for lesson in (schedule.lessons or []):
        if isinstance(lesson.lesson_date, datetime):
            existing_dates.add(lesson.lesson_date.date())

    # Generate missing dates
    all_dates = _generate_lesson_dates(schedule.day_of_week, start_dt, end_dt)
    hour, minute = schedule.start_time.split(":")
    generated = 0

    for d in all_dates:
        if d not in existing_dates:
            lesson_datetime = datetime(d.year, d.month, d.day, int(hour), int(minute))
            lesson = Lesson(
                school_id=schedule.school_id,
                branch=schedule.branch,
                lesson_type=schedule.lesson_type,
                lesson_date=lesson_datetime,
                duration_hours=float(schedule.duration_hours),
                created_by=current_user.id,
                notes=schedule.notes,
                schedule_id=schedule.id,
            )
            db.add(lesson)
            generated += 1

    await db.commit()

    return {
        "message": f"{generated} yeni ders olusturuldu",
        "generated_count": generated,
    }
