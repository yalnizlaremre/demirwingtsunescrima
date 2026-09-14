import pytest
from datetime import datetime, timedelta, timezone
from sqlalchemy import select

from app.models.user import UserRole
from app.models.student import Branch, StudentProgress
from app.models.event import Event, EventSchool, EventType, SeminarEvaluation
from tests.conftest import auth_headers, make_user, make_school, make_student


async def make_event(db_session, creator, event_type=EventType.SEMINAR.value, is_completed=False, scope="ALL_SCHOOLS"):
    event = Event(
        name="Test Seminar",
        event_type=event_type,
        start_datetime=datetime.now(timezone.utc) + timedelta(days=1),
        location="Test Location",
        scope=scope,
        created_by=creator.id,
        is_completed=is_completed,
    )
    db_session.add(event)
    await db_session.commit()
    await db_session.refresh(event)
    return event


async def make_student_user(db_session, school):
    user = await make_user(db_session, role=UserRole.USER.value)
    student = await make_student(db_session, school, user=user)
    return user, student


class TestRegisterForEvent:
    async def test_eligible_student_registers_directly(self, client, db_session):
        admin = await make_user(db_session, role=UserRole.ADMIN.value)
        school = await make_school(db_session)
        user, student = await make_student_user(db_session, school)
        db_session.add(
            StudentProgress(student_id=student.id, branch=Branch.WING_TSUN.value, current_grade=1, completed_hours=54, remaining_hours=0)
        )
        await db_session.commit()
        event = await make_event(db_session, admin)

        resp = await client.post(
            f"/api/events/{event.id}/register",
            json={"will_take_exam": True, "exam_branch_wt": True},
            headers=auth_headers(user),
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["will_take_exam"] is True
        assert body["exam_branch_wt"] is True
        assert body["needs_manager_approval"] is False

    async def test_needs_approval_student(self, client, db_session):
        admin = await make_user(db_session, role=UserRole.ADMIN.value)
        school = await make_school(db_session)
        user, student = await make_student_user(db_session, school)
        db_session.add(
            StudentProgress(student_id=student.id, branch=Branch.WING_TSUN.value, current_grade=1, completed_hours=44, remaining_hours=0)
        )
        await db_session.commit()
        event = await make_event(db_session, admin)

        resp = await client.post(
            f"/api/events/{event.id}/register",
            json={"will_take_exam": True, "exam_branch_wt": True},
            headers=auth_headers(user),
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["exam_branch_wt"] is True
        assert body["needs_manager_approval"] is True

    async def test_not_eligible_branch_flag_forced_false(self, client, db_session):
        admin = await make_user(db_session, role=UserRole.ADMIN.value)
        school = await make_school(db_session)
        user, student = await make_student_user(db_session, school)
        db_session.add(
            StudentProgress(student_id=student.id, branch=Branch.WING_TSUN.value, current_grade=1, completed_hours=5, remaining_hours=0)
        )
        await db_session.commit()
        event = await make_event(db_session, admin)

        resp = await client.post(
            f"/api/events/{event.id}/register",
            json={"will_take_exam": True, "exam_branch_wt": True},
            headers=auth_headers(user),
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["exam_branch_wt"] is False
        assert body["will_take_exam"] is False
        assert body["needs_manager_approval"] is False

    async def test_non_seminar_event_ignores_exam_flag(self, client, db_session):
        admin = await make_user(db_session, role=UserRole.ADMIN.value)
        school = await make_school(db_session)
        user, student = await make_student_user(db_session, school)
        event = await make_event(db_session, admin, event_type=EventType.EVENT.value)

        resp = await client.post(
            f"/api/events/{event.id}/register",
            json={"will_take_exam": True, "exam_branch_wt": True, "register_wt": True},
            headers=auth_headers(user),
        )
        assert resp.status_code == 200
        assert resp.json()["will_take_exam"] is False

    async def test_duplicate_registration_rejected(self, client, db_session):
        admin = await make_user(db_session, role=UserRole.ADMIN.value)
        school = await make_school(db_session)
        user, student = await make_student_user(db_session, school)
        event = await make_event(db_session, admin)

        payload = {"register_wt": True}
        first = await client.post(f"/api/events/{event.id}/register", json=payload, headers=auth_headers(user))
        second = await client.post(f"/api/events/{event.id}/register", json=payload, headers=auth_headers(user))
        assert first.status_code == 200
        assert second.status_code == 400


class TestUpdateAndDeleteEvent:
    async def test_admin_can_update_event(self, client, db_session):
        admin = await make_user(db_session, role=UserRole.ADMIN.value)
        event = await make_event(db_session, admin, event_type=EventType.EVENT.value)

        resp = await client.put(
            f"/api/events/{event.id}",
            json={"name": "Guncellenmis Ad", "event_type": "SEMINAR", "location": "Yeni Yer"},
            headers=auth_headers(admin),
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["name"] == "Guncellenmis Ad"
        assert body["event_type"] == "SEMINAR"
        assert body["location"] == "Yeni Yer"

    async def test_update_response_includes_registration_count_and_schools(self, client, db_session):
        admin = await make_user(db_session, role=UserRole.ADMIN.value)
        school = await make_school(db_session)
        user, student = await make_student_user(db_session, school)
        event = await make_event(db_session, admin, event_type=EventType.EVENT.value)
        await client.post(
            f"/api/events/{event.id}/register", json={"register_wt": True}, headers=auth_headers(user)
        )

        resp = await client.put(
            f"/api/events/{event.id}",
            json={"scope": "SELECTED_SCHOOLS", "selected_school_ids": [str(school.id)]},
            headers=auth_headers(admin),
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["registration_count"] == 1
        assert body["selected_school_ids"] == [str(school.id)]

    async def test_update_start_datetime_roundtrips_without_timezone_shift(self, client, db_session):
        admin = await make_user(db_session, role=UserRole.ADMIN.value)
        event = await make_event(db_session, admin, event_type=EventType.EVENT.value)

        resp = await client.put(
            f"/api/events/{event.id}",
            json={"start_datetime": "2026-12-01T15:00:00Z"},
            headers=auth_headers(admin),
        )
        assert resp.status_code == 200
        assert resp.json()["start_datetime"].startswith("2026-12-01T15:00:00")

    async def test_manager_without_permission_cannot_update_event(self, client, db_session):
        admin = await make_user(db_session, role=UserRole.ADMIN.value)
        manager = await make_user(db_session, role=UserRole.MANAGER.value)
        event = await make_event(db_session, admin)

        resp = await client.put(
            f"/api/events/{event.id}", json={"name": "X"}, headers=auth_headers(manager)
        )
        assert resp.status_code == 403

    async def test_update_nonexistent_event_returns_404(self, client, db_session):
        admin = await make_user(db_session, role=UserRole.ADMIN.value)
        resp = await client.put(
            "/api/events/does-not-exist", json={"name": "X"}, headers=auth_headers(admin)
        )
        assert resp.status_code == 404

    async def test_admin_can_delete_event(self, client, db_session):
        admin = await make_user(db_session, role=UserRole.ADMIN.value)
        event = await make_event(db_session, admin)

        resp = await client.delete(f"/api/events/{event.id}", headers=auth_headers(admin))
        assert resp.status_code == 200

        result = await db_session.execute(select(Event).where(Event.id == event.id))
        assert result.scalar_one_or_none() is None

    async def test_manager_without_permission_cannot_delete_event(self, client, db_session):
        admin = await make_user(db_session, role=UserRole.ADMIN.value)
        manager = await make_user(db_session, role=UserRole.MANAGER.value)
        event = await make_event(db_session, admin)

        resp = await client.delete(f"/api/events/{event.id}", headers=auth_headers(manager))
        assert resp.status_code == 403


class TestEvaluateSeminar:
    async def _setup_registered_student(self, db_session, admin, school, event, grade=1, hours=54, branch_wt=True):
        user, student = await make_student_user(db_session, school)
        db_session.add(
            StudentProgress(student_id=student.id, branch=Branch.WING_TSUN.value, current_grade=grade, completed_hours=hours, remaining_hours=0)
        )
        await db_session.commit()

        from app.models.event import EventRegistration

        reg = EventRegistration(
            event_id=event.id,
            student_id=student.id,
            will_take_exam=True,
            exam_branch_wt=branch_wt,
            exam_branch_escrima=False,
        )
        db_session.add(reg)
        await db_session.commit()
        return student

    async def test_passed_student_grade_increments_and_hours_reset(self, client, db_session):
        admin = await make_user(db_session, role=UserRole.ADMIN.value)
        school = await make_school(db_session)
        event = await make_event(db_session, admin)
        student = await self._setup_registered_student(db_session, admin, school, event, grade=1, hours=54)

        resp = await client.post(
            f"/api/events/{event.id}/evaluate",
            json={"passed_student_ids": [student.id], "failed_student_ids": []},
            headers=auth_headers(admin),
        )
        assert resp.status_code == 200
        assert resp.json()["passed"] == 1

        progress = (
            await db_session.execute(
                select(StudentProgress).where(StudentProgress.student_id == student.id, StudentProgress.branch == Branch.WING_TSUN.value)
            )
        ).scalar_one()
        assert progress.current_grade == 2
        assert float(progress.completed_hours) == 0

        evaluations = (
            await db_session.execute(select(SeminarEvaluation).where(SeminarEvaluation.student_id == student.id))
        ).scalars().all()
        assert len(evaluations) == 1
        assert evaluations[0].passed is True
        assert evaluations[0].grade_before == 1
        assert evaluations[0].grade_after == 2

    async def test_failed_student_grade_unchanged(self, client, db_session):
        admin = await make_user(db_session, role=UserRole.ADMIN.value)
        school = await make_school(db_session)
        event = await make_event(db_session, admin)
        student = await self._setup_registered_student(db_session, admin, school, event, grade=1, hours=54)

        resp = await client.post(
            f"/api/events/{event.id}/evaluate",
            json={"passed_student_ids": [], "failed_student_ids": [student.id]},
            headers=auth_headers(admin),
        )
        assert resp.status_code == 200
        assert resp.json()["failed"] == 1

        progress = (
            await db_session.execute(
                select(StudentProgress).where(StudentProgress.student_id == student.id, StudentProgress.branch == Branch.WING_TSUN.value)
            )
        ).scalar_one()
        assert progress.current_grade == 1
        assert float(progress.completed_hours) == 54

    async def test_both_branches_produce_two_evaluations(self, client, db_session):
        admin = await make_user(db_session, role=UserRole.ADMIN.value)
        school = await make_school(db_session)
        event = await make_event(db_session, admin)
        user, student = await make_student_user(db_session, school)
        db_session.add_all([
            StudentProgress(student_id=student.id, branch=Branch.WING_TSUN.value, current_grade=1, completed_hours=54, remaining_hours=0),
            StudentProgress(student_id=student.id, branch=Branch.ESCRIMA.value, current_grade=1, completed_hours=54, remaining_hours=0),
        ])
        await db_session.commit()

        from app.models.event import EventRegistration
        reg = EventRegistration(
            event_id=event.id, student_id=student.id, will_take_exam=True,
            exam_branch_wt=True, exam_branch_escrima=True,
        )
        db_session.add(reg)
        await db_session.commit()

        resp = await client.post(
            f"/api/events/{event.id}/evaluate",
            json={"passed_student_ids": [student.id], "failed_student_ids": []},
            headers=auth_headers(admin),
        )
        assert resp.status_code == 200
        assert resp.json()["passed"] == 2

        evaluations = (
            await db_session.execute(select(SeminarEvaluation).where(SeminarEvaluation.student_id == student.id))
        ).scalars().all()
        assert len(evaluations) == 2
        branches = {e.branch for e in evaluations}
        assert branches == {Branch.WING_TSUN.value, Branch.ESCRIMA.value}

    async def test_passed_and_failed_overlap_rejected(self, client, db_session):
        admin = await make_user(db_session, role=UserRole.ADMIN.value)
        school = await make_school(db_session)
        event = await make_event(db_session, admin)
        student = await self._setup_registered_student(db_session, admin, school, event)

        resp = await client.post(
            f"/api/events/{event.id}/evaluate",
            json={"passed_student_ids": [student.id], "failed_student_ids": [student.id]},
            headers=auth_headers(admin),
        )
        assert resp.status_code == 400

    async def test_empty_lists_rejected(self, client, db_session):
        admin = await make_user(db_session, role=UserRole.ADMIN.value)
        event = await make_event(db_session, admin)

        resp = await client.post(
            f"/api/events/{event.id}/evaluate",
            json={"passed_student_ids": [], "failed_student_ids": []},
            headers=auth_headers(admin),
        )
        assert resp.status_code == 400

    async def test_completed_seminar_cannot_be_re_evaluated(self, client, db_session):
        admin = await make_user(db_session, role=UserRole.ADMIN.value)
        school = await make_school(db_session)
        event = await make_event(db_session, admin, is_completed=True)
        student = await self._setup_registered_student(db_session, admin, school, event)

        resp = await client.post(
            f"/api/events/{event.id}/evaluate",
            json={"passed_student_ids": [student.id], "failed_student_ids": []},
            headers=auth_headers(admin),
        )
        assert resp.status_code == 400

    async def test_unregistered_student_id_silently_ignored(self, client, db_session):
        admin = await make_user(db_session, role=UserRole.ADMIN.value)
        school = await make_school(db_session)
        event = await make_event(db_session, admin)
        user, student = await make_student_user(db_session, school)
        # No EventRegistration created for this student

        resp = await client.post(
            f"/api/events/{event.id}/evaluate",
            json={"passed_student_ids": [student.id], "failed_student_ids": []},
            headers=auth_headers(admin),
        )
        assert resp.status_code == 200
        assert resp.json()["passed"] == 0


class TestEventSchoolScope:
    async def _make_selected_schools_event(self, db_session, admin, allowed_school):
        event = await make_event(
            db_session, admin, event_type=EventType.EVENT.value, scope="SELECTED_SCHOOLS"
        )
        db_session.add(EventSchool(event_id=event.id, school_id=allowed_school.id))
        await db_session.commit()
        return event

    async def test_student_of_selected_school_sees_event(self, client, db_session):
        admin = await make_user(db_session, role=UserRole.ADMIN.value)
        allowed_school = await make_school(db_session, name="Allowed School")
        event = await self._make_selected_schools_event(db_session, admin, allowed_school)
        user, student = await make_student_user(db_session, allowed_school)

        resp = await client.get("/api/events/", headers=auth_headers(user))
        assert resp.status_code == 200
        assert event.id in [item["id"] for item in resp.json()["items"]]

    async def test_student_of_other_school_does_not_see_event(self, client, db_session):
        admin = await make_user(db_session, role=UserRole.ADMIN.value)
        allowed_school = await make_school(db_session, name="Allowed School")
        other_school = await make_school(db_session, name="Other School")
        event = await self._make_selected_schools_event(db_session, admin, allowed_school)
        user, student = await make_student_user(db_session, other_school)

        resp = await client.get("/api/events/", headers=auth_headers(user))
        assert resp.status_code == 200
        assert event.id not in [item["id"] for item in resp.json()["items"]]

    async def test_all_schools_event_visible_to_every_student(self, client, db_session):
        admin = await make_user(db_session, role=UserRole.ADMIN.value)
        school = await make_school(db_session)
        event = await make_event(db_session, admin, event_type=EventType.EVENT.value, scope="ALL_SCHOOLS")
        user, student = await make_student_user(db_session, school)

        resp = await client.get("/api/events/", headers=auth_headers(user))
        assert resp.status_code == 200
        assert event.id in [item["id"] for item in resp.json()["items"]]

    async def test_admin_sees_all_events_regardless_of_scope(self, client, db_session):
        admin = await make_user(db_session, role=UserRole.ADMIN.value)
        allowed_school = await make_school(db_session, name="Allowed School")
        event = await self._make_selected_schools_event(db_session, admin, allowed_school)

        resp = await client.get("/api/events/", headers=auth_headers(admin))
        assert resp.status_code == 200
        assert event.id in [item["id"] for item in resp.json()["items"]]

    async def test_student_of_other_school_cannot_register(self, client, db_session):
        admin = await make_user(db_session, role=UserRole.ADMIN.value)
        allowed_school = await make_school(db_session, name="Allowed School")
        other_school = await make_school(db_session, name="Other School")
        event = await self._make_selected_schools_event(db_session, admin, allowed_school)
        user, student = await make_student_user(db_session, other_school)

        resp = await client.post(
            f"/api/events/{event.id}/register",
            json={"register_wt": True},
            headers=auth_headers(user),
        )
        assert resp.status_code == 403

    async def test_student_of_selected_school_can_register(self, client, db_session):
        admin = await make_user(db_session, role=UserRole.ADMIN.value)
        allowed_school = await make_school(db_session, name="Allowed School")
        event = await self._make_selected_schools_event(db_session, admin, allowed_school)
        user, student = await make_student_user(db_session, allowed_school)

        resp = await client.post(
            f"/api/events/{event.id}/register",
            json={"register_wt": True},
            headers=auth_headers(user),
        )
        assert resp.status_code == 200


class TestEventRegistrationsListPermission:
    """Regression: GET /{event_id}/registrations had no permission check at all -
    any authenticated student could read every other student's WT/Escrima
    registration and exam-approval status for an event by id."""

    async def test_plain_user_cannot_list_registrations(self, client, db_session):
        admin = await make_user(db_session, role=UserRole.ADMIN.value)
        event = await make_event(db_session, admin, event_type=EventType.EVENT.value)
        user = await make_user(db_session, role=UserRole.USER.value)

        resp = await client.get(f"/api/events/{event.id}/registrations", headers=auth_headers(user))
        assert resp.status_code == 403

    async def test_admin_can_list_registrations(self, client, db_session):
        admin = await make_user(db_session, role=UserRole.ADMIN.value)
        event = await make_event(db_session, admin, event_type=EventType.EVENT.value)

        resp = await client.get(f"/api/events/{event.id}/registrations", headers=auth_headers(admin))
        assert resp.status_code == 200
