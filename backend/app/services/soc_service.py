from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.soc import EventSeverity, EventType, SecurityEvent

INJECTION_PATTERNS = [
    "ignore previous instructions",
    "ignore all instructions",
    "disregard your",
    "you are now",
    "pretend you are",
    "act as",
    "jailbreak",
    "dan mode",
    "do anything now",
    "reveal your system prompt",
    "show me your instructions",
    "what are your instructions",
    "forget your instructions",
    "override your instructions",
]


async def emit(
    db: AsyncSession,
    *,
    event_type: str,
    title: str,
    severity: str = EventSeverity.INFO,
    description: str | None = None,
    source: str | None = None,
    lab_slug: str | None = None,
    session_token: str | None = None,
    metadata: dict | None = None,
) -> SecurityEvent:
    event = SecurityEvent(
        event_type=event_type,
        severity=severity,
        title=title,
        description=description,
        source=source,
        lab_slug=lab_slug,
        session_token=session_token,
        metadata_=metadata or {},
    )
    db.add(event)
    await db.commit()
    await db.refresh(event)
    return event


def detect_injection(text: str) -> str | None:
    lower = text.lower()
    for pattern in INJECTION_PATTERNS:
        if pattern in lower:
            return pattern
    return None


async def scan_prompt(
    db: AsyncSession,
    prompt: str,
    source: str,
    session_token: str | None = None,
    lab_slug: str | None = None,
) -> str | None:
    pattern = detect_injection(prompt)
    if pattern:
        await emit(
            db,
            event_type=EventType.INJECTION_DETECTED,
            severity=EventSeverity.HIGH,
            title=f"Prompt injection pattern detected: '{pattern}'",
            description=f"Suspicious pattern found in prompt from {source}",
            source=source,
            lab_slug=lab_slug,
            session_token=session_token,
            metadata={"pattern": pattern, "prompt_preview": prompt[:200]},
        )
    return pattern


async def list_events(
    db: AsyncSession,
    *,
    limit: int = 100,
    severity: str | None = None,
    event_type: str | None = None,
    lab_slug: str | None = None,
) -> list[SecurityEvent]:
    stmt = select(SecurityEvent).order_by(SecurityEvent.created_at.desc()).limit(limit)
    if severity:
        stmt = stmt.where(SecurityEvent.severity == severity)
    if event_type:
        stmt = stmt.where(SecurityEvent.event_type == event_type)
    if lab_slug:
        stmt = stmt.where(SecurityEvent.lab_slug == lab_slug)
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_stats(db: AsyncSession) -> dict:
    from sqlalchemy import func
    total = await db.scalar(select(func.count(SecurityEvent.id))) or 0
    by_severity = await db.execute(
        select(SecurityEvent.severity, func.count(SecurityEvent.id))
        .group_by(SecurityEvent.severity)
    )
    by_type = await db.execute(
        select(SecurityEvent.event_type, func.count(SecurityEvent.id))
        .group_by(SecurityEvent.event_type)
    )
    return {
        "total": total,
        "by_severity": dict(by_severity.all()),
        "by_type": dict(by_type.all()),
    }
