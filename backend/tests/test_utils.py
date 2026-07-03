from datetime import datetime, timezone

from app.utils import utcnow_naive
from app.schemas.event import EventCreate


class TestUtcnowNaive:
    def test_returns_naive_datetime(self):
        assert utcnow_naive().tzinfo is None


class TestNaiveDatetimeSchemaField:
    def test_strips_tzinfo_from_incoming_iso_string(self):
        # Browsers send `.toISOString()` (tz-aware "Z"-suffixed) values. Postgres
        # rejects tz-aware datetimes against our naive TIMESTAMP columns, so the
        # schema must strip tzinfo before it ever reaches the ORM.
        event = EventCreate(
            name="Test",
            event_type="SEMINAR",
            start_datetime="2030-01-01T00:00:00.000Z",
            end_datetime="2030-01-02T00:00:00.000Z",
            location="Test",
        )
        assert event.start_datetime.tzinfo is None
        assert event.end_datetime.tzinfo is None

    def test_naive_input_passes_through_unchanged(self):
        event = EventCreate(
            name="Test",
            event_type="SEMINAR",
            start_datetime="2030-01-01T00:00:00",
            end_datetime="2030-01-02T00:00:00",
            location="Test",
        )
        assert event.start_datetime == datetime(2030, 1, 1, 0, 0, 0)
