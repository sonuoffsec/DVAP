from __future__ import annotations

import uuid
from datetime import datetime
from enum import StrEnum

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKey


class LabDifficulty(StrEnum):
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"
    EXPERT = "expert"


class LabCategory(StrEnum):
    PROMPT_INJECTION = "prompt_injection"
    MEMORY_POISONING = "memory_poisoning"
    RAG_POISONING = "rag_poisoning"
    TOOL_INJECTION = "tool_injection"
    MCP_SECURITY = "mcp_security"
    BROWSER_AGENT = "browser_agent"
    MULTI_AGENT = "multi_agent"
    BANKING = "banking"
    SUPPLY_CHAIN = "supply_chain"
    AUTONOMOUS_AGENT = "autonomous_agent"
    DATA_EXFILTRATION = "data_exfiltration"
    IDENTITY_TRUST = "identity_trust"
    MULTI_TENANT = "multi_tenant"
    HEALTHCARE = "healthcare"
    DEVELOPER_PLATFORM = "developer_platform"


class InstanceStatus(StrEnum):
    STARTING = "starting"
    RUNNING = "running"
    STOPPING = "stopping"
    STOPPED = "stopped"
    ERROR = "error"


class Lab(Base, UUIDPrimaryKey, TimestampMixin):
    __tablename__ = "labs"

    slug: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    difficulty: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    version: Mapped[str] = mapped_column(String(20), nullable=False, default="1.0.0")
    author: Mapped[str | None] = mapped_column(String(255), nullable=True)
    objectives: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    tags: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    architecture: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    threat_model: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    attack_surface: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    mitigations: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    detection_opportunities: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    is_published: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    challenges: Mapped[list[Challenge]] = relationship(
        back_populates="lab",
        cascade="all, delete-orphan",
        order_by="Challenge.sort_order",
    )
    instances: Mapped[list[LabInstance]] = relationship(
        back_populates="lab",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        Index("ix_labs_category_difficulty", "category", "difficulty"),
    )


class Challenge(Base, UUIDPrimaryKey, TimestampMixin):
    __tablename__ = "challenges"

    lab_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("labs.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    slug: Mapped[str] = mapped_column(String(100), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    difficulty: Mapped[str] = mapped_column(String(20), nullable=False)
    points: Mapped[int] = mapped_column(Integer, nullable=False, default=100)
    flag: Mapped[str] = mapped_column(String(255), nullable=False)
    hints: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    walkthrough: Mapped[str | None] = mapped_column(Text, nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    lab: Mapped[Lab] = relationship(back_populates="challenges")
    submissions: Mapped[list[FlagSubmission]] = relationship(
        back_populates="challenge",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        Index("ix_challenges_lab_slug", "lab_id", "slug", unique=True),
    )


class LabInstance(Base, UUIDPrimaryKey, TimestampMixin):
    __tablename__ = "lab_instances"

    lab_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("labs.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    session_token: Mapped[str] = mapped_column(String(64), nullable=False, unique=True, index=True)
    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default=InstanceStatus.STOPPED,
        index=True,
    )
    container_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    port_mappings: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    flags_captured: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    stopped_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    lab: Mapped[Lab] = relationship(back_populates="instances")


class FlagSubmission(Base, UUIDPrimaryKey, TimestampMixin):
    __tablename__ = "flag_submissions"

    challenge_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("challenges.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    session_token: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    submitted_flag: Mapped[str] = mapped_column(String(255), nullable=False)
    is_correct: Mapped[bool] = mapped_column(Boolean, nullable=False)

    challenge: Mapped[Challenge] = relationship(back_populates="submissions")
