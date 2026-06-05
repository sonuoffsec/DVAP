"""soc events and benchmark runs

Revision ID: 002
Revises: 001
Create Date: 2026-06-03 00:00:00.000000
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "002"
down_revision = "001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "security_events",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("event_type", sa.String(50), nullable=False),
        sa.Column("severity", sa.String(20), nullable=False, server_default="info"),
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("source", sa.String(100), nullable=True),
        sa.Column("lab_slug", sa.String(100), nullable=True),
        sa.Column("session_token", sa.String(64), nullable=True),
        sa.Column("metadata", postgresql.JSONB, nullable=False, server_default="{}"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_security_events_event_type", "security_events", ["event_type"])
    op.create_index("ix_security_events_severity", "security_events", ["severity"])
    op.create_index("ix_security_events_lab_slug", "security_events", ["lab_slug"])
    op.create_index("ix_security_events_created_at", "security_events", ["created_at"])

    op.create_table(
        "benchmark_runs",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("model", sa.String(100), nullable=False),
        sa.Column("suite", sa.String(100), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="pending"),
        sa.Column("total_tests", sa.Integer, nullable=False, server_default="0"),
        sa.Column("passed_tests", sa.Integer, nullable=False, server_default="0"),
        sa.Column("failed_tests", sa.Integer, nullable=False, server_default="0"),
        sa.Column("security_score", sa.Float, nullable=True),
        sa.Column("results", postgresql.JSONB, nullable=False, server_default="[]"),
        sa.Column("error", sa.Text, nullable=True),
        sa.Column("started_at", sa.String(50), nullable=True),
        sa.Column("completed_at", sa.String(50), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_benchmark_runs_status", "benchmark_runs", ["status"])


def downgrade() -> None:
    op.drop_table("benchmark_runs")
    op.drop_table("security_events")
