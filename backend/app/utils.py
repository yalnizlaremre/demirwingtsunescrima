from datetime import datetime, timezone
from typing import Annotated

from pydantic import AfterValidator


def utcnow_naive() -> datetime:
    """UTC now as a naive datetime, matching our DB columns (TIMESTAMP WITHOUT TIME ZONE).

    Postgres/asyncpg rejects comparing/inserting timezone-aware datetimes against
    naive columns ("can't subtract offset-naive and offset-aware datetimes").
    SQLite doesn't enforce this, so the bug only surfaces in production.
    """
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _strip_tzinfo(value: datetime) -> datetime:
    if value.tzinfo is not None:
        return value.replace(tzinfo=None)
    return value


# Use for any Pydantic input field bound for a naive (TIMESTAMP WITHOUT TIME ZONE)
# DB column. Browsers send ISO strings with a "Z"/offset (e.g. via .toISOString()),
# which Pydantic parses as tz-aware -- asyncpg then rejects it against our naive
# columns. This coerces such values to naive UTC at the API boundary. Must run
# AFTER Pydantic's own str->datetime parsing (BeforeValidator sees the raw string).
NaiveDatetime = Annotated[datetime, AfterValidator(_strip_tzinfo)]
