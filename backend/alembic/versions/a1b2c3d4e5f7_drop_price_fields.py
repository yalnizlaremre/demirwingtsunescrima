"""drop_price_fields

Revision ID: a1b2c3d4e5f7
Revises: f1a2b3c4d5e6
Create Date: 2026-09-14 00:00:00.000000

Kullanici sitede fiyat gosterilen tum yerlerin kaldirilmasini istedi.
`products.price`, `events.wt_fee`, `events.escrima_fee` kolonlari
(ve icindeki veri) kalici olarak siliniyor.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f7'
down_revision: Union[str, None] = 'f1a2b3c4d5e6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_column('products', 'price')
    op.drop_column('events', 'wt_fee')
    op.drop_column('events', 'escrima_fee')


def downgrade() -> None:
    op.add_column('products', sa.Column('price', sa.Numeric(10, 2), nullable=True))
    op.add_column('events', sa.Column('wt_fee', sa.Numeric(10, 2), nullable=True))
    op.add_column('events', sa.Column('escrima_fee', sa.Numeric(10, 2), nullable=True))
