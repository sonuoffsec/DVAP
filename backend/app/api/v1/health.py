from __future__ import annotations

from datetime import UTC, datetime

import httpx
from fastapi import APIRouter, status
from fastapi.responses import ORJSONResponse
from sqlalchemy import text

from app.core.config import settings
from app.core.database import DbSession
from app.core.redis import RedisClient
from app.services import ollama_service

router = APIRouter()


async def _check_qdrant() -> dict:
    base_url = str(settings.qdrant_url).rstrip("/")
    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            resp = await client.get(f"{base_url}/healthz")
            resp.raise_for_status()
            info = await client.get(f"{base_url}/")
            version = info.json().get("version") if info.status_code == 200 else None
        return {"status": "up", "version": version}
    except Exception as exc:
        return {"status": "down", "error": str(exc)}


@router.get(
    "",
    summary="Platform health check",
    response_class=ORJSONResponse,
)
async def health(db: DbSession, redis: RedisClient) -> ORJSONResponse:
    checks: dict[str, dict] = {}
    overall = "healthy"

    try:
        await db.execute(text("SELECT 1"))
        checks["postgres"] = {"status": "up"}
    except Exception as exc:
        checks["postgres"] = {"status": "down", "error": str(exc)}
        overall = "degraded"

    try:
        await redis.ping()
        checks["redis"] = {"status": "up"}
    except Exception as exc:
        checks["redis"] = {"status": "down", "error": str(exc)}
        overall = "degraded"

    checks["qdrant"] = await _check_qdrant()
    if checks["qdrant"]["status"] != "up":
        overall = "degraded"

    ollama = await ollama_service.get_status()
    checks["ollama"] = {
        "status": "up" if ollama.reachable else "down",
        "version": ollama.version,
        "model_count": len(ollama.models),
    }
    if not ollama.reachable:
        overall = "degraded"

    http_status = status.HTTP_200_OK if overall == "healthy" else status.HTTP_207_MULTI_STATUS

    return ORJSONResponse(
        content={
            "status": overall,
            "timestamp": datetime.now(UTC).isoformat(),
            "services": checks,
        },
        status_code=http_status,
    )


@router.get("/ping", include_in_schema=False)
async def ping() -> dict:
    return {"pong": True}
