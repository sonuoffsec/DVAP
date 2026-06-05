from __future__ import annotations

from fastapi import APIRouter, Query

from app.core.database import DbSession
from app.services import soc_service

router = APIRouter()


@router.get("/events")
async def list_events(
    db: DbSession,
    limit: int = Query(50, le=200),
    severity: str | None = Query(None),
    event_type: str | None = Query(None),
    lab_slug: str | None = Query(None),
) -> list[dict]:
    events = await soc_service.list_events(
        db,
        limit=limit,
        severity=severity,
        event_type=event_type,
        lab_slug=lab_slug,
    )
    return [
        {
            "id": str(e.id),
            "event_type": e.event_type,
            "severity": e.severity,
            "title": e.title,
            "description": e.description,
            "source": e.source,
            "lab_slug": e.lab_slug,
            "session_token": e.session_token[:8] + "..." if e.session_token else None,
            "metadata": e.metadata_,
            "created_at": e.created_at.isoformat(),
        }
        for e in events
    ]


@router.get("/stats")
async def get_stats(db: DbSession) -> dict:
    return await soc_service.get_stats(db)
