import pytest
from sqlalchemy import select

from app.models.user import UserRole
from app.models.student import Branch, StudentProgress
from tests.conftest import (
    auth_headers,
    make_user,
    make_school,
    make_school_manager,
    make_student,
    make_lesson,
)


async def test_create_attendance_updates_progress_hours(client, db_session):
    admin = await make_user(db_session, role=UserRole.ADMIN.value)
    school = await make_school(db_session)
    student = await make_student(
        db_session, school, grades={Branch.WING_TSUN.value: (1, 10)}
    )
    lesson = await make_lesson(db_session, school, admin, branch=Branch.WING_TSUN.value, duration_hours=2.0)

    resp = await client.post(
        "/api/attendance/",
        json={"lesson_id": lesson.id, "student_ids": [student.id]},
        headers=auth_headers(admin),
    )
    assert resp.status_code == 200
    assert resp.json()["total"] == 1

    progress = (
        await db_session.execute(
            select(StudentProgress).where(
                StudentProgress.student_id == student.id,
                StudentProgress.branch == Branch.WING_TSUN.value,
            )
        )
    ).scalar_one()
    assert float(progress.completed_hours) == 12.0


async def test_duplicate_attendance_is_skipped(client, db_session):
    admin = await make_user(db_session, role=UserRole.ADMIN.value)
    school = await make_school(db_session)
    student = await make_student(db_session, school, grades={Branch.WING_TSUN.value: (1, 0)})
    lesson = await make_lesson(db_session, school, admin, branch=Branch.WING_TSUN.value)

    payload = {"lesson_id": lesson.id, "student_ids": [student.id]}
    first = await client.post("/api/attendance/", json=payload, headers=auth_headers(admin))
    second = await client.post("/api/attendance/", json=payload, headers=auth_headers(admin))

    assert first.json()["total"] == 1
    assert second.json()["total"] == 0

    progress = (
        await db_session.execute(
            select(StudentProgress).where(StudentProgress.student_id == student.id)
        )
    ).scalar_one()
    assert float(progress.completed_hours) == 2.0


async def test_manager_cannot_create_attendance_for_other_school(client, db_session):
    manager = await make_user(db_session, role=UserRole.MANAGER.value)
    own_school = await make_school(db_session, name="Own School")
    other_school = await make_school(db_session, name="Other School")
    await make_school_manager(db_session, own_school, manager)

    student = await make_student(db_session, other_school)
    lesson = await make_lesson(db_session, other_school, manager)

    resp = await client.post(
        "/api/attendance/",
        json={"lesson_id": lesson.id, "student_ids": [student.id]},
        headers=auth_headers(manager),
    )
    assert resp.status_code == 403


async def test_student_from_different_school_is_skipped(client, db_session):
    admin = await make_user(db_session, role=UserRole.ADMIN.value)
    lesson_school = await make_school(db_session, name="Lesson School")
    other_school = await make_school(db_session, name="Other School")

    student = await make_student(db_session, other_school)
    lesson = await make_lesson(db_session, lesson_school, admin)

    resp = await client.post(
        "/api/attendance/",
        json={"lesson_id": lesson.id, "student_ids": [student.id]},
        headers=auth_headers(admin),
    )
    assert resp.status_code == 200
    assert resp.json()["total"] == 0


async def test_delete_attendance_reverts_hours(client, db_session):
    admin = await make_user(db_session, role=UserRole.ADMIN.value)
    school = await make_school(db_session)
    student = await make_student(db_session, school, grades={Branch.WING_TSUN.value: (1, 10)})
    lesson = await make_lesson(db_session, school, admin, branch=Branch.WING_TSUN.value, duration_hours=2.0)

    create_resp = await client.post(
        "/api/attendance/",
        json={"lesson_id": lesson.id, "student_ids": [student.id]},
        headers=auth_headers(admin),
    )
    attendance_id = create_resp.json()["items"][0]["id"]

    progress_after_create = (
        await db_session.execute(
            select(StudentProgress).where(StudentProgress.student_id == student.id)
        )
    ).scalar_one()
    assert float(progress_after_create.completed_hours) == 12.0

    del_resp = await client.delete(f"/api/attendance/{attendance_id}", headers=auth_headers(admin))
    assert del_resp.status_code == 200

    await db_session.refresh(progress_after_create)
    assert float(progress_after_create.completed_hours) == 10.0


async def test_delete_nonexistent_attendance_returns_404(client, db_session):
    admin = await make_user(db_session, role=UserRole.ADMIN.value)
    resp = await client.delete("/api/attendance/does-not-exist", headers=auth_headers(admin))
    assert resp.status_code == 404
