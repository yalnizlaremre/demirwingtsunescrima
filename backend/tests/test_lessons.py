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


class TestCreateLesson:
    async def test_admin_can_create_lesson(self, client, db_session):
        admin = await make_user(db_session, role=UserRole.ADMIN.value)
        school = await make_school(db_session)

        resp = await client.post(
            "/api/lessons/",
            json={
                "school_id": school.id,
                "branch": Branch.WING_TSUN.value,
                "lesson_type": "GROUP",
                "lesson_date": "2026-10-01T18:00:00Z",
            },
            headers=auth_headers(admin),
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["branch"] == Branch.WING_TSUN.value
        assert body["duration_hours"] == 2.0

    async def test_manager_cannot_create_lesson_for_other_school(self, client, db_session):
        manager = await make_user(db_session, role=UserRole.MANAGER.value)
        own_school = await make_school(db_session, name="Own School")
        other_school = await make_school(db_session, name="Other School")
        await make_school_manager(db_session, own_school, manager)

        resp = await client.post(
            "/api/lessons/",
            json={
                "school_id": other_school.id,
                "branch": Branch.WING_TSUN.value,
                "lesson_type": "GROUP",
                "lesson_date": "2026-10-01T18:00:00Z",
            },
            headers=auth_headers(manager),
        )
        assert resp.status_code == 403


class TestUpdateLesson:
    async def test_admin_can_update_notes_and_date(self, client, db_session):
        admin = await make_user(db_session, role=UserRole.ADMIN.value)
        school = await make_school(db_session)
        lesson = await make_lesson(db_session, school, admin)

        resp = await client.put(
            f"/api/lessons/{lesson.id}",
            json={"notes": "Guncellenmis not", "lesson_date": "2026-11-01T15:00:00Z"},
            headers=auth_headers(admin),
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["notes"] == "Guncellenmis not"
        assert body["lesson_date"].startswith("2026-11-01T15:00:00")

    async def test_branch_change_allowed_without_attendance(self, client, db_session):
        admin = await make_user(db_session, role=UserRole.ADMIN.value)
        school = await make_school(db_session)
        lesson = await make_lesson(db_session, school, admin, branch=Branch.WING_TSUN.value)

        resp = await client.put(
            f"/api/lessons/{lesson.id}",
            json={"branch": Branch.ESCRIMA.value},
            headers=auth_headers(admin),
        )
        assert resp.status_code == 200
        assert resp.json()["branch"] == Branch.ESCRIMA.value

    async def test_branch_change_blocked_once_attendance_taken(self, client, db_session):
        admin = await make_user(db_session, role=UserRole.ADMIN.value)
        school = await make_school(db_session)
        student = await make_student(db_session, school, grades={Branch.WING_TSUN.value: (1, 0)})
        lesson = await make_lesson(db_session, school, admin, branch=Branch.WING_TSUN.value)
        await client.post(
            "/api/attendance/",
            json={"lesson_id": lesson.id, "student_ids": [student.id]},
            headers=auth_headers(admin),
        )

        resp = await client.put(
            f"/api/lessons/{lesson.id}",
            json={"branch": Branch.ESCRIMA.value},
            headers=auth_headers(admin),
        )
        assert resp.status_code == 400

        # Notes/date hala serbestce degistirilebilmeli
        resp2 = await client.put(
            f"/api/lessons/{lesson.id}",
            json={"notes": "Not degisti"},
            headers=auth_headers(admin),
        )
        assert resp2.status_code == 200

        # Ayni branch/lesson_type degerini tekrar gondermek (frontend'in her zaman
        # yaptigi gibi) gercek bir degisiklik olmadigi icin engellenmemeli
        resp3 = await client.put(
            f"/api/lessons/{lesson.id}",
            json={"branch": Branch.WING_TSUN.value, "lesson_type": "GROUP"},
            headers=auth_headers(admin),
        )
        assert resp3.status_code == 200

    async def test_manager_cannot_update_lesson_in_other_school(self, client, db_session):
        manager = await make_user(db_session, role=UserRole.MANAGER.value)
        own_school = await make_school(db_session, name="Own School")
        other_school = await make_school(db_session, name="Other School")
        await make_school_manager(db_session, own_school, manager)
        lesson = await make_lesson(db_session, other_school, manager)

        resp = await client.put(
            f"/api/lessons/{lesson.id}", json={"notes": "x"}, headers=auth_headers(manager)
        )
        assert resp.status_code == 403

    async def test_update_nonexistent_lesson_returns_404(self, client, db_session):
        admin = await make_user(db_session, role=UserRole.ADMIN.value)
        resp = await client.put(
            "/api/lessons/does-not-exist", json={"notes": "x"}, headers=auth_headers(admin)
        )
        assert resp.status_code == 404


class TestDeleteLesson:
    async def test_delete_lesson_reverts_attendance_hours(self, client, db_session):
        admin = await make_user(db_session, role=UserRole.ADMIN.value)
        school = await make_school(db_session)
        student = await make_student(db_session, school, grades={Branch.WING_TSUN.value: (1, 10)})
        lesson = await make_lesson(db_session, school, admin, branch=Branch.WING_TSUN.value, duration_hours=2.0)
        await client.post(
            "/api/attendance/",
            json={"lesson_id": lesson.id, "student_ids": [student.id]},
            headers=auth_headers(admin),
        )

        progress = (
            await db_session.execute(
                select(StudentProgress).where(StudentProgress.student_id == student.id)
            )
        ).scalar_one()
        assert float(progress.completed_hours) == 12.0

        resp = await client.delete(f"/api/lessons/{lesson.id}", headers=auth_headers(admin))
        assert resp.status_code == 200

        await db_session.refresh(progress)
        assert float(progress.completed_hours) == 10.0

    async def test_manager_cannot_delete_lesson_in_other_school(self, client, db_session):
        manager = await make_user(db_session, role=UserRole.MANAGER.value)
        own_school = await make_school(db_session, name="Own School")
        other_school = await make_school(db_session, name="Other School")
        await make_school_manager(db_session, own_school, manager)
        lesson = await make_lesson(db_session, other_school, manager)

        resp = await client.delete(f"/api/lessons/{lesson.id}", headers=auth_headers(manager))
        assert resp.status_code == 403
