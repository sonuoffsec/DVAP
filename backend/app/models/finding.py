from __future__ import annotations

import uuid
from enum import StrEnum

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKey


class Severity(StrEnum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFORMATIONAL = "informational"


class FindingStatus(StrEnum):
    OPEN = "open"
    IN_REVIEW = "in_review"
    MITIGATED = "mitigated"
    ACCEPTED = "accepted"
    FALSE_POSITIVE = "false_positive"


class Finding(Base, UUIDPrimaryKey, TimestampMixin):
    __tablename__ = "findings"

    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    severity: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default=FindingStatus.OPEN,
        index=True,
    )
    lab_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("labs.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    session_token: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    attack_vector: Mapped[str | None] = mapped_column(String(255), nullable=True)
    evidence: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    owasp_categories: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    mitre_atlas: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    cwe: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    remediation: Mapped[str | None] = mapped_column(Text, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
