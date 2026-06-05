from __future__ import annotations

from enum import StrEnum

from sqlalchemy import String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDPrimaryKey


class ReportType(StrEnum):
    EXECUTIVE = "executive"
    TECHNICAL = "technical"
    THREAT_MODEL = "threat_model"
    BENCHMARK = "benchmark"


class RiskRating(StrEnum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFORMATIONAL = "informational"


class Report(Base, UUIDPrimaryKey, TimestampMixin):
    __tablename__ = "reports"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    report_type: Mapped[str] = mapped_column(String(30), nullable=False, index=True)
    lab_slug: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)
    risk_rating: Mapped[str | None] = mapped_column(String(20), nullable=True)
    content_md: Mapped[str] = mapped_column(Text, nullable=False)
    content_html: Mapped[str] = mapped_column(Text, nullable=False, default="")
    content_json: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    owasp_mapping: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    mitre_mapping: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    findings_count: Mapped[int] = mapped_column(default=0, nullable=False)
    tags: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
