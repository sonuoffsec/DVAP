"""add content_html to reports

Revision ID: 005
Revises: 004
Create Date: 2026-06-04 00:00:00.000000
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "005"
down_revision = "004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "reports",
        sa.Column("content_html", sa.Text, nullable=False, server_default=""),
    )


def downgrade() -> None:
    op.drop_column("reports", "content_html")
