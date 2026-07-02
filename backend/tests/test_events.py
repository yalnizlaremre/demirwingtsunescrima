import pytest
from datetime import datetime, timedelta, timezone
from sqlalchemy import select

from app.models.user import UserRole
from app.models.student import Branch, StudentProgress
from app.models.event import Event, EventType, SeminarEvaluation
from tests.conftest import auth_headers, make_user, make_school, make_student


async def make_event(db_session, creator, event_type=EventType.SEMINAR.value, is_completed=False):
    event = Event(
        name="Test Seminar",
        event_type=event_type,
        start_datetime=datetime.now(timezone.utc) + timedelta(days=1),
        location="Test Location",
        scope="ALL_SCHOOLS",
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
