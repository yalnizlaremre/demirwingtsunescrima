import pytest

from app.models.user import UserRole

from tests.conftest import make_user, make_school, auth_headers

pytestmark = pytest.mark.asyncio


async def _grant(db_session, user, *perms):
    user.extra_permissions = list(perms)
    await db_session.commit()


class TestManageProductsPermission:
    async def test_manager_without_permission_403(self, client, db_session):
        manager = await make_user(db_session, role=UserRole.MANAGER.value)
        resp = await client.post("/api/products/categories", json={"name": "X"}, headers=auth_headers(manager))
        assert resp.status_code == 403

    async def test_manager_with_permission_200(self, client, db_session):
        manager = await make_user(db_session, role=UserRole.MANAGER.value)
        await _grant(db_session, manager, "manage_products")
        resp = await client.post("/api/products/categories", json={"name": "X"}, headers=auth_headers(manager))
        assert resp.status_code == 200


class TestManageSchoolsPermission:
    async def test_manager_without_permission_403(self, client, db_session):
        manager = await make_user(db_session, role=UserRole.MANAGER.value)
        resp = await client.post("/api/schools/", json={"name": "Yeni Okul"}, headers=auth_headers(manager))
        assert resp.status_code == 403

    async def test_manager_with_permission_200(self, client, db_session):
        manager = await make_user(db_session, role=UserRole.MANAGER.value)
        await _grant(db_session, manager, "manage_schools")
        resp = await client.post("/api/schools/", json={"name": "Yeni Okul"}, headers=auth_headers(manager))
        assert resp.status_code == 200


class TestManageSiteContentPermission:
    async def test_manager_without_permission_403(self, client, db_session):
        manager = await make_user(db_session, role=UserRole.MANAGER.value)
        resp = await client.get("/api/site-content/", headers=auth_headers(manager))
        assert resp.status_code == 403

    async def test_manager_with_permission_200(self, client, db_session):
        manager = await make_user(db_session, role=UserRole.MANAGER.value)
        await _grant(db_session, manager, "manage_site_content")
        resp = await client.get("/api/site-content/", headers=auth_headers(manager))
        assert resp.status_code == 200


class TestManageEventsPermission:
    def _payload(self):
        return {
            "name": "Seminer",
            "event_type": "SEMINAR",
            "start_datetime": "2030-01-01T00:00:00",
            "end_datetime": "2030-01-02T00:00:00",
            "location": "Test Location",
        }

    async def test_manager_without_permission_403(self, client, db_session):
        manager = await make_user(db_session, role=UserRole.MANAGER.value)
        resp = await client.post("/api/events/", json=self._payload(), headers=auth_headers(manager))
        assert resp.status_code == 403

    async def test_manager_with_permission_200(self, client, db_session):
        manager = await make_user(db_session, role=UserRole.MANAGER.value)
        await _grant(db_session, manager, "manage_events")
        resp = await client.post("/api/events/", json=self._payload(), headers=auth_headers(manager))
        assert resp.status_code == 200


class TestManageGradesPermission:
    def _payload(self):
        return {"branch": "WING_TSUN", "grade": 99, "grade_name": "Test Kusak", "required_hours": 50}

    async def test_manager_without_permission_403(self, client, db_session):
        manager = await make_user(db_session, role=UserRole.MANAGER.value)
        resp = await client.post("/api/grades/requirements", json=self._payload(), headers=auth_headers(manager))
        assert resp.status_code == 403

    async def test_manager_with_permission_200(self, client, db_session):
        manager = await make_user(db_session, role=UserRole.MANAGER.value)
        await _grant(db_session, manager, "manage_grades")
        resp = await client.post("/api/grades/requirements", json=self._payload(), headers=auth_headers(manager))
        assert resp.status_code == 200


