import pytest

from app.models.user import UserRole

from tests.conftest import make_user, make_school, make_school_manager, make_student, auth_headers

pytestmark = pytest.mark.asyncio


class TestStudentUpdatePermissions:
    async def test_manager_can_update_own_school_student(self, client, db_session):
        school = await make_school(db_session, name="Okul A")
        manager = await make_user(db_session, role=UserRole.MANAGER.value)
        await make_school_manager(db_session, school, manager)
        student = await make_student(db_session, school)

        resp = await client.put(
            f"/api/students/{student.id}",
            json={"notes": "yeni not"},
            headers=auth_headers(manager),
        )
        assert resp.status_code == 200
        assert resp.json()["notes"] == "yeni not"

    async def test_manager_cannot_set_school_id(self, client, db_session):
        school_a = await make_school(db_session, name="Okul A")
        school_b = await make_school(db_session, name="Okul B")
        manager = await make_user(db_session, role=UserRole.MANAGER.value)
        await make_school_manager(db_session, school_a, manager)
        student = await make_student(db_session, school_a)

        resp = await client.put(
            f"/api/students/{student.id}",
            json={"school_id": school_b.id},
            headers=auth_headers(manager),
        )
        assert resp.status_code == 403

    async def test_manager_cannot_update_other_school_student(self, client, db_session):
        school_a = await make_school(db_session, name="Okul A")
        school_b = await make_school(db_session, name="Okul B")
        manager = await make_user(db_session, role=UserRole.MANAGER.value)
        await make_school_manager(db_session, school_a, manager)
        student = await make_student(db_session, school_b)

        resp = await client.put(
            f"/api/students/{student.id}",
            json={"notes": "yeni not"},
            headers=auth_headers(manager),
        )
        assert resp.status_code == 403

    async def test_admin_can_reassign_school(self, client, db_session):
        school_a = await make_school(db_session, name="Okul A")
        school_b = await make_school(db_session, name="Okul B")
        admin = await make_user(db_session, role=UserRole.ADMIN.value)
        student = await make_student(db_session, school_a)

        resp = await client.put(
            f"/api/students/{student.id}",
            json={"school_id": school_b.id},
            headers=auth_headers(admin),
        )
        assert resp.status_code == 200
        assert resp.json()["school_id"] == school_b.id
        assert resp.json()["school_name"] == "Okul B"

    async def test_user_cannot_update_student(self, client, db_session):
        school = await make_school(db_session)
        student = await make_student(db_session, school)
        user = await make_user(db_session, role=UserRole.USER.value)

        resp = await client.put(
            f"/api/students/{student.id}",
            json={"notes": "x"},
            headers=auth_headers(user),
        )
        assert resp.status_code == 403

    async def test_update_nonexistent_student_404(self, client, db_session):
        admin = await make_user(db_session, role=UserRole.ADMIN.value)
        resp = await client.put(
            "/api/students/does-not-exist",
            json={"notes": "x"},
            headers=auth_headers(admin),
        )
        assert resp.status_code == 404
