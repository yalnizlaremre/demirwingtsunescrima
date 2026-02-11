from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.auth import get_current_user, require_admin_or_above
from app.models.user import User, UserRole
from app.models.student import Student, StudentProgress, Branch
from app.models.event import (
    Event, EventType, EventScope, EventSchool,
    EventRegistration, SeminarEvaluation,
)
from app.models.audit_log import AuditAction
from app.services.audit import create_audit_log
from app.schemas.event import (
    EventCreate, EventUpdate, EventResponse, EventListResponse,
    EventRegistrationCreate, EventRegistrationResponse,
    SeminarEvaluateRequest,
)

router = APIRouter()


@router.get("/", response_model=EventListResponse)
async def list_events(
    event_type: str | None = None,
    is_completed: bool | None = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Event).options(
        selectinload(Event.selected_schools),
        selectinload(Event.registrations),
    )
    count_query = select(func.count(Event.id))

    if event_type:
        query = query.where(Event.event_type == event_type)
        count_query = count_query.where(Event.event_type == event_type)
    if is_completed is not None:
        query = query.where(Event.is_completed == is_completed)
        count_query = count_query.where(Event.is_completed == is_completed)

    total_result = await db.execute(count_query)
    total = total_result.scalar()

    result = await db.execute(
        query.order_by(Event.start_datetime.desc()).offset(skip).limit(limit)
    )
    events = result.scalars().unique().all()

    return EventListResponse(
        items=[
            EventResponse(
                id=str(e.id),
                name=e.name,
                description=e.description,
                event_type=e.event_type,
                start_datetime=e.start_datetime,
                end_datetime=e.end_datetime,
                location=e.location,
                capacity=e.capacity,
                scope=e.scope,
                wt_fee=float(e.wt_fee) if e.wt_fee else None,
                escrima_fee=float(e.escrima_fee) if e.escrima_fee else None,
                is_completed=e.is_completed,
                created_by=str(e.created_by),
                created_at=e.created_at,
                registration_count=len(e.registrations) if e.registrations else 0,
                selected_school_ids=[str(es.school_id) for es in (e.selected_schools or [])],
            )
            for e in events
        ],
        total=total,
    )


@router.post("/", response_model=EventResponse)
async def create_event(
    data: EventCreate,
    current_user: User = Depends(require_admin_or_above),
    db: AsyncSession = Depends(get_db),
):
    event = Event(
        name=data.name,
        description=data.description,
        event_type=data.event_type,
        start_datetime=data.start_datetime,
        end_datetime=data.end_datetime,
        location=data.location,
        capacity=data.capacity,
        scope=data.scope,
        wt_fee=data.wt_fee,
        escrima_fee=data.escrima_fee,
        created_by=current_user.id,
    )
    db.add(event)
    await db.flush()

    if data.scope == "SELECTED_SCHOOLS" and data.selected_school_ids:
        for sid in data.selected_school_ids:
            es = EventSchool(event_id=event.id, school_id=sid)
            db.add(es)

    await db.commit()
    await db.refresh(event)

    return EventResponse(
        id=str(event.id),
        name=event.name,
        description=event.description,
        event_type=event.event_type,
        start_datetime=event.start_datetime,
        end_datetime=event.end_datetime,
        location=event.location,
        capacity=event.capacity,
        scope=event.scope,
        wt_fee=float(event.wt_fee) if event.wt_fee else None,
        escrima_fee=float(event.escrima_fee) if event.escrima_fee else None,
        is_completed=event.is_completed,
        created_by=str(event.created_by),
        created_at=event.created_at,
        selected_school_ids=data.selected_school_ids,
    )


