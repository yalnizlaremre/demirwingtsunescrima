import pytest

from app.models.user import UserRole

from tests.conftest import (
    auth_headers,
    make_user,
    make_school,
    make_school_manager,
    make_student,
    make_lesson,
)

pytestmark = pytest.mark.asyncio


class TestDeleteSchool:
    async def test_delete_school_with_manager_student_and_lesson_succeeds(self, client, db_session):
        """Regression: School.managers/students/lessons (lazy="selectin") need
        passive_deletes="all", otherwise deleting a school that has any manager,
        student or lesson raises IntegrityError -> 500 (same bug family as
        User.managed_schools/student_profile and Lesson.attendances)."""
        admin = await make_user(db_session, role=UserRole.ADMIN.value)
        school = await make_school(db_session)
        manager = await make_user(db_session, role=UserRole.MANAGER.value)
        await make_school_manager(db_session, school, manager)
        await make_student(db_session, school)
        await make_lesson(db_session, school, admin)

        resp = await client.delete(f"/api/schools/{school.id}", headers=auth_headers(admin))
        assert resp.status_code == 200

    async def test_delete_empty_school_succeeds(self, client, db_session):
        admin = await make_user(db_session, role=UserRole.ADMIN.value)
        school = await make_school(db_session)

        resp = await client.delete(f"/api/schools/{school.id}", headers=auth_headers(admin))
        assert resp.status_code == 200

    async def test_delete_nonexistent_school_returns_404(self, client, db_session):
        admin = await make_user(db_session, role=UserRole.ADMIN.value)

        resp = await client.delete("/api/schools/does-not-exist", headers=auth_headers(admin))
        assert resp.status_code == 404


class TestSchoolManagers:
    """Regression: there was no way to see or undo a manager assignment from the
    admin panel (assign-only). GET /{school_id}/managers now backs that UI."""

    async def test_list_managers_reflects_assign_and_remove(self, client, db_session):
        admin = await make_user(db_session, role=UserRole.ADMIN.value)
        school = await make_school(db_session)
        manager = await make_user(db_session, role=UserRole.MANAGER.value)

        empty = await client.get(f"/api/schools/{school.id}/managers", headers=auth_headers(admin))
        assert empty.status_code == 200
        assert empty.json() == []

        assign = await client.post(
            f"/api/schools/{school.id}/managers", json={"user_id": manager.id}, headers=auth_headers(admin)
        )
        assert assign.status_code == 200

        after_assign = await client.get(f"/api/schools/{school.id}/managers", headers=auth_headers(admin))
        assert [m["id"] for m in after_assign.json()] == [manager.id]

        remove = await client.delete(
            f"/api/schools/{school.id}/managers/{manager.id}", headers=auth_headers(admin)
        )
        assert remove.status_code == 200

        after_remove = await client.get(f"/api/schools/{school.id}/managers", headers=auth_headers(admin))
        assert after_remove.json() == []
