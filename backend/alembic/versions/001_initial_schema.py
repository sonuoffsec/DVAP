"""initial schema

Revision ID: 001
Revises:
Create Date: 2026-06-02 00:00:00.000000
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "labs",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("slug", sa.String(100), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text, nullable=False),
        sa.Column("category", sa.String(50), nullable=False),
        sa.Column("difficulty", sa.String(20), nullable=False),
        sa.Column("version", sa.String(20), nullable=False, server_default="1.0.0"),
        sa.Column("author", sa.String(255), nullable=True),
        sa.Column("objectives", postgresql.JSONB, nullable=False, server_default="[]"),
        sa.Column("tags", postgresql.JSONB, nullable=False, server_default="[]"),
        sa.Column("architecture", postgresql.JSONB, nullable=True),
        sa.Column("threat_model", postgresql.JSONB, nullable=True),
        sa.Column("attack_surface", postgresql.JSONB, nullable=False, server_default="[]"),
        sa.Column("mitigations", postgresql.JSONB, nullable=False, server_default="[]"),
        sa.Column("detection_opportunities", postgresql.JSONB, nullable=False, server_default="[]"),
        sa.Column("is_published", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("sort_order", sa.Integer, nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("slug"),
    )
    op.create_index("ix_labs_slug", "labs", ["slug"])
    op.create_index("ix_labs_category", "labs", ["category"])
    op.create_index("ix_labs_difficulty", "labs", ["difficulty"])
    op.create_index("ix_labs_category_difficulty", "labs", ["category", "difficulty"])

    op.create_table(
        "challenges",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("lab_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("slug", sa.String(100), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text, nullable=False),
        sa.Column("difficulty", sa.String(20), nullable=False),
        sa.Column("points", sa.Integer, nullable=False, server_default="100"),
        sa.Column("flag", sa.String(255), nullable=False),
        sa.Column("hints", postgresql.JSONB, nullable=False, server_default="[]"),
        sa.Column("walkthrough", sa.Text, nullable=True),
        sa.Column("sort_order", sa.Integer, nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["lab_id"], ["labs.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_challenges_lab_id", "challenges", ["lab_id"])
    op.create_index("ix_challenges_lab_slug", "challenges", ["lab_id", "slug"], unique=True)

    op.create_table(
        "lab_instances",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("lab_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("session_token", sa.String(64), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="stopped"),
        sa.Column("container_id", sa.String(128), nullable=True),
        sa.Column("port_mappings", postgresql.JSONB, nullable=False, server_default="{}"),
        sa.Column("flags_captured", postgresql.JSONB, nullable=False, server_default="[]"),
        sa.Column("started_at", sa.String(50), nullable=True),
        sa.Column("stopped_at", sa.String(50), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["lab_id"], ["labs.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("session_token"),
    )
    op.create_index("ix_lab_instances_lab_id", "lab_instances", ["lab_id"])
    op.create_index("ix_lab_instances_session_token", "lab_instances", ["session_token"])
    op.create_index("ix_lab_instances_status", "lab_instances", ["status"])

    op.create_table(
        "flag_submissions",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("challenge_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("session_token", sa.String(64), nullable=False),
        sa.Column("submitted_flag", sa.String(255), nullable=False),
        sa.Column("is_correct", sa.Boolean, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["challenge_id"], ["challenges.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_flag_submissions_challenge_id", "flag_submissions", ["challenge_id"])
    op.create_index("ix_flag_submissions_session_token", "flag_submissions", ["session_token"])

    op.create_table(
        "findings",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column("description", sa.Text, nullable=False),
        sa.Column("severity", sa.String(20), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="open"),
        sa.Column("lab_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("session_token", sa.String(64), nullable=True),
        sa.Column("attack_vector", sa.String(255), nullable=True),
        sa.Column("evidence", postgresql.JSONB, nullable=False, server_default="{}"),
        sa.Column("owasp_categories", postgresql.JSONB, nullable=False, server_default="[]"),
        sa.Column("mitre_atlas", postgresql.JSONB, nullable=False, server_default="[]"),
        sa.Column("cwe", postgresql.JSONB, nullable=False, server_default="[]"),
        sa.Column("remediation", sa.Text, nullable=True),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["lab_id"], ["labs.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_findings_severity", "findings", ["severity"])
    op.create_index("ix_findings_status", "findings", ["status"])
    op.create_index("ix_findings_lab_id", "findings", ["lab_id"])

    op.create_table(
        "research_sessions",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("lab_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("model", sa.String(100), nullable=True),
        sa.Column("tags", postgresql.JSONB, nullable=False, server_default="[]"),
        sa.Column("is_archived", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["lab_id"], ["labs.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "prompt_traces",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("session_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("event_type", sa.String(30), nullable=False),
        sa.Column("sequence", sa.Integer, nullable=False, server_default="0"),
        sa.Column("content", sa.Text, nullable=False),
        sa.Column("metadata", postgresql.JSONB, nullable=False, server_default="{}"),
        sa.Column("token_count", sa.Integer, nullable=True),
        sa.Column("latency_ms", sa.Integer, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["session_id"], ["research_sessions.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_prompt_traces_session_id", "prompt_traces", ["session_id"])
    op.create_index("ix_prompt_traces_event_type", "prompt_traces", ["event_type"])


def downgrade() -> None:
    op.drop_table("prompt_traces")
    op.drop_table("research_sessions")
    op.drop_table("findings")
    op.drop_table("flag_submissions")
    op.drop_table("lab_instances")
    op.drop_table("challenges")
    op.drop_table("labs")