@router.get("/{event_id}", response_model=EventResponse)
async def get_event(
    event_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Event)
        .options(selectinload(Event.selected_schools), selectinload(Event.registrations))
        .where(Event.id == event_id)
    )
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Etkinlik bulunamadı")

    return EventResponse(
        id=str(event.id),
        name=event.name,
        description=event.description,
        event_type=event.event_type,
        start_datetime=event.start_datetime,
        end_datetime=event.end_datetime,
        location=event.location,
        capacity=event.capacity,
        scope=event.scope,
        wt_fee=float(event.wt_fee) if event.wt_fee else None,
        escrima_fee=float(event.escrima_fee) if event.escrima_fee else None,
        is_completed=event.is_completed,
        created_by=str(event.created_by),
        created_at=event.created_at,
        registration_count=len(event.registrations) if event.registrations else 0,
        selected_school_ids=[str(es.school_id) for es in (event.selected_schools or [])],
    )


@router.put("/{event_id}", response_model=EventResponse)
async def update_event(
    event_id: str,
    data: EventUpdate,
    current_user: User = Depends(require_admin_or_above),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Event).where(Event.id == event_id))
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Etkinlik bulunamadı")

    update_data = data.model_dump(exclude_unset=True)
    school_ids = update_data.pop("selected_school_ids", None)

    for field, value in update_data.items():
        setattr(event, field, value)

    if school_ids is not None:
        # Remove old
        old = await db.execute(
            select(EventSchool).where(EventSchool.event_id == event.id)
        )
        for es in old.scalars().all():
            await db.delete(es)
        # Add new
        for sid in school_ids:
            db.add(EventSchool(event_id=event.id, school_id=sid))

    await db.commit()
    await db.refresh(event)

    return EventResponse(
        id=str(event.id),
        name=event.name,
        description=event.description,
        event_type=event.event_type,
        start_datetime=event.start_datetime,
        end_datetime=event.end_datetime,
        location=event.location,
        capacity=event.capacity,
        scope=event.scope,
        wt_fee=float(event.wt_fee) if event.wt_fee else None,
        escrima_fee=float(event.escrima_fee) if event.escrima_fee else None,
        is_completed=event.is_completed,
        created_by=str(event.created_by),
        created_at=event.created_at,
    )


@router.delete("/{event_id}")
async def delete_event(
    event_id: str,
    current_user: User = Depends(require_admin_or_above),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Event).where(Event.id == event_id))
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Etkinlik bulunamadı")

    await db.delete(event)
    await db.commit()
    return {"message": "Etkinlik silindi"}


# --- Registration ---

