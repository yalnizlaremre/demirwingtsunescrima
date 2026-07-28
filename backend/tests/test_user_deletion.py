import pytest
from datetime import datetime, timezone

from sqlalchemy import select

from app.models.user import UserRole
from app.models.event import Event
from app.models.media import Media
from app.models.email_log import EmailLog
from app.models.grade_change_request import GradeChangeRequest, GradeChangeStatus
from app.models.student import Student, StudentProgress

from tests.conftest import make_user, make_school, make_student, make_lesson, auth_headers

pytestmark = pytest.mark.asyncio


async def _make_event(db_session, creator):
    event = Event(
        name="Test Seminer",
        event_type="SEMINAR",
        start_datetime=datetime.now(timezone.utc),
        location="Test Location",
        scope="ALL_SCHOOLS",
        created_by=creator.id,
    )
    db_session.add(event)
    await db_session.commit()
    await db_session.refresh(event)
    return event


async def _make_media(db_session, uploader):
    media = Media(
        media_type="IMAGE",
        filename="a.jpg",
        original_filename="a.jpg",
        file_url="/uploads/a.jpg",
        file_size=100,
        mime_type="image/jpeg",
        uploaded_by=uploader.id,
    )
    db_session.add(media)
    await db_session.commit()
    await db_session.refresh(media)
    return media


async def _make_email_log(db_session, sender):
    log = EmailLog(sent_by=sender.id, subject="X", body="Y", recipient_count=0)
    db_session.add(log)
    await db_session.commit()
    await db_session.refresh(log)
    return log


async def _make_grade_change_request(db_session, student, requester):
    req = GradeChangeRequest(
        student_id=student.id,
        branch="WING_TSUN",
        current_grade=1,
        requested_grade=2,
        note="test",
        status=GradeChangeStatus.PENDING.value,
        requested_by=requester.id,
    )
    db_session.add(req)
    await db_session.commit()
    await db_session.refresh(req)
    return req


class TestDeleteUserKeepsRelatedRecords:
    async def test_delete_user_who_created_lesson_keeps_lesson_with_null_creator(self, client, db_session):
        admin = await make_user(db_session, role=UserRole.ADMIN.value)
        manager = await make_user(db_session, role=UserRole.MANAGER.value)
        school = await make_school(db_session)
        lesson = await make_lesson(db_session, school, manager)

        resp = await client.delete(f"/api/users/{manager.id}", headers=auth_headers(admin))
        assert resp.status_code == 200

        await db_session.refresh(lesson)
        assert lesson.created_by is None

    async def test_delete_user_who_created_event_keeps_event_with_null_creator(self, client, db_session):
        admin = await make_user(db_session, role=UserRole.ADMIN.value)
        manager = await make_user(db_session, role=UserRole.MANAGER.value)
        event = await _make_event(db_session, manager)

        resp = await client.delete(f"/api/users/{manager.id}", headers=auth_headers(admin))
        assert resp.status_code == 200

        await db_session.refresh(event)
        assert event.created_by is None

    async def test_delete_user_who_uploaded_media_keeps_media_with_null_uploader(self, client, db_session):
        admin = await make_user(db_session, role=UserRole.ADMIN.value)
        manager = await make_user(db_session, role=UserRole.MANAGER.value)
        media = await _make_media(db_session, manager)

        resp = await client.delete(f"/api/users/{manager.id}", headers=auth_headers(admin))
        assert resp.status_code == 200

        await db_session.refresh(media)
        assert media.uploaded_by is None

    async def test_delete_user_who_sent_email_log_keeps_log_with_null_sender(self, client, db_session):
        admin = await make_user(db_session, role=UserRole.ADMIN.value)
        manager = await make_user(db_session, role=UserRole.MANAGER.value)
        log = await _make_email_log(db_session, manager)

        resp = await client.delete(f"/api/users/{manager.id}", headers=auth_headers(admin))
        assert resp.status_code == 200

        await db_session.refresh(log)
        assert log.sent_by is None

    async def test_delete_user_who_requested_grade_change_keeps_request_with_null_requester(self, client, db_session):
        admin = await make_user(db_session, role=UserRole.ADMIN.value)
        manager = await make_user(db_session, role=UserRole.MANAGER.value)
        school = await make_school(db_session)
        student = await make_student(db_session, school)
        req = await _make_grade_change_request(db_session, student, manager)

        resp = await client.delete(f"/api/users/{manager.id}", headers=auth_headers(admin))
        assert resp.status_code == 200

        await db_session.refresh(req)
        assert req.requested_by is None


class TestSelfDeleteGuard:
    async def test_admin_cannot_delete_self(self, client, db_session):
        admin = await make_user(db_session, role=UserRole.ADMIN.value)
        resp = await client.delete(f"/api/users/{admin.id}", headers=auth_headers(admin))
        assert resp.status_code == 400


class TestDeleteStudent:
    async def test_delete_student_removes_user_and_cascades(self, client, db_session):
        admin = await make_user(db_session, role=UserRole.ADMIN.value)
        school = await make_school(db_session)
        student = await make_student(db_session, school, grades={"WING_TSUN": (1, 10)})
        user_id = student.user_id
        student_id = student.id

        resp = await client.delete(f"/api/students/{student_id}", headers=auth_headers(admin))
        assert resp.status_code == 200

        from app.models.user import User
        user_result = await db_session.execute(select(User).where(User.id == user_id))
        assert user_result.scalar_one_or_none() is None

        student_result = await db_session.execute(select(Student).where(Student.id == student_id))
        assert student_result.scalar_one_or_none() is None

        progress_result = await db_session.execute(
            select(StudentProgress).where(StudentProgress.student_id == student_id)
        )
        assert progress_result.scalar_one_or_none() is None

    async def test_delete_nonexistent_student_returns_404(self, client, db_session):
        admin = await make_user(db_session, role=UserRole.ADMIN.value)
        resp = await client.delete("/api/students/does-not-exist", headers=auth_headers(admin))
        assert resp.status_code == 404

    async def test_manager_without_permission_cannot_delete_student(self, client, db_session):
        manager = await make_user(db_session, role=UserRole.MANAGER.value)
        school = await make_school(db_session)
        student = await make_student(db_session, school)
        resp = await client.delete(f"/api/students/{student.id}", headers=auth_headers(manager))
        assert resp.status_code == 403
