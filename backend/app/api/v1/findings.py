from __future__ import annotations

import uuid

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import select

from app.core.database import DbSession
from app.models.finding import Finding
from app.schemas.finding import FindingCreate, FindingResponse, FindingUpdate
from app.services import vector_service

router = APIRouter()


@router.get("", response_model=list[FindingResponse])
async def list_findings(
    db: DbSession,
    severity: str | None = Query(None),
    finding_status: str | None = Query(None, alias="status"),
    lab_id: uuid.UUID | None = Query(None),
) -> list[FindingResponse]:
    stmt = select(Finding).order_by(Finding.created_at.desc())

    if severity:
        stmt = stmt.where(Finding.severity == severity)
    if finding_status:
        stmt = stmt.where(Finding.status == finding_status)
    if lab_id:
        stmt = stmt.where(Finding.lab_id == lab_id)

    result = await db.execute(stmt)
    return [FindingResponse.model_validate(f) for f in result.scalars().all()]


@router.get("/search", summary="Semantic similarity search over findings")
async def search_findings(
    q: str = Query(..., min_length=3),
    lab_slug: str | None = Query(None),
    limit: int = Query(5, ge=1, le=20),
) -> list[dict]:
    return await vector_service.search_findings(q, limit=limit, lab_slug=lab_slug)


@router.post("", response_model=FindingResponse, status_code=status.HTTP_201_CREATED)
async def create_finding(db: DbSession, body: FindingCreate) -> FindingResponse:
    finding = Finding(**body.model_dump())
    db.add(finding)
    await db.commit()
    await db.refresh(finding)
    await vector_service.index_finding(
        finding_id=finding.id,
        title=finding.title,
        description=finding.description,
        severity=finding.severity,
        lab_slug=None,
        owasp_categories=finding.owasp_categories or [],
    )
    return FindingResponse.model_validate(finding)


@router.get("/{finding_id}", response_model=FindingResponse)
async def get_finding(db: DbSession, finding_id: uuid.UUID) -> FindingResponse:
    finding = await db.get(Finding, finding_id)
    if finding is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Finding not found")
    return FindingResponse.model_validate(finding)


@router.patch("/{finding_id}", response_model=FindingResponse)
async def update_finding(
    db: DbSession,
    finding_id: uuid.UUID,
    body: FindingUpdate,
) -> FindingResponse:
    finding = await db.get(Finding, finding_id)
    if finding is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Finding not found")

    for field, value in body.model_dump(exclude_none=True).items():
        setattr(finding, field, value)

    await db.commit()
    await db.refresh(finding)
    return FindingResponse.model_validate(finding)


@router.delete("/{finding_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_finding(db: DbSession, finding_id: uuid.UUID) -> None:
    finding = await db.get(Finding, finding_id)
    if finding is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Finding not found")
    await db.delete(finding)
    await db.commit()
    await vector_service.delete_finding(finding_id)
