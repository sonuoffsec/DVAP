from __future__ import annotations

import uuid
from enum import StrEnum

from sqlalchemy import ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKey


class MitreStage(StrEnum):
    INITIAL_ACCESS = "initial_access"
    EXECUTION = "execution"
    PERSISTENCE = "persistence"
    PRIVILEGE_ESCALATION = "privilege_escalation"
    DEFENSE_EVASION = "defense_evasion"
    DISCOVERY = "discovery"
    COLLECTION = "collection"
    EXFILTRATION = "exfiltration"


class StepResult(StrEnum):
    SUCCESS = "success"
    PARTIAL = "partial"
    FAILED = "failed"
    PENDING = "pending"


class CampaignStatus(StrEnum):
    DRAFT = "draft"
    ACTIVE = "active"
    COMPLETED = "completed"


class AttackCampaign(Base, UUIDPrimaryKey, TimestampMixin):
    __tablename__ = "attack_campaigns"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    lab_slug: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default=CampaignStatus.DRAFT
    )
    tags: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)

    steps: Mapped[list[AttackStep]] = relationship(
        back_populates="campaign",
        cascade="all, delete-orphan",
        order_by="AttackStep.sequence",
    )


class AttackStep(Base, UUIDPrimaryKey, TimestampMixin):
    __tablename__ = "attack_steps"

    campaign_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("attack_campaigns.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    sequence: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    mitre_stage: Mapped[str] = mapped_column(String(50), nullable=False)
    technique: Mapped[str] = mapped_column(String(255), nullable=False)
    technique_id: Mapped[str | None] = mapped_column(String(50), nullable=True)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    tool_used: Mapped[str | None] = mapped_column(String(255), nullable=True)
    payload: Mapped[str | None] = mapped_column(Text, nullable=True)
    evidence: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    result: Mapped[str] = mapped_column(
        String(20), nullable=False, default=StepResult.PENDING
    )
    flag_captured: Mapped[str | None] = mapped_column(String(255), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    campaign: Mapped[AttackCampaign] = relationship(back_populates="steps")
