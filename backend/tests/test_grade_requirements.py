import pytest

from app.models.user import UserRole

from tests.conftest import auth_headers, make_user

pytestmark = pytest.mark.asyncio


class TestGradeRequirementCrud:
    async def test_create_and_update_requirement(self, client, db_session):
        admin = await make_user(db_session, role=UserRole.ADMIN.value)

        create_resp = await client.post(
            "/api/grades/requirements",
            json={"branch": "WING_TSUN", "grade": 1, "grade_name": "Beyaz Kusak", "required_hours": 54},
            headers=auth_headers(admin),
        )
        assert create_resp.status_code == 200
        req_id = create_resp.json()["id"]

        update_resp = await client.put(
            f"/api/grades/requirements/{req_id}",
            json={"grade_name": "Beyaz Kusak (duzeltildi)", "required_hours": 60},
            headers=auth_headers(admin),
        )
        assert update_resp.status_code == 200
        assert update_resp.json()["grade_name"] == "Beyaz Kusak (duzeltildi)"
        assert update_resp.json()["required_hours"] == 60

    async def test_update_nonexistent_requirement_404(self, client, db_session):
        admin = await make_user(db_session, role=UserRole.ADMIN.value)
        resp = await client.put(
            "/api/grades/requirements/does-not-exist",
            json={"grade_name": "x"},
            headers=auth_headers(admin),
        )
        assert resp.status_code == 404

    async def test_user_cannot_update_requirement(self, client, db_session):
        admin = await make_user(db_session, role=UserRole.ADMIN.value)
        user = await make_user(db_session, role=UserRole.USER.value)

        create_resp = await client.post(
            "/api/grades/requirements",
            json={"branch": "WING_TSUN", "grade": 1, "grade_name": "Beyaz Kusak", "required_hours": 54},
            headers=auth_headers(admin),
        )
        req_id = create_resp.json()["id"]

        resp = await client.put(
            f"/api/grades/requirements/{req_id}",
            json={"grade_name": "x"},
            headers=auth_headers(user),
        )
        assert resp.status_code == 403
