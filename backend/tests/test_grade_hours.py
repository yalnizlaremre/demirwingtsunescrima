import pytest
from types import SimpleNamespace

from app.services.grade_hours import (
    get_hours_for_grade,
    update_progress_hours,
    check_exam_eligibility,
)


class TestGetHoursForGrade:
    @pytest.mark.parametrize(
        "grade,expected",
        [
            (1, {"required": 54, "minimum": 44}),
            (3, {"required": 54, "minimum": 44}),
            (4, {"required": 60, "minimum": 52}),
            (8, {"required": 60, "minimum": 52}),
            (9, {"required": 96, "minimum": 80}),
            (10, {"required": 96, "minimum": 80}),
            (11, {"required": 128, "minimum": 110}),
            (12, {"required": 128, "minimum": 110}),
        ],
    )
    def test_known_grade_ranges(self, grade, expected):
        assert get_hours_for_grade(grade) == expected

    @pytest.mark.parametrize("grade", [0, -1, 13, 100])
    def test_grade_outside_map_returns_zeros(self, grade):
        assert get_hours_for_grade(grade) == {"required": 0, "minimum": 0}


class TestCheckExamEligibility:
    def test_exact_required_hours_is_eligible(self):
        assert check_exam_eligibility(1, 54) == "ELIGIBLE"

    def test_above_required_hours_is_eligible(self):
        assert check_exam_eligibility(1, 60) == "ELIGIBLE"

    def test_exact_minimum_hours_needs_approval(self):
        assert check_exam_eligibility(1, 44) == "NEEDS_APPROVAL"

    def test_between_minimum_and_required_needs_approval(self):
        assert check_exam_eligibility(1, 50) == "NEEDS_APPROVAL"

    def test_just_below_required_needs_approval(self):
        assert check_exam_eligibility(1, 53.99) == "NEEDS_APPROVAL"

    def test_below_minimum_not_eligible(self):
        assert check_exam_eligibility(1, 43) == "NOT_ELIGIBLE"

    def test_zero_hours_not_eligible(self):
        assert check_exam_eligibility(1, 0) == "NOT_ELIGIBLE"

    @pytest.mark.parametrize("grade", [0, -1, 13, 100])
    def test_grade_outside_map_is_always_eligible(self, grade):
        # Surprising behavior: grade_hours.py treats any grade without a defined
        # required-hours bucket as automatically ELIGIBLE, regardless of hours.
        assert check_exam_eligibility(grade, 0) == "ELIGIBLE"
        assert check_exam_eligibility(grade, 1000) == "ELIGIBLE"

    def test_boundary_between_grade_3_and_4_uses_different_requirements(self):
        # grade 3 needs 54h, grade 4 needs 60h at the same completed hours
        assert check_exam_eligibility(3, 55) == "ELIGIBLE"
        assert check_exam_eligibility(4, 55) == "NEEDS_APPROVAL"


class TestUpdateProgressHours:
    def _progress(self, current_grade=1, completed_hours=0.0):
        return SimpleNamespace(current_grade=current_grade, completed_hours=completed_hours, remaining_hours=0)

    def test_positive_hours_added(self):
        progress = self._progress(current_grade=1, completed_hours=10)
        update_progress_hours(progress, 5)
        assert progress.completed_hours == 15
        assert progress.remaining_hours == 54 - 15

    def test_negative_hours_rolled_back(self):
        progress = self._progress(current_grade=1, completed_hours=10)
        update_progress_hours(progress, -4)
        assert progress.completed_hours == 6
        assert progress.remaining_hours == 54 - 6

    def test_negative_hours_floor_at_zero(self):
        progress = self._progress(current_grade=1, completed_hours=2)
        update_progress_hours(progress, -10)
        assert progress.completed_hours == 0
        assert progress.remaining_hours == 54

    def test_remaining_hours_floors_at_zero_when_overcomplete(self):
        progress = self._progress(current_grade=1, completed_hours=50)
        update_progress_hours(progress, 20)
        assert progress.completed_hours == 70
        assert progress.remaining_hours == 0

    def test_grade_outside_map_remaining_hours_always_zero(self):
        progress = self._progress(current_grade=0, completed_hours=5)
        update_progress_hours(progress, 10)
        assert progress.completed_hours == 15
        assert progress.remaining_hours == 0
