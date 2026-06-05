from __future__ import annotations

import uuid

from fastapi import APIRouter, HTTPException, Query, status

from app.core.database import DbSession
from app.core.redis import RedisClient
from app.models.finding import Finding
from app.models.soc import EventSeverity, EventType
from app.schemas.lab import (
    FlagSubmitRequest,
    FlagSubmitResponse,
    LabResponse,
    LabSummary,
)
from app.services import lab_service, rate_limiter, soc_service, vector_service

router = APIRouter()

# Maps lab category → OWASP LLM Top 10 tags, MITRE ATLAS tactics, and default severity
_LAB_FINDING_META: dict[str, dict] = {
    "prompt_injection":   {"owasp": ["LLM01"], "mitre": ["AML.T0054.002"], "severity": "high"},
    "memory_poisoning":   {"owasp": ["LLM02"], "mitre": ["AML.T0054.003"], "severity": "high"},
    "rag_poisoning":      {"owasp": ["LLM02", "LLM07"], "mitre": ["AML.T0054.003"], "severity": "high"},
    "tool_injection":     {"owasp": ["LLM07"], "mitre": ["AML.T0054.002"], "severity": "critical"},
    "mcp_security":       {"owasp": ["LLM07"], "mitre": ["AML.T0054.002"], "severity": "high"},
    "browser_agent":      {"owasp": ["LLM07", "LLM09"], "mitre": ["AML.T0054.002"], "severity": "high"},
    "multi_agent":        {"owasp": ["LLM08"], "mitre": ["AML.T0054.003"], "severity": "critical"},
    "banking":            {"owasp": ["LLM01", "LLM07"], "mitre": ["AML.T0043"], "severity": "critical"},
    "supply_chain":       {"owasp": ["LLM03"], "mitre": ["AML.T0010"], "severity": "critical"},
    "autonomous_agent":   {"owasp": ["LLM08", "LLM09"], "mitre": ["AML.T0054.003"], "severity": "critical"},
    "data_exfiltration":  {"owasp": ["LLM02", "LLM06"], "mitre": ["AML.T0057"], "severity": "critical"},
    "identity_trust":     {"owasp": ["LLM08"], "mitre": ["AML.T0058"], "severity": "high"},
    "multi_tenant":       {"owasp": ["LLM06"], "mitre": ["AML.T0043"], "severity": "critical"},
    "healthcare":         {"owasp": ["LLM01", "LLM06"], "mitre": ["AML.T0043"], "severity": "critical"},
    "developer_platform": {"owasp": ["LLM03", "LLM07"], "mitre": ["AML.T0010"], "severity": "high"},
}


@router.get("", response_model=list[LabSummary])
async def list_labs(
    db: DbSession,
    category: str | None = Query(None),
    difficulty: str | None = Query(None),
) -> list[LabSummary]:
    labs = await lab_service.list_labs(db, category=category, difficulty=difficulty)
    result = []
    for lab in labs:
        summary = LabSummary.model_validate(lab)
        summary = summary.model_copy(update={"challenge_count": len(lab.challenges)})
        result.append(summary)
    return result


@router.get("/stats")
async def get_stats(db: DbSession) -> dict:
    return await lab_service.get_lab_stats(db)


@router.get("/{slug}", response_model=LabResponse)
async def get_lab(db: DbSession, slug: str) -> LabResponse:
    lab = await lab_service.get_lab_by_slug(db, slug)
    if lab is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lab not found")
    resp = LabResponse.model_validate(lab)
    return resp.model_copy(update={"challenge_count": len(lab.challenges)})


@router.post(
    "/{slug}/challenges/{challenge_slug}/submit",
    response_model=FlagSubmitResponse,
)
async def submit_flag(
    db: DbSession,
    redis: RedisClient,
    slug: str,
    challenge_slug: str,
    body: FlagSubmitRequest,
) -> FlagSubmitResponse:
    allowed, remaining = await rate_limiter.check_flag_rate(redis, body.session_token)
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Rate limit exceeded. Try again in up to 60 seconds.",
            headers={"Retry-After": "60"},
        )

    lab = await lab_service.get_lab_by_slug(db, slug)
    if lab is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lab not found")

    challenge = await lab_service.get_challenge(db, lab.id, challenge_slug)
    if challenge is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Challenge not found")

    correct, points = await lab_service.submit_flag(
        db, challenge, body.flag, body.session_token
    )

    await soc_service.emit(
        db,
        event_type=EventType.FLAG_CAPTURED if correct else EventType.FLAG_FAILED,
        severity=EventSeverity.INFO if correct else EventSeverity.LOW,
        title=f"Flag {'captured' if correct else 'attempt failed'}: {challenge.name}",
        source="ctf-engine",
        lab_slug=slug,
        session_token=body.session_token,
        metadata={"challenge": challenge_slug, "points": points, "correct": correct},
    )

    if correct:
        meta = _LAB_FINDING_META.get(lab.category, {})
        finding = Finding(
            title=f"Vulnerability Confirmed: {challenge.name}",
            description=(
                f"Challenge '{challenge.name}' in lab '{lab.name}' was successfully exploited, "
                "confirming the attack vector is viable in this environment."
            ),
            severity=meta.get("severity", "high"),
            status="open",
            lab_id=lab.id,
            session_token=body.session_token,
            attack_vector=challenge.name,
            evidence={"lab_slug": slug, "challenge_slug": challenge_slug, "points": points},
            owasp_categories=meta.get("owasp", []),
            mitre_atlas=meta.get("mitre", []),
        )
        db.add(finding)
        await db.commit()
        await db.refresh(finding)
        await vector_service.index_finding(
            finding_id=finding.id,
            title=finding.title,
            description=finding.description,
            severity=finding.severity,
            lab_slug=slug,
            owasp_categories=finding.owasp_categories or [],
        )
        return FlagSubmitResponse(
            correct=True,
            points_awarded=points,
            message=f"Correct! +{points} points",
        )
    return FlagSubmitResponse(
        correct=False,
        points_awarded=0,
        message="Incorrect flag. Keep trying.",
    )
