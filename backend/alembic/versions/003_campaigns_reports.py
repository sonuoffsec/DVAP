"""attack campaigns and reports

Revision ID: 003
Revises: 002
Create Date: 2026-06-03 00:00:00.000000
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "003"
down_revision = "002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "attack_campaigns",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("lab_slug", sa.String(100), nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="draft"),
        sa.Column("tags", postgresql.JSONB, nullable=False, server_default="[]"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_attack_campaigns_lab_slug", "attack_campaigns", ["lab_slug"])
    op.create_index("ix_attack_campaigns_status", "attack_campaigns", ["status"])

    op.create_table(
        "attack_steps",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("campaign_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("sequence", sa.Integer, nullable=False, server_default="0"),
        sa.Column("mitre_stage", sa.String(50), nullable=False),
        sa.Column("technique", sa.String(255), nullable=False),
        sa.Column("technique_id", sa.String(50), nullable=True),
        sa.Column("description", sa.Text, nullable=False),
        sa.Column("tool_used", sa.String(255), nullable=True),
        sa.Column("payload", sa.Text, nullable=True),
        sa.Column("evidence", postgresql.JSONB, nullable=False, server_default="{}"),
        sa.Column("result", sa.String(20), nullable=False, server_default="pending"),
        sa.Column("flag_captured", sa.String(255), nullable=True),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["campaign_id"], ["attack_campaigns.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_attack_steps_campaign_id", "attack_steps", ["campaign_id"])

    op.create_table(
        "reports",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("report_type", sa.String(30), nullable=False),
        sa.Column("lab_slug", sa.String(100), nullable=True),
        sa.Column("risk_rating", sa.String(20), nullable=True),
        sa.Column("content_md", sa.Text, nullable=False),
        sa.Column("content_json", postgresql.JSONB, nullable=False, server_default="{}"),
        sa.Column("owasp_mapping", postgresql.JSONB, nullable=False, server_default="[]"),
        sa.Column("mitre_mapping", postgresql.JSONB, nullable=False, server_default="[]"),
        sa.Column("findings_count", sa.Integer, nullable=False, server_default="0"),
        sa.Column("tags", postgresql.JSONB, nullable=False, server_default="[]"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_reports_report_type", "reports", ["report_type"])
    op.create_index("ix_reports_lab_slug", "reports", ["lab_slug"])


def downgrade() -> None:
    op.drop_table("reports")
    op.drop_table("attack_steps")
    op.drop_table("attack_campaigns")
