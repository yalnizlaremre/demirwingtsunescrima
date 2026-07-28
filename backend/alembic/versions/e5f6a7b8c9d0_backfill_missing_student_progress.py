"""backfill_missing_student_progress

Revision ID: e5f6a7b8c9d0
Revises: d4e5f6a7b8c9
Create Date: 2026-07-28 21:00:00.000000

Gecmiste (bkz. app/routers/enrollments.py'deki eski "BUG FIX" yorumu) bazi
ogrenci kayitlari yalnizca WING_TSUN icin StudentProgress aliyordu, ESCRIMA
hic olusturulmuyordu. Kod artik (POST /students/, apply+approve, enrollment
onayi - ucu de) her iki brans icin de progress olusturuyor, ama bu, o
duzeltmeden once olusturulmus mevcut ogrencileri kapsamiyor. Bu migration
her ogrenci icin eksik olan brans progress kaydini (derece 1, 0 saat
tamamlanmis, 54 saat gereken - GRADE_HOURS_MAP[(1,3)] ile ayni deger)
tek seferlik olarak tamamlar.
"""
import uuid
from datetime import datetime, timezone
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e5f6a7b8c9d0'
down_revision: Union[str, None] = 'd4e5f6a7b8c9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

BRANCHES = ("WING_TSUN", "ESCRIMA")
GRADE_1_REQUIRED_HOURS = 54


def upgrade() -> None:
    conn = op.get_bind()

    students = conn.execute(sa.text("SELECT id FROM students")).fetchall()
    now = datetime.now(timezone.utc)

    for (student_id,) in students:
        existing = conn.execute(
            sa.text("SELECT branch FROM student_progress WHERE student_id = :sid"),
            {"sid": student_id},
        ).fetchall()
        existing_branches = {row[0] for row in existing}

        for branch in BRANCHES:
            if branch in existing_branches:
                continue
            conn.execute(
                sa.text(
                    """
                    INSERT INTO student_progress
                        (id, student_id, branch, current_grade, completed_hours, remaining_hours, created_at, updated_at)
                    VALUES
                        (:id, :sid, :branch, 1, 0, :remaining, :now, :now)
                    """
                ),
                {
                    "id": str(uuid.uuid4()),
                    "sid": student_id,
                    "branch": branch,
                    "remaining": GRADE_1_REQUIRED_HOURS,
                    "now": now,
                },
            )


def downgrade() -> None:
    # Tek seferlik veri tamamlama - hangi kayitlarin bu migration tarafindan
    # eklendigi ile onceden var olanlar ayirt edilemiyor, guvenli bir
    # downgrade yok. Kasitli olarak no-op.
    pass
