import pytest
from sqlalchemy import select

from app.models.user import UserRole
from app.models.student import StudentProgress
from app.models.audit_log import AuditLog, AuditAction

from tests.conftest import make_user, make_school, make_school_manager, make_student, auth_headers

pytestmark = pytest.mark.asyncio


class TestGradeChangeRequestCreate:
    async def test_manager_outside_scope_forbidden(self, client, db_session):
        school_a = await make_school(db_session, name="Okul A")
        school_b = await make_school(db_session, name="Okul B")
        manager = await make_user(db_session, role=UserRole.MANAGER.value)
        await make_school_manager(db_session, school_a, manager)
        student = await make_student(db_session, school_b, grades={"WING_TSUN": (5, 10)})

        resp = await client.post(
            "/api/grades/change-requests",
            json={"student_id": student.id, "branch": "WING_TSUN", "requested_grade": 6, "note": "sinav gecti"},
            headers=auth_headers(manager),
        )
        assert resp.status_code == 403

    async def test_manager_in_scope_creates_pending_request(self, client, db_session):
        school = await make_school(db_session)
        manager = await make_user(db_session, role=UserRole.MANAGER.value)
        await make_school_manager(db_session, school, manager)
        student = await make_student(db_session, school, grades={"WING_TSUN": (5, 10)})

        resp = await client.post(
            "/api/grades/change-requests",
            json={"student_id": student.id, "branch": "WING_TSUN", "requested_grade": 6, "note": "sinav gecti"},
            headers=auth_headers(manager),
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "PENDING"
        assert data["current_grade"] == 5
        assert data["requested_grade"] == 6

    async def test_empty_note_rejected(self, client, db_session):
        school = await make_school(db_session)
        manager = await make_user(db_session, role=UserRole.MANAGER.value)
        await make_school_manager(db_session, school, manager)
        student = await make_student(db_session, school, grades={"WING_TSUN": (5, 10)})

        resp = await client.post(
            "/api/grades/change-requests",
            json={"student_id": student.id, "branch": "WING_TSUN", "requested_grade": 6, "note": "   "},
            headers=auth_headers(manager),
        )
        assert resp.status_code == 400

    async def test_user_forbidden(self, client, db_session):
        school = await make_school(db_session)
        student = await make_student(db_session, school, grades={"WING_TSUN": (5, 10)})
        user = await make_user(db_session, role=UserRole.USER.value)

        resp = await client.post(
            "/api/grades/change-requests",
            json={"student_id": student.id, "branch": "WING_TSUN", "requested_grade": 6, "note": "not"},
            headers=auth_headers(user),
        )
        assert resp.status_code == 403


class TestGradeChangeRequestList:
    async def test_manager_sees_only_own_school(self, client, db_session):
        school_a = await make_school(db_session, name="Okul A")
        school_b = await make_school(db_session, name="Okul B")
        manager_a = await make_user(db_session, role=UserRole.MANAGER.value)
        await make_school_manager(db_session, school_a, manager_a)
        admin = await make_user(db_session, role=UserRole.ADMIN.value)

        student_a = await make_student(db_session, school_a, grades={"WING_TSUN": (5, 10)})
        student_b = await make_student(db_session, school_b, grades={"WING_TSUN": (5, 10)})

        await client.post(
            "/api/grades/change-requests",
            json={"student_id": student_a.id, "branch": "WING_TSUN", "requested_grade": 6, "note": "a"},
            headers=auth_headers(manager_a),
        )
        await client.post(
            "/api/grades/change-requests",
            json={"student_id": student_b.id, "branch": "WING_TSUN", "requested_grade": 6, "note": "b"},
            headers=auth_headers(admin),
        )

        resp = await client.get("/api/grades/change-requests", headers=auth_headers(manager_a))
        assert resp.status_code == 200
        items = resp.json()["items"]
        assert len(items) == 1
        assert items[0]["student_id"] == student_a.id

        resp_admin = await client.get("/api/grades/change-requests", headers=auth_headers(admin))
        assert len(resp_admin.json()["items"]) == 2


class TestGradeChangeRequestApproveReject:
    async def test_manager_cannot_approve(self, client, db_session):
        school = await make_school(db_session)
        manager = await make_user(db_session, role=UserRole.MANAGER.value)
        await make_school_manager(db_session, school, manager)
        student = await make_student(db_session, school, grades={"WING_TSUN": (5, 10)})

        create_resp = await client.post(
            "/api/grades/change-requests",
            json={"student_id": student.id, "branch": "WING_TSUN", "requested_grade": 6, "note": "not"},
            headers=auth_headers(manager),
        )
        req_id = create_resp.json()["id"]

        resp = await client.post(f"/api/grades/change-requests/{req_id}/approve", headers=auth_headers(manager))
        assert resp.status_code == 403

    async def test_admin_approve_applies_grade_change(self, client, db_session):
        school = await make_school(db_session)
        manager = await make_user(db_session, role=UserRole.MANAGER.value)
        await make_school_manager(db_session, school, manager)
        admin = await make_user(db_session, role=UserRole.ADMIN.value)
        student = await make_student(db_session, school, grades={"WING_TSUN": (5, 10)})

        create_resp = await client.post(
            "/api/grades/change-requests",
            json={"student_id": student.id, "branch": "WING_TSUN", "requested_grade": 6, "note": "sinav gecti"},
            headers=auth_headers(manager),
        )
        req_id = create_resp.json()["id"]

        resp = await client.post(f"/api/grades/change-requests/{req_id}/approve", headers=auth_headers(admin))
        assert resp.status_code == 200
        assert resp.json()["status"] == "APPROVED"

        progress = (
            await db_session.execute(
                select(StudentProgress).where(
                    StudentProgress.student_id == student.id,
                    StudentProgress.branch == "WING_TSUN",
                )
            )
        ).scalar_one()
        assert progress.current_grade == 6

        audit = (
            await db_session.execute(
                select(AuditLog).where(AuditLog.action == AuditAction.GRADE_CHANGE_APPROVED.value)
            )
        ).scalar_one_or_none()
        assert audit is not None

    async def test_admin_reject_leaves_grade_unchanged(self, client, db_session):
        school = await make_school(db_session)
        manager = await make_user(db_session, role=UserRole.MANAGER.value)
        await make_school_manager(db_session, school, manager)
        admin = await make_user(db_session, role=UserRole.ADMIN.value)
        student = await make_student(db_session, school, grades={"WING_TSUN": (5, 10)})

        create_resp = await client.post(
            "/api/grades/change-requests",
            json={"student_id": student.id, "branch": "WING_TSUN", "requested_grade": 6, "note": "not"},
            headers=auth_headers(manager),
        )
        req_id = create_resp.json()["id"]

        resp = await client.post(f"/api/grades/change-requests/{req_id}/reject", headers=auth_headers(admin))
        assert resp.status_code == 200
        assert resp.json()["status"] == "REJECTED"

        progress = (
            await db_session.execute(
                select(StudentProgress).where(
                    StudentProgress.student_id == student.id,
                    StudentProgress.branch == "WING_TSUN",
                )
            )
        ).scalar_one()
        assert progress.current_grade == 5

    async def test_double_approve_rejected(self, client, db_session):
        school = await make_school(db_session)
        manager = await make_user(db_session, role=UserRole.MANAGER.value)
        await make_school_manager(db_session, school, manager)
        admin = await make_user(db_session, role=UserRole.ADMIN.value)
        student = await make_student(db_session, school, grades={"WING_TSUN": (5, 10)})

        create_resp = await client.post(
            "/api/grades/change-requests",
            json={"student_id": student.id, "branch": "WING_TSUN", "requested_grade": 6, "note": "not"},
            headers=auth_headers(manager),
        )
        req_id = create_resp.json()["id"]

        first = await client.post(f"/api/grades/change-requests/{req_id}/approve", headers=auth_headers(admin))
        assert first.status_code == 200

        second = await client.post(f"/api/grades/change-requests/{req_id}/approve", headers=auth_headers(admin))
        assert second.status_code == 400
