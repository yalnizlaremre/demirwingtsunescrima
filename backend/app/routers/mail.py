import json
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.auth import get_current_user, require_manager_or_above
from app.models.user import User, UserRole
from app.models.student import Student, StudentProgress, Branch
from app.models.school import SchoolManager
from app.models.email_log import EmailLog
from app.models.audit_log import AuditAction
from app.services.audit import create_audit_log
from app.schemas.mail import SendMailRequest, EmailLogResponse, EmailLogListResponse

router = APIRouter()


@router.post("/send")
async def send_mail(
    data: SendMailRequest,
    current_user: User = Depends(require_manager_or_above),
    db: AsyncSession = Depends(get_db),
):
    # Build student query based on filters
    query = select(Student).options(
        selectinload(Student.user),
        selectinload(Student.progress),
    ).join(Student.user).where(User.status == "ACTIVE")

    # MANAGER: restrict to own school
    if current_user.role == UserRole.MANAGER.value:
        school_ids_q = select(SchoolManager.school_id).where(
            SchoolManager.user_id == current_user.id
        )
        query = query.where(Student.school_id.in_(school_ids_q))
    elif data.school_ids:
        query = query.where(Student.school_id.in_(data.school_ids))

    result = await db.execute(query)
    students = result.scalars().unique().all()

    # Filter by branch and grade if specified
    filtered_emails = []
    for student in students:
        if data.branch:
            progress = next(
                (p for p in student.progress if p.branch == data.branch), None
            )
            if not progress:
                continue
            if data.grade_min is not None and progress.current_grade < data.grade_min:
                continue
            if data.grade_max is not None and progress.current_grade > data.grade_max:
                continue

        if student.user and student.user.email:
            filtered_emails.append(student.user.email)

    filters_applied = json.dumps({
        "school_ids": data.school_ids,
        "branch": data.branch,
        "grade_min": data.grade_min,
        "grade_max": data.grade_max,
    }, ensure_ascii=False)

    # Log the email
    email_log = EmailLog(
        sent_by=current_user.id,
        subject=data.subject,
        body=data.body,
        recipient_count=len(filtered_emails),
        filters_applied=filters_applied,
    )
    db.add(email_log)

    await create_audit_log(
        db,
        action=AuditAction.EMAIL_SENT,
        entity_type="EmailLog",
        entity_id=current_user.id,
        performed_by=current_user.id,
        details=f"Mail gönderildi: {data.subject} -> {len(filtered_emails)} alıcı",
    )

    await db.commit()

    # Note: Actual email sending would be integrated here
    # For now, we just log it
    return {
        "message": f"Mail {len(filtered_emails)} kişiye gönderilmek üzere kaydedildi",
        "recipient_count": len(filtered_emails),
        "recipients": filtered_emails,
    }


@router.get("/logs", response_model=EmailLogListResponse)
async def list_email_logs(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(require_manager_or_above),
    db: AsyncSession = Depends(get_db),
):
    query = select(EmailLog).options(selectinload(EmailLog.sender))
    count_query = select(func.count(EmailLog.id))

    if current_user.role == UserRole.MANAGER.value:
        query = query.where(EmailLog.sent_by == current_user.id)
        count_query = count_query.where(EmailLog.sent_by == current_user.id)

    total_result = await db.execute(count_query)
    total = total_result.scalar()

    result = await db.execute(
        query.order_by(EmailLog.created_at.desc()).offset(skip).limit(limit)
    )
    logs = result.scalars().all()

    return EmailLogListResponse(
        items=[
            EmailLogResponse(
                id=str(l.id),
                sent_by=str(l.sent_by),
                subject=l.subject,
                body=l.body,
                recipient_count=l.recipient_count,
                filters_applied=l.filters_applied,
                created_at=l.created_at,
                sender_name=l.sender.full_name if l.sender else None,
            )
            for l in logs
        ],
        total=total,
    )