class TestUserManagementSecurityRules:
    async def test_manager_without_permission_cannot_list_users(self, client, db_session):
        manager = await make_user(db_session, role=UserRole.MANAGER.value)
        resp = await client.get("/api/users/", headers=auth_headers(manager))
        assert resp.status_code == 403

    async def test_manager_with_permission_can_list_users(self, client, db_session):
        manager = await make_user(db_session, role=UserRole.MANAGER.value)
        await _grant(db_session, manager, "manage_users")
        resp = await client.get("/api/users/", headers=auth_headers(manager))
        assert resp.status_code == 200

    async def test_manager_cannot_create_admin(self, client, db_session):
        manager = await make_user(db_session, role=UserRole.MANAGER.value)
        await _grant(db_session, manager, "manage_users")
        resp = await client.post(
            "/api/users/",
            json={
                "email": "wannabe-admin@test.com", "password": "password123",
                "first_name": "X", "last_name": "Y", "role": "ADMIN",
            },
            headers=auth_headers(manager),
        )
        assert resp.status_code == 403

    async def test_manager_can_create_regular_user(self, client, db_session):
        manager = await make_user(db_session, role=UserRole.MANAGER.value)
        await _grant(db_session, manager, "manage_users")
        resp = await client.post(
            "/api/users/",
            json={
                "email": "new-member@test.com", "password": "password123",
                "first_name": "X", "last_name": "Y", "role": "USER",
            },
            headers=auth_headers(manager),
        )
        assert resp.status_code == 200

    async def test_manager_cannot_edit_admin_target(self, client, db_session):
        manager = await make_user(db_session, role=UserRole.MANAGER.value)
        await _grant(db_session, manager, "manage_users")
        admin = await make_user(db_session, role=UserRole.ADMIN.value)
        resp = await client.put(
            f"/api/users/{admin.id}", json={"first_name": "Hacked"}, headers=auth_headers(manager)
        )
        assert resp.status_code == 403

    async def test_manager_cannot_escalate_role_to_admin(self, client, db_session):
        manager = await make_user(db_session, role=UserRole.MANAGER.value)
        await _grant(db_session, manager, "manage_users")
        other = await make_user(db_session, role=UserRole.USER.value)
        resp = await client.put(
            f"/api/users/{other.id}", json={"role": "ADMIN"}, headers=auth_headers(manager)
        )
        assert resp.status_code == 403

    async def test_manager_cannot_change_extra_permissions(self, client, db_session):
        manager = await make_user(db_session, role=UserRole.MANAGER.value)
        await _grant(db_session, manager, "manage_users")
        other = await make_user(db_session, role=UserRole.MANAGER.value)
        resp = await client.put(
            f"/api/users/{other.id}",
            json={"extra_permissions": ["manage_users"]},
            headers=auth_headers(manager),
        )
        assert resp.status_code == 403

    async def test_manager_cannot_delete_admin(self, client, db_session):
        manager = await make_user(db_session, role=UserRole.MANAGER.value)
        await _grant(db_session, manager, "manage_users")
        admin = await make_user(db_session, role=UserRole.ADMIN.value)
        resp = await client.delete(f"/api/users/{admin.id}", headers=auth_headers(manager))
        assert resp.status_code == 403

    async def test_manager_can_delete_regular_user(self, client, db_session):
        manager = await make_user(db_session, role=UserRole.MANAGER.value)
        await _grant(db_session, manager, "manage_users")
        other = await make_user(db_session, role=UserRole.USER.value)
        resp = await client.delete(f"/api/users/{other.id}", headers=auth_headers(manager))
        assert resp.status_code == 200

    async def test_real_admin_can_set_extra_permissions(self, client, db_session):
        admin = await make_user(db_session, role=UserRole.ADMIN.value)
        target = await make_user(db_session, role=UserRole.MANAGER.value)
        resp = await client.put(
            f"/api/users/{target.id}",
            json={"extra_permissions": ["manage_schools"]},
            headers=auth_headers(admin),
        )
        assert resp.status_code == 200
        assert resp.json()["extra_permissions"] == ["manage_schools"]

    async def test_manager_with_manage_students_direct_via_manage_users(self, client, db_session):
        """manage_users izni, oncekiu oturumda eklenen POST /students/ (dogrudan
        ogrenci atama) yetkisini de kapsar."""
        manager = await make_user(db_session, role=UserRole.MANAGER.value)
        await _grant(db_session, manager, "manage_users")
        school = await make_school(db_session, name="Okul A")
        target = await make_user(db_session, role=UserRole.MEMBER.value)
        resp = await client.post(
            "/api/students/",
            json={"user_id": target.id, "school_id": school.id},
            headers=auth_headers(manager),
        )
        assert resp.status_code == 200

    async def test_manager_with_manage_users_cannot_assign_admin_as_student(self, client, db_session):
        manager = await make_user(db_session, role=UserRole.MANAGER.value)
        await _grant(db_session, manager, "manage_users")
        school = await make_school(db_session, name="Okul A")
        admin_target = await make_user(db_session, role=UserRole.ADMIN.value)
        resp = await client.post(
            "/api/students/",
            json={"user_id": admin_target.id, "school_id": school.id},
            headers=auth_headers(manager),
        )
        assert resp.status_code == 403