@router.post("/{event_id}/register", response_model=EventRegistrationResponse)
async def register_for_event(
    event_id: str,
    data: EventRegistrationCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Get student profile
    student_result = await db.execute(
        select(Student).where(Student.user_id == current_user.id)
    )
    student = student_result.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=400, detail="Öğrenci profili bulunamadı")

    # Check event
    event_result = await db.execute(select(Event).where(Event.id == event_id))
    event = event_result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Etkinlik bulunamadı")
    if event.is_completed:
        raise HTTPException(status_code=400, detail="Bu etkinlik tamamlanmış")

    # Check duplicate
    existing = await db.execute(
        select(EventRegistration).where(
            EventRegistration.event_id == event.id,
            EventRegistration.student_id == student.id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Zaten kayıtlısınız")

    # Exam only for seminars
    will_take_exam = data.will_take_exam if event.event_type == EventType.SEMINAR.value else False

    reg = EventRegistration(
        event_id=event.id,
        student_id=student.id,
        register_wt=data.register_wt,
        register_escrima=data.register_escrima,
        will_take_exam=will_take_exam,
        exam_branch_wt=data.exam_branch_wt if will_take_exam else False,
        exam_branch_escrima=data.exam_branch_escrima if will_take_exam else False,
    )
    db.add(reg)
    await db.commit()
    await db.refresh(reg)

    return EventRegistrationResponse(
        id=str(reg.id),
        event_id=str(reg.event_id),
        student_id=str(reg.student_id),
        register_wt=reg.register_wt,
        register_escrima=reg.register_escrima,
        will_take_exam=reg.will_take_exam,
        exam_branch_wt=reg.exam_branch_wt,
        exam_branch_escrima=reg.exam_branch_escrima,
        created_at=reg.created_at,
    )


@router.get("/{event_id}/registrations", response_model=list[EventRegistrationResponse])
async def list_event_registrations(
    event_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(EventRegistration)
        .options(selectinload(EventRegistration.student).selectinload(Student.user))
        .where(EventRegistration.event_id == event_id)
    )
    registrations = result.scalars().all()

    return [
        EventRegistrationResponse(
            id=str(r.id),
            event_id=str(r.event_id),
            student_id=str(r.student_id),
            register_wt=r.register_wt,
            register_escrima=r.register_escrima,
            will_take_exam=r.will_take_exam,
            exam_branch_wt=r.exam_branch_wt,
            exam_branch_escrima=r.exam_branch_escrima,
            created_at=r.created_at,
            student_name=r.student.user.full_name if r.student and r.student.user else None,
        )
        for r in registrations
    ]


# --- Seminar Evaluation ---

@router.post("/{event_id}/evaluate")
async def evaluate_seminar(
    event_id: str,
    data: SeminarEvaluateRequest,
    current_user: User = Depends(require_admin_or_above),
    db: AsyncSession = Depends(get_db),
):
    # Get event
    event_result = await db.execute(select(Event).where(Event.id == event_id))
    event = event_result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Etkinlik bulunamadı")
    if event.event_type != EventType.SEMINAR.value:
        raise HTTPException(status_code=400, detail="Bu etkinlik seminer değil")
    if event.is_completed:
        raise HTTPException(status_code=400, detail="Bu seminer zaten değerlendirilmiş")

    now = datetime.now(timezone.utc)
    evaluated_count = 0

    for sid in data.passed_student_ids:
        # Get registration
        reg_result = await db.execute(
            select(EventRegistration).where(
                EventRegistration.event_id == event.id,
                EventRegistration.student_id == sid,
                EventRegistration.will_take_exam == True,
            )
        )
        reg = reg_result.scalar_one_or_none()
        if not reg:
            continue

        # Process each branch the student registered for exam
        for branch_flag, branch_enum in [
            (reg.exam_branch_wt, Branch.WING_TSUN),
            (reg.exam_branch_escrima, Branch.ESCRIMA),
        ]:
            if not branch_flag:
                continue

            progress_result = await db.execute(
                select(StudentProgress).where(
                    StudentProgress.student_id == sid,
                    StudentProgress.branch == branch_enum.value,
                )
            )
            progress = progress_result.scalar_one_or_none()
            if not progress:
                continue

            old_grade = progress.current_grade
            new_grade = old_grade + 1
            progress.current_grade = new_grade

            eval_record = SeminarEvaluation(
                event_id=event.id,
                student_id=sid,
                branch=branch_enum.value,
                passed=True,
                grade_before=old_grade,
                grade_after=new_grade,
                evaluated_by=current_user.id,
                evaluated_at=now,
            )
            db.add(eval_record)

            await create_audit_log(
                db,
                action=AuditAction.SEMINAR_EVALUATED,
                entity_type="StudentProgress",
                entity_id=progress.id,
                performed_by=current_user.id,
                details=f"Seminer sınavı geçti: {branch_enum.value} {old_grade} -> {new_grade}",
                old_value=str(old_grade),
                new_value=str(new_grade),
            )

            evaluated_count += 1

    event.is_completed = True

    await create_audit_log(
        db,
        action=AuditAction.EVENT_COMPLETED,
        entity_type="Event",
        entity_id=event.id,
        performed_by=current_user.id,
        details=f"Seminer değerlendirildi: {evaluated_count} derece artışı",
    )

    await db.commit()
    return {"message": f"Seminer değerlendirildi. {evaluated_count} derece artışı yapıldı."}
