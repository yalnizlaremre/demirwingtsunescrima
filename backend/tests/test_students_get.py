import pytest

from app.models.user import UserRole

from tests.conftest import make_user, make_school, make_school_manager, make_student, auth_headers

pytestmark = pytest.mark.asyncio


class TestGetStudentPermissions:
    """Regression: GET /students/{id} had no scope check at all (unlike list_students
    and update_student in the same router), letting any authenticated user - including
    a MEMBER with no school - read any student's full profile (DOB, emergency contact,
    notes, progress) by id."""

    async def test_user_can_view_own_student_profile(self, client, db_session):
        school = await make_school(db_session)
        user = await make_user(db_session, role=UserRole.USER.value)
        student = await make_student(db_session, school, user=user)

        resp = await client.get(f"/api/students/{student.id}", headers=auth_headers(user))
        assert resp.status_code == 200
        assert resp.json()["id"] == student.id

    async def test_user_cannot_view_other_students_profile(self, client, db_session):
        school = await make_school(db_session)
        student = await make_student(db_session, school)
        other_user = await make_user(db_session, role=UserRole.USER.value)

        resp = await client.get(f"/api/students/{student.id}", headers=auth_headers(other_user))
        assert resp.status_code == 403

    async def test_member_cannot_view_any_student_profile(self, client, db_session):
        school = await make_school(db_session)
        student = await make_student(db_session, school)
        member = await make_user(db_session, role=UserRole.MEMBER.value)

        resp = await client.get(f"/api/students/{student.id}", headers=auth_headers(member))
        assert resp.status_code == 403

    async def test_manager_can_view_own_school_student(self, client, db_session):
        school = await make_school(db_session)
        manager = await make_user(db_session, role=UserRole.MANAGER.value)
        await make_school_manager(db_session, school, manager)
        student = await make_student(db_session, school)

        resp = await client.get(f"/api/students/{student.id}", headers=auth_headers(manager))
        assert resp.status_code == 200

    async def test_manager_cannot_view_other_school_student(self, client, db_session):
        school_a = await make_school(db_session, name="Okul A")
        school_b = await make_school(db_session, name="Okul B")
        manager = await make_user(db_session, role=UserRole.MANAGER.value)
        await make_school_manager(db_session, school_a, manager)
        student = await make_student(db_session, school_b)

        resp = await client.get(f"/api/students/{student.id}", headers=auth_headers(manager))
        assert resp.status_code == 403

    async def test_admin_can_view_any_student(self, client, db_session):
        school = await make_school(db_session)
        student = await make_student(db_session, school)
        admin = await make_user(db_session, role=UserRole.ADMIN.value)

        resp = await client.get(f"/api/students/{student.id}", headers=auth_headers(admin))
        assert resp.status_code == 200

    async def test_get_nonexistent_student_404(self, client, db_session):
        admin = await make_user(db_session, role=UserRole.ADMIN.value)
        resp = await client.get("/api/students/does-not-exist", headers=auth_headers(admin))
        assert resp.status_code == 404
