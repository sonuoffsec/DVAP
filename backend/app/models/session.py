from __future__ import annotations

import uuid
from enum import StrEnum

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKey


class TraceEventType(StrEnum):
    USER_PROMPT = "user_prompt"
    SYSTEM_PROMPT = "system_prompt"
    LLM_RESPONSE = "llm_response"
    TOOL_CALL = "tool_call"
    TOOL_RESULT = "tool_result"
    MEMORY_READ = "memory_read"
    MEMORY_WRITE = "memory_write"
    RAG_QUERY = "rag_query"
    RAG_RESULT = "rag_result"
    AGENT_DECISION = "agent_decision"
    ERROR = "error"


class ResearchSession(Base, UUIDPrimaryKey, TimestampMixin):
    __tablename__ = "research_sessions"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    lab_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("labs.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    model: Mapped[str | None] = mapped_column(String(100), nullable=True)
    tags: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    is_archived: Mapped[bool] = mapped_column(default=False, nullable=False)

    traces: Mapped[list[PromptTrace]] = relationship(
        back_populates="session",
        cascade="all, delete-orphan",
        order_by="PromptTrace.created_at",
    )


class PromptTrace(Base, UUIDPrimaryKey, TimestampMixin):
    __tablename__ = "prompt_traces"

    session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("research_sessions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    event_type: Mapped[str] = mapped_column(String(30), nullable=False, index=True)
    sequence: Mapped[int] = mapped_column(nullable=False, default=0)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    metadata_: Mapped[dict] = mapped_column("metadata", JSONB, nullable=False, default=dict)
    token_count: Mapped[int | None] = mapped_column(nullable=True)
    latency_ms: Mapped[int | None] = mapped_column(nullable=True)

    session: Mapped[ResearchSession] = relationship(back_populates="traces")
