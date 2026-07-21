import pytest

from app.models.user import UserRole, UserStatus

from tests.conftest import make_user, make_school, make_student, auth_headers

pytestmark = pytest.mark.asyncio


class TestStudentCreate:
    async def test_admin_can_create_student_from_user(self, client, db_session):
        school = await make_school(db_session, name="Okul A")
        admin = await make_user(db_session, role=UserRole.ADMIN.value)
        target = await make_user(db_session, role=UserRole.MEMBER.value, status=UserStatus.ACTIVE.value)

        resp = await client.post(
            "/api/students/",
            json={"user_id": target.id, "school_id": school.id},
            headers=auth_headers(admin),
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["user_id"] == target.id
        assert body["school_id"] == school.id
        assert len(body["progress"]) == 2

        await db_session.refresh(target)
        assert target.role == UserRole.USER.value

    async def test_pending_member_activated_on_create(self, client, db_session):
        school = await make_school(db_session, name="Okul A")
        admin = await make_user(db_session, role=UserRole.ADMIN.value)
        target = await make_user(db_session, role=UserRole.MEMBER.value, status=UserStatus.PENDING.value)

        resp = await client.post(
            "/api/students/",
            json={"user_id": target.id, "school_id": school.id},
            headers=auth_headers(admin),
        )
        assert resp.status_code == 200

        await db_session.refresh(target)
        assert target.status == UserStatus.ACTIVE.value

    async def test_cannot_create_duplicate_student(self, client, db_session):
        school = await make_school(db_session, name="Okul A")
        admin = await make_user(db_session, role=UserRole.ADMIN.value)
        existing = await make_student(db_session, school)

        resp = await client.post(
            "/api/students/",
            json={"user_id": existing.user_id, "school_id": school.id},
            headers=auth_headers(admin),
        )
        assert resp.status_code == 409

    async def test_create_student_unknown_user_404(self, client, db_session):
        school = await make_school(db_session, name="Okul A")
        admin = await make_user(db_session, role=UserRole.ADMIN.value)

        resp = await client.post(
            "/api/students/",
            json={"user_id": "does-not-exist", "school_id": school.id},
            headers=auth_headers(admin),
        )
        assert resp.status_code == 404

    async def test_create_student_unknown_school_404(self, client, db_session):
        admin = await make_user(db_session, role=UserRole.ADMIN.value)
        target = await make_user(db_session, role=UserRole.MEMBER.value)

        resp = await client.post(
            "/api/students/",
            json={"user_id": target.id, "school_id": "does-not-exist"},
            headers=auth_headers(admin),
        )
        assert resp.status_code == 404

    async def test_manager_cannot_create_student(self, client, db_session):
        school = await make_school(db_session, name="Okul A")
        manager = await make_user(db_session, role=UserRole.MANAGER.value)
        target = await make_user(db_session, role=UserRole.MEMBER.value)

        resp = await client.post(
            "/api/students/",
            json={"user_id": target.id, "school_id": school.id},
            headers=auth_headers(manager),
        )
        assert resp.status_code == 403

    async def test_user_role_not_downgraded(self, client, db_session):
        """USER rolundeki (zaten ogrenci degil ama yukseltilmis) bir kullanici icin
        rol MEMBER'a dusurulmemeli, oldugu gibi kalmali."""
        school = await make_school(db_session, name="Okul A")
        admin = await make_user(db_session, role=UserRole.ADMIN.value)
        target = await make_user(db_session, role=UserRole.USER.value)

        resp = await client.post(
            "/api/students/",
            json={"user_id": target.id, "school_id": school.id},
            headers=auth_headers(admin),
        )
        assert resp.status_code == 200

        await db_session.refresh(target)
        assert target.role == UserRole.USER.value
