"""clear_invalid_media_urls

Revision ID: b2c3d4e5f6a8
Revises: a1b2c3d4e5f7
Create Date: 2026-10-08 00:00:00.000000

Okul kapak gorseli ve site icerigi gorseli alanlari serbest metin oldugu icin
prod'da Tekirdag Okulu'nun kapak gorseline yerel bir Windows dosya yolu
(C:\\Users\\...) kaydedilmisti; tanitim sitesinde kirik gorsel olarak
gorunuyordu. Artik bu alanlar API seviyesinde dogrulaniyor
(app/schemas/validators.py). Bu migration mevcut gecersiz degerleri (ne
'/uploads/' ne de 'http' ile baslayanlari) bosaltir; boylece site kirik gorsel
yerine yedek gorunumu gosterir ve panelden yeniden yukleme yapilabilir.
Downgrade veri geri getirmez (zaten calismayan yerel yollardi).
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'b2c3d4e5f6a8'
down_revision: Union[str, None] = 'a1b2c3d4e5f7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _clear(table: str, column: str) -> None:
    op.get_bind().execute(
        sa.text(
            f"""
            UPDATE {table}
            SET {column} = ''
            WHERE {column} IS NOT NULL
              AND {column} != ''
              AND {column} NOT LIKE '/uploads/%'
              AND {column} NOT LIKE 'http://%'
              AND {column} NOT LIKE 'https://%'
            """
        )
    )


def upgrade() -> None:
    _clear("schools", "cover_image_url")
    _clear("site_contents", "image_url")


def downgrade() -> None:
    pass
