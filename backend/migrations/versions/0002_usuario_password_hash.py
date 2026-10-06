"""usuario_sistema.password_hash

Revision ID: 0002
Revises: 0001
"""
from alembic import op
import sqlalchemy as sa

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    columnas = [c["name"] for c in sa.inspect(op.get_bind()).get_columns("usuario_sistema")]
    if "password_hash" not in columnas:
        op.add_column("usuario_sistema", sa.Column("password_hash", sa.String(length=255), nullable=True))


def downgrade() -> None:
    op.drop_column("usuario_sistema", "password_hash")
