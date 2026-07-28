"""actor_fk_set_null_on_user_delete

Revision ID: d4e5f6a7b8c9
Revises: c1a2b3d4e5f6
Create Date: 2026-07-28 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd4e5f6a7b8c9'
down_revision: Union[str, None] = 'c1a2b3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# (table, column, already_nullable_before_this_migration)
FK_TARGETS = [
    ("audit_logs", "performed_by", False),
    ("email_logs", "sent_by", False),
    ("events", "created_by", False),
    ("seminar_evaluations", "evaluated_by", False),
    ("lessons", "created_by", False),
    ("lesson_schedules", "created_by", False),
    ("media", "uploaded_by", False),
    ("grade_change_requests", "requested_by", False),
    ("grade_change_requests", "handled_by", True),
    ("requests", "handled_by", True),
    ("enrollments", "handled_by", True),
]

NAMING_CONVENTION = {"fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s"}


def _fk_name(table: str, column: str) -> str:
    return f"fk_{table}_{column}_users"


def upgrade() -> None:
    bind = op.get_bind()
    is_sqlite = bind.dialect.name == "sqlite"

    for table, column, already_nullable in FK_TARGETS:
        fk_name = _fk_name(table, column)
        if is_sqlite:
            with op.batch_alter_table(table, naming_convention=NAMING_CONVENTION) as batch_op:
                if not already_nullable:
                    batch_op.alter_column(column, existing_type=sa.String(length=36), nullable=True)
                batch_op.drop_constraint(fk_name, type_="foreignkey")
                batch_op.create_foreign_key(fk_name, "users", [column], ["id"], ondelete="SET NULL")
        else:
            if not already_nullable:
                op.alter_column(table, column, existing_type=sa.String(length=36), nullable=True)
            op.drop_constraint(f"{table}_{column}_fkey", table, type_="foreignkey")
            op.create_foreign_key(fk_name, table, "users", [column], ["id"], ondelete="SET NULL")


def downgrade() -> None:
    bind = op.get_bind()
    is_sqlite = bind.dialect.name == "sqlite"

    for table, column, already_nullable in FK_TARGETS:
        fk_name = _fk_name(table, column)
        if is_sqlite:
            with op.batch_alter_table(table, naming_convention=NAMING_CONVENTION) as batch_op:
                batch_op.drop_constraint(fk_name, type_="foreignkey")
                batch_op.create_foreign_key(fk_name, "users", [column], ["id"])
                if not already_nullable:
                    batch_op.alter_column(column, existing_type=sa.String(length=36), nullable=False)
        else:
            op.drop_constraint(fk_name, table, type_="foreignkey")
            op.create_foreign_key(f"{table}_{column}_fkey", table, "users", [column], ["id"])
            if not already_nullable:
                op.alter_column(table, column, existing_type=sa.String(length=36), nullable=False)
