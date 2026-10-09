"""kadikoy_ders_saatleri

Revision ID: d4e5f6a7b8ca
Revises: c3d4e5f6a7b9
Create Date: 2026-10-09 00:00:00.000000

Kadikoy Okulu'nun ders saatleri iki alanda farkli yaziyordu: panelde gosterilen
`description` "Pazartesi ve Cuma 21:00-23:00", tanitim sitesinde gosterilen
`long_description` "Sali ve Persembe 21:00-23:00". Kullanicinin teyit ettigi
dogru bilgi (2026-10-09): Sali ve Persembe 21:00-22:30.

Ders bilgisi artik tek kaynaktan (`description`) gosteriliyor; `long_description`
sadece ek tanitim metni (bkz. frontend-public Okullar.jsx). Bu yuzden Kadikoy'un
`long_description`'i (ayni bilginin eski kopyasi) bosaltilir.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'd4e5f6a7b8ca'
down_revision: Union[str, None] = 'c3d4e5f6a7b9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

NEW_DESCRIPTION = "Ders saatleri Salı ve Perşembe günleri saat 21:00 ile 22:30 arasında"


def upgrade() -> None:
    op.get_bind().execute(
        sa.text(
            "UPDATE schools SET description = :d, long_description = '' "
            "WHERE name = 'Kadıköy Okulu'"
        ),
        {"d": NEW_DESCRIPTION},
    )


def downgrade() -> None:
    pass
