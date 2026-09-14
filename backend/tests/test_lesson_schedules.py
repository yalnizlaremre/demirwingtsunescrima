import pytest

from app.models.user import UserRole
from app.models.student import Branch

from tests.conftest import auth_headers, make_user, make_school, make_school_manager

pytestmark = pytest.mark.asyncio


def _payload(school_id):
    return {
        "school_id": school_id,
        "branch": Branch.WING_TSUN.value,
        "lesson_type": "GROUP",
        "day_of_week": 1,
        "start_time": "19:00",
        "start_date": "2026-01-05",
        "end_date": "2026-01-26",
    }


async def _create_schedule(client, school_id, headers):
    resp = await client.post("/api/lesson-schedules/", json=_payload(school_id), headers=headers)
    assert resp.status_code == 200
    return resp.json()["schedule"]["id"]


class TestLessonScheduleScope:
    async def test_admin_can_create_schedule_and_generates_lessons(self, client, db_session):
        admin = await make_user(db_session, role=UserRole.ADMIN.value)
        school = await make_school(db_session)

        resp = await client.post("/api/lesson-schedules/", json=_payload(school.id), headers=auth_headers(admin))
        assert resp.status_code == 200
        assert resp.json()["generated_count"] > 0

    async def test_manager_cannot_create_schedule_for_other_school(self, client, db_session):
        manager = await make_user(db_session, role=UserRole.MANAGER.value)
        own_school = await make_school(db_session, name="Own School")
        other_school = await make_school(db_session, name="Other School")
        await make_school_manager(db_session, own_school, manager)

        resp = await client.post(
            "/api/lesson-schedules/", json=_payload(other_school.id), headers=auth_headers(manager)
        )
        assert resp.status_code == 403

    async def test_manager_cannot_delete_other_school_schedule(self, client, db_session):
        """Regression: delete_schedule had no school-scope check at all."""
        admin = await make_user(db_session, role=UserRole.ADMIN.value)
        manager = await make_user(db_session, role=UserRole.MANAGER.value)
        own_school = await make_school(db_session, name="Own School")
        other_school = await make_school(db_session, name="Other School")
        await make_school_manager(db_session, own_school, manager)

        schedule_id = await _create_schedule(client, other_school.id, auth_headers(admin))

        resp = await client.delete(f"/api/lesson-schedules/{schedule_id}", headers=auth_headers(manager))
        assert resp.status_code == 403

    async def test_manager_can_delete_own_school_schedule(self, client, db_session):
        manager = await make_user(db_session, role=UserRole.MANAGER.value)
        school = await make_school(db_session)
        await make_school_manager(db_session, school, manager)

        schedule_id = await _create_schedule(client, school.id, auth_headers(manager))

        resp = await client.delete(f"/api/lesson-schedules/{schedule_id}", headers=auth_headers(manager))
        assert resp.status_code == 200

    async def test_manager_cannot_extend_other_school_schedule(self, client, db_session):
        """Regression: POST /{id}/generate (extend) had no school-scope check at all."""
        admin = await make_user(db_session, role=UserRole.ADMIN.value)
        manager = await make_user(db_session, role=UserRole.MANAGER.value)
        own_school = await make_school(db_session, name="Own School")
        other_school = await make_school(db_session, name="Other School")
        await make_school_manager(db_session, own_school, manager)

        schedule_id = await _create_schedule(client, other_school.id, auth_headers(admin))

        resp = await client.post(
            f"/api/lesson-schedules/{schedule_id}/generate?new_end_date=2026-03-01",
            headers=auth_headers(manager),
        )
        assert resp.status_code == 403

    async def test_manager_can_extend_own_school_schedule(self, client, db_session):
        manager = await make_user(db_session, role=UserRole.MANAGER.value)
        school = await make_school(db_session)
        await make_school_manager(db_session, school, manager)

        schedule_id = await _create_schedule(client, school.id, auth_headers(manager))

        resp = await client.post(
            f"/api/lesson-schedules/{schedule_id}/generate?new_end_date=2026-03-01",
            headers=auth_headers(manager),
        )
        assert resp.status_code == 200
        assert resp.json()["generated"] > 0
