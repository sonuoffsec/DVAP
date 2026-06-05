"""fix lab_instances started_at and stopped_at to timestamptz

Revision ID: 004
Revises: 003
Create Date: 2026-06-04 00:00:00.000000
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "004"
down_revision = "003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column(
        "lab_instances",
        "started_at",
        type_=sa.DateTime(timezone=True),
        existing_type=sa.String(50),
        existing_nullable=True,
        postgresql_using="started_at::timestamptz",
    )
    op.alter_column(
        "lab_instances",
        "stopped_at",
        type_=sa.DateTime(timezone=True),
        existing_type=sa.String(50),
        existing_nullable=True,
        postgresql_using="stopped_at::timestamptz",
    )


def downgrade() -> None:
    op.alter_column(
        "lab_instances",
        "started_at",
        type_=sa.String(50),
        existing_type=sa.DateTime(timezone=True),
        existing_nullable=True,
        postgresql_using="started_at::text",
    )
    op.alter_column(
        "lab_instances",
        "stopped_at",
        type_=sa.String(50),
        existing_type=sa.DateTime(timezone=True),
        existing_nullable=True,
        postgresql_using="stopped_at::text",
    )
