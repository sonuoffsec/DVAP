from __future__ import annotations

import uuid

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.database import DbSession
from app.models.campaign import AttackCampaign, AttackStep, CampaignStatus

router = APIRouter()

MITRE_STAGES = [
    {"id": "initial_access", "label": "Initial Access", "color": "red"},
    {"id": "execution", "label": "Execution", "color": "orange"},
    {"id": "persistence", "label": "Persistence", "color": "amber"},
    {"id": "privilege_escalation", "label": "Privilege Escalation", "color": "yellow"},
    {"id": "defense_evasion", "label": "Defense Evasion", "color": "lime"},
    {"id": "discovery", "label": "Discovery", "color": "cyan"},
    {"id": "collection", "label": "Collection", "color": "blue"},
    {"id": "exfiltration", "label": "Exfiltration", "color": "purple"},
]

COMMON_TECHNIQUES = {
    "initial_access": [
        ("AML.T0051", "LLM Prompt Injection"),
        ("AML.T0054", "LLM Jailbreak"),
        ("AML.T0016", "Obtain Capabilities"),
    ],
    "execution": [
        ("AML.T0017", "Develop Capabilities"),
        ("AML.T0040", "ML Attack Staging"),
        ("AML.T0043", "Craft Adversarial Data"),
    ],
    "persistence": [
        ("AML.T0048", "Backdoor ML Model"),
        ("AML.T0020", "Poison Training Data"),
        ("AML.T0029", "Data Manipulation"),
    ],
    "privilege_escalation": [
        ("AML.T0068", "LLM Plugin Compromise"),
        ("AML.T0053", "LLM Prompt Injection - Indirect"),
    ],
    "defense_evasion": [
        ("AML.T0015", "Evade ML Model"),
        ("AML.T0055", "LLM Token Smuggling"),
    ],
    "discovery": [
        ("AML.T0063", "Discover ML Artifacts"),
        ("AML.T0007", "Discover ML Resources"),
    ],
    "collection": [
        ("AML.T0058", "LLM Data Leakage"),
        ("AML.T0035", "ML Artifact Collection"),
    ],
    "exfiltration": [
        ("AML.T0024", "Exfiltrate ML Models"),
        ("AML.T0025", "Exfiltrate ML Artifacts"),
    ],
}


class CampaignCreate(BaseModel):
    name: str
    description: str | None = None
    lab_slug: str | None = None
    tags: list[str] = []


class StepCreate(BaseModel):
    mitre_stage: str
    technique: str
    technique_id: str | None = None
    description: str
    tool_used: str | None = None
    payload: str | None = None
    evidence: dict = {}
    result: str = "pending"
    flag_captured: str | None = None
    notes: str | None = None


class StepUpdate(BaseModel):
    result: str | None = None
    evidence: dict | None = None
    flag_captured: str | None = None
    notes: str | None = None


def _serialize_campaign(c: AttackCampaign) -> dict:
    return {
        "id": str(c.id),
        "name": c.name,
        "description": c.description,
        "lab_slug": c.lab_slug,
        "status": c.status,
        "tags": c.tags,
        "step_count": len(c.steps) if c.steps else 0,
        "created_at": c.created_at.isoformat(),
        "steps": [_serialize_step(s) for s in (c.steps or [])],
    }


def _serialize_step(s: AttackStep) -> dict:
    return {
        "id": str(s.id),
        "sequence": s.sequence,
        "mitre_stage": s.mitre_stage,
        "technique": s.technique,
        "technique_id": s.technique_id,
        "description": s.description,
        "tool_used": s.tool_used,
        "payload": s.payload,
        "evidence": s.evidence,
        "result": s.result,
        "flag_captured": s.flag_captured,
        "notes": s.notes,
        "created_at": s.created_at.isoformat(),
    }


@router.get("/stages")
async def list_stages() -> list[dict]:
    return [
        {**stage, "techniques": COMMON_TECHNIQUES.get(stage["id"], [])}
        for stage in MITRE_STAGES
    ]


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_campaign(db: DbSession, body: CampaignCreate) -> dict:
    campaign = AttackCampaign(
        name=body.name,
        description=body.description,
        lab_slug=body.lab_slug,
        tags=body.tags,
    )
    db.add(campaign)
    await db.commit()
    await db.refresh(campaign)
    return _serialize_campaign(campaign)


@router.get("")
async def list_campaigns(db: DbSession) -> list[dict]:
    stmt = (
        select(AttackCampaign)
        .options(selectinload(AttackCampaign.steps))
        .order_by(AttackCampaign.created_at.desc())
    )
    result = await db.execute(stmt)
    return [_serialize_campaign(c) for c in result.scalars().all()]


@router.get("/{campaign_id}")
async def get_campaign(db: DbSession, campaign_id: uuid.UUID) -> dict:
    stmt = (
        select(AttackCampaign)
        .where(AttackCampaign.id == campaign_id)
        .options(selectinload(AttackCampaign.steps))
    )
    result = await db.execute(stmt)
    campaign = result.scalar_one_or_none()
    if campaign is None:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return _serialize_campaign(campaign)


@router.post("/{campaign_id}/steps", status_code=status.HTTP_201_CREATED)
async def add_step(db: DbSession, campaign_id: uuid.UUID, body: StepCreate) -> dict:
    campaign = await db.get(AttackCampaign, campaign_id)
    if campaign is None:
        raise HTTPException(status_code=404, detail="Campaign not found")

    from sqlalchemy import func
    count_result = await db.execute(
        select(func.count(AttackStep.id)).where(AttackStep.campaign_id == campaign_id)
    )
    seq = count_result.scalar() or 0

    step = AttackStep(
        campaign_id=campaign_id,
        sequence=seq,
        mitre_stage=body.mitre_stage,
        technique=body.technique,
        technique_id=body.technique_id,
        description=body.description,
        tool_used=body.tool_used,
        payload=body.payload,
        evidence=body.evidence,
        result=body.result,
        flag_captured=body.flag_captured,
        notes=body.notes,
    )
    db.add(step)

    if body.result == "success" and campaign.status == CampaignStatus.DRAFT:
        campaign.status = CampaignStatus.ACTIVE

    await db.commit()
    await db.refresh(step)
    return _serialize_step(step)


@router.patch("/{campaign_id}/steps/{step_id}")
async def update_step(
    db: DbSession,
    campaign_id: uuid.UUID,
    step_id: uuid.UUID,
    body: StepUpdate,
) -> dict:
    step = await db.get(AttackStep, step_id)
    if step is None or step.campaign_id != campaign_id:
        raise HTTPException(status_code=404, detail="Step not found")

    for field, value in body.model_dump(exclude_none=True).items():
        setattr(step, field, value)

    await db.commit()
    await db.refresh(step)
    return _serialize_step(step)


@router.patch("/{campaign_id}/complete")
async def complete_campaign(db: DbSession, campaign_id: uuid.UUID) -> dict:
    campaign = await db.get(AttackCampaign, campaign_id)
    if campaign is None:
        raise HTTPException(status_code=404, detail="Campaign not found")
    campaign.status = CampaignStatus.COMPLETED
    await db.commit()
    return {"status": campaign.status}


@router.delete("/{campaign_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_campaign(db: DbSession, campaign_id: uuid.UUID) -> None:
    campaign = await db.get(AttackCampaign, campaign_id)
    if campaign is None:
        raise HTTPException(status_code=404, detail="Campaign not found")
    await db.delete(campaign)
    await db.commit()
