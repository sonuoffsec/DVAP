from __future__ import annotations

from enum import StrEnum

from sqlalchemy import String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDPrimaryKey


class EventSeverity(StrEnum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFO = "info"


class EventType(StrEnum):
    LAB_LAUNCHED = "lab_launched"
    LAB_STOPPED = "lab_stopped"
    FLAG_CAPTURED = "flag_captured"
    FLAG_FAILED = "flag_failed"
    INJECTION_DETECTED = "injection_detected"
    BENCHMARK_STARTED = "benchmark_started"
    BENCHMARK_COMPLETED = "benchmark_completed"
    MODEL_QUERIED = "model_queried"
    RESEARCH_SESSION = "research_session"
    ANOMALY_DETECTED = "anomaly_detected"


class SecurityEvent(Base, UUIDPrimaryKey, TimestampMixin):
    __tablename__ = "security_events"

    event_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    severity: Mapped[str] = mapped_column(String(20), nullable=False, index=True, default=EventSeverity.INFO)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    source: Mapped[str | None] = mapped_column(String(100), nullable=True)
    lab_slug: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)
    session_token: Mapped[str | None] = mapped_column(String(64), nullable=True)
    metadata_: Mapped[dict] = mapped_column("metadata", JSONB, nullable=False, default=dict)
