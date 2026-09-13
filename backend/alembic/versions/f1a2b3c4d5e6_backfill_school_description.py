"""backfill_school_description

Revision ID: f1a2b3c4d5e6
Revises: e5f6a7b8c9d0
Create Date: 2026-09-13 00:00:00.000000

Bazi okullar (ornegin Kadikoy) ders saatleri gibi bilgiyi yalnizca
`long_description` alaninda tutuyordu, `description` bos kaliyordu.
`description` panel icindeki (USER/MEMBER) Okullar listesinde
gosterilen kisa alan oldugundan, bu okullarin ders bilgisi uygulama
icinde hic gorunmuyordu (sadece tanitim sitesinde `long_description
|| description` fallback'i sayesinde gorunuyordu). Bu migration,
`description` bos olup `long_description` dolu olan okullarda
icerigi `description`'a da kopyalayarak iki alani tutarli hale
getirir; `long_description` degistirilmez.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f1a2b3c4d5e6'
down_revision: Union[str, None] = 'e5f6a7b8c9d0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    conn.execute(
        sa.text(
            """
            UPDATE schools
            SET description = long_description
            WHERE (description IS NULL OR description = '')
              AND long_description IS NOT NULL
              AND long_description != ''
            """
        )
    )


def downgrade() -> None:
    # Tek seferlik veri tamamlama - hangi kayitlarin bu migration tarafindan
    # doldurulup hangilerinin zaten dolu oldugu ayirt edilemiyor, guvenli
    # bir downgrade yok. Kasitli olarak no-op.
    pass
