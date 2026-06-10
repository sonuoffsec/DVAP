from __future__ import annotations

import secrets
import uuid

from fastapi import APIRouter, HTTPException, status

from app.core.database import DbSession
from app.core.redis import RedisClient
from app.models.soc import EventSeverity, EventType
from app.schemas.instance import InstanceLogsResponse, InstanceResponse, LaunchRequest
from app.services import instance_service, lab_service, rate_limiter, soc_service

router = APIRouter()


def _build_response(instance, host: str = "localhost") -> InstanceResponse:
    port = instance.port_mappings.get("app")
    access_url = f"http://{host}:{port}" if port else None
    resp = InstanceResponse.model_validate(instance)
    return resp.model_copy(update={"access_url": access_url})


@router.get("/running")
async def running_instances(db: DbSession) -> list[dict]:
    from sqlalchemy import select
    from app.models.lab import InstanceStatus, Lab, LabInstance
    stmt = (
        select(Lab.slug, LabInstance.session_token)
        .join(Lab, Lab.id == LabInstance.lab_id)
        .where(LabInstance.status == InstanceStatus.RUNNING)
    )
    result = await db.execute(stmt)
    return [{"slug": row.slug, "session_token": row.session_token} for row in result.all()]


@router.post("/{slug}/launch", response_model=InstanceResponse, status_code=status.HTTP_201_CREATED)
async def launch_lab(db: DbSession, redis: RedisClient, slug: str, body: LaunchRequest) -> InstanceResponse:
    lab = await lab_service.get_lab_by_slug(db, slug)
    if lab is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lab not found")

    session_token = body.session_token or secrets.token_hex(32)

    existing = await instance_service.get_active_instance(db, lab.id, session_token)
    if existing:
        return _build_response(existing)

    try:
        instance = await instance_service.launch_instance(db, lab, session_token)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to launch lab: {exc}",
        )

    await rate_limiter.register_instance(redis, session_token)

    await soc_service.emit(
        db,
        event_type=EventType.LAB_LAUNCHED,
        severity=EventSeverity.INFO,
        title=f"Lab launched: {lab.name}",
        source="lab-manager",
        lab_slug=lab.slug,
        session_token=session_token,
        metadata={"port": instance.port_mappings.get("app")},
    )

    return _build_response(instance)


@router.get("/{slug}/instance/{session_token}", response_model=InstanceResponse)
async def get_instance(db: DbSession, slug: str, session_token: str) -> InstanceResponse:
    lab = await lab_service.get_lab_by_slug(db, slug)
    if lab is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lab not found")

    instance = await instance_service.get_active_instance(db, lab.id, session_token)
    if instance is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No active instance")

    return _build_response(instance)


@router.post("/{slug}/instance/{session_token}/stop", response_model=InstanceResponse)
async def stop_instance(db: DbSession, redis: RedisClient, slug: str, session_token: str) -> InstanceResponse:
    lab = await lab_service.get_lab_by_slug(db, slug)
    if lab is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lab not found")

    instance = await instance_service.get_active_instance(db, lab.id, session_token)
    if instance is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No active instance")

    instance = await instance_service.stop_instance(db, instance)
    await rate_limiter.revoke_instance(redis, session_token)
    return _build_response(instance)


@router.post("/{slug}/instance/{session_token}/reset", response_model=InstanceResponse)
async def reset_instance(db: DbSession, slug: str, session_token: str) -> InstanceResponse:
    lab = await lab_service.get_lab_by_slug(db, slug)
    if lab is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lab not found")

    instance = await instance_service.get_active_instance(db, lab.id, session_token)
    if instance is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No active instance")

    new_instance = await instance_service.reset_instance(db, instance, lab)
    return _build_response(new_instance)


@router.post("/cleanup", summary="Stop all TTL-expired lab instances")
async def cleanup_expired(db: DbSession, redis: RedisClient) -> dict:
    expired = await rate_limiter.pop_expired_sessions(redis)
    stopped = 0
    for session_token in expired:
        from sqlalchemy import select
        from app.models.lab import LabInstance, InstanceStatus
        stmt = select(LabInstance).where(
            LabInstance.session_token == session_token,
            LabInstance.status == InstanceStatus.RUNNING,
        )
        result = await db.execute(stmt)
        instance = result.scalar_one_or_none()
        if instance:
            await instance_service.stop_instance(db, instance)
            stopped += 1
    return {"expired_found": len(expired), "stopped": stopped}


@router.get("/{slug}/instance/{session_token}/logs", response_model=InstanceLogsResponse)
async def get_logs(db: DbSession, slug: str, session_token: str) -> InstanceLogsResponse:
    lab = await lab_service.get_lab_by_slug(db, slug)
    if lab is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lab not found")

    instance = await instance_service.get_active_instance(db, lab.id, session_token)
    if instance is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No active instance")

    logs = await instance_service.get_container_logs(instance.container_id or "")
    return InstanceLogsResponse(logs=logs, container_id=instance.container_id or "")
