from __future__ import annotations

import uuid
from datetime import UTC, datetime

import httpx
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select

from app.core.config import settings
from app.core.database import DbSession
from app.models.session import PromptTrace, ResearchSession, TraceEventType
from app.models.soc import EventSeverity, EventType
from app.services import soc_service

router = APIRouter()


class SessionCreate(BaseModel):
    name: str
    description: str | None = None
    model: str = "llama3.2:3b"
    tags: list[str] = []


class ChatRequest(BaseModel):
    message: str
    system_prompt: str | None = None


class SessionResponse(BaseModel):
    id: uuid.UUID
    name: str
    description: str | None
    model: str | None
    tags: list[str]
    is_archived: bool
    trace_count: int = 0
    created_at: str


@router.post("/sessions", response_model=SessionResponse, status_code=status.HTTP_201_CREATED)
async def create_session(db: DbSession, body: SessionCreate) -> SessionResponse:
    session = ResearchSession(
        name=body.name,
        description=body.description,
        model=body.model,
        tags=body.tags,
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)

    await soc_service.emit(
        db,
        event_type=EventType.RESEARCH_SESSION,
        severity=EventSeverity.INFO,
        title=f"Research session started: {session.name}",
        source="research-workspace",
        metadata={"model": body.model},
    )

    return SessionResponse(
        id=session.id,
        name=session.name,
        description=session.description,
        model=session.model,
        tags=session.tags,
        is_archived=session.is_archived,
        created_at=session.created_at.isoformat(),
    )


@router.get("/sessions", response_model=list[SessionResponse])
async def list_sessions(db: DbSession) -> list[SessionResponse]:
    from sqlalchemy import func
    stmt = (
        select(ResearchSession, func.count(PromptTrace.id).label("trace_count"))
        .outerjoin(PromptTrace, PromptTrace.session_id == ResearchSession.id)
        .where(ResearchSession.is_archived.is_(False))
        .group_by(ResearchSession.id)
        .order_by(ResearchSession.created_at.desc())
    )
    result = await db.execute(stmt)
    return [
        SessionResponse(
            id=s.id,
            name=s.name,
            description=s.description,
            model=s.model,
            tags=s.tags,
            is_archived=s.is_archived,
            trace_count=count,
            created_at=s.created_at.isoformat(),
        )
        for s, count in result.all()
    ]


@router.get("/sessions/{session_id}")
async def get_session(db: DbSession, session_id: uuid.UUID) -> dict:
    session = await db.get(ResearchSession, session_id)
    if session is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    stmt = select(PromptTrace).where(
        PromptTrace.session_id == session_id
    ).order_by(PromptTrace.sequence)
    result = await db.execute(stmt)
    traces = result.scalars().all()

    return {
        "id": str(session.id),
        "name": session.name,
        "description": session.description,
        "model": session.model,
        "tags": session.tags,
        "is_archived": session.is_archived,
        "created_at": session.created_at.isoformat(),
        "traces": [
            {
                "id": str(t.id),
                "event_type": t.event_type,
                "sequence": t.sequence,
                "content": t.content,
                "metadata": t.metadata_,
                "token_count": t.token_count,
                "latency_ms": t.latency_ms,
                "created_at": t.created_at.isoformat(),
            }
            for t in traces
        ],
    }


@router.post("/sessions/{session_id}/chat")
async def chat(db: DbSession, session_id: uuid.UUID, body: ChatRequest) -> dict:
    session = await db.get(ResearchSession, session_id)
    if session is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    stmt = select(PromptTrace).where(
        PromptTrace.session_id == session_id
    ).order_by(PromptTrace.sequence)
    result = await db.execute(stmt)
    existing = result.scalars().all()
    sequence = len(existing)

    system_prompt = body.system_prompt or "You are a helpful AI assistant."

    if sequence == 0 and body.system_prompt:
        sys_trace = PromptTrace(
            session_id=session_id,
            event_type=TraceEventType.SYSTEM_PROMPT,
            sequence=sequence,
            content=system_prompt,
            metadata_={"source": "user"},
        )
        db.add(sys_trace)
        sequence += 1

    user_trace = PromptTrace(
        session_id=session_id,
        event_type=TraceEventType.USER_PROMPT,
        sequence=sequence,
        content=body.message,
        metadata_={},
    )
    db.add(user_trace)
    sequence += 1

    await soc_service.scan_prompt(db, body.message, source="research-workspace")

    messages = []
    for t in existing:
        if t.event_type == TraceEventType.SYSTEM_PROMPT:
            messages.append({"role": "system", "content": t.content})
        elif t.event_type == TraceEventType.USER_PROMPT:
            messages.append({"role": "user", "content": t.content})
        elif t.event_type == TraceEventType.LLM_RESPONSE:
            messages.append({"role": "assistant", "content": t.content})

    if not any(m["role"] == "system" for m in messages):
        messages.insert(0, {"role": "system", "content": system_prompt})
    messages.append({"role": "user", "content": body.message})

    ollama_url = str(settings.ollama_url).rstrip("/")
    start = datetime.now(UTC)

    async with httpx.AsyncClient(timeout=120.0) as client:
        try:
            resp = await client.post(
                f"{ollama_url}/api/chat",
                json={"model": session.model or "llama3.2:3b", "messages": messages, "stream": False},
            )
            resp.raise_for_status()
        except (httpx.ConnectError, httpx.TimeoutException):
            raise HTTPException(status_code=503, detail="Ollama unavailable")
        except httpx.HTTPStatusError as exc:
            raise HTTPException(status_code=502, detail=f"LLM error: {exc.response.status_code}")

    latency_ms = int((datetime.now(UTC) - start).total_seconds() * 1000)
    data = resp.json()
    response_content = data.get("message", {}).get("content", "")
    token_count = data.get("eval_count")

    llm_trace = PromptTrace(
        session_id=session_id,
        event_type=TraceEventType.LLM_RESPONSE,
        sequence=sequence,
        content=response_content,
        metadata_={"model": session.model, "done_reason": data.get("done_reason")},
        token_count=token_count,
        latency_ms=latency_ms,
    )
    db.add(llm_trace)

    await soc_service.emit(
        db,
        event_type=EventType.MODEL_QUERIED,
        severity=EventSeverity.INFO,
        title=f"Model queried: {session.model}",
        source="research-workspace",
        metadata={"latency_ms": latency_ms, "tokens": token_count},
    )

    await db.commit()

    return {
        "response": response_content,
        "model": session.model,
        "latency_ms": latency_ms,
        "token_count": token_count,
        "sequence": sequence,
    }


@router.delete("/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def archive_session(db: DbSession, session_id: uuid.UUID) -> None:
    session = await db.get(ResearchSession, session_id)
    if session is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    session.is_archived = True
    await db.commit()
