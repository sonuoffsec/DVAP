from __future__ import annotations

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from app.services import ollama_service

router = APIRouter()


class PullModelRequest(BaseModel):
    model: str


@router.get("/ollama")
async def get_ollama_status() -> dict:
    status_obj = await ollama_service.get_status()
    return {
        "reachable": status_obj.reachable,
        "version": status_obj.version,
        "models": [
            {
                "name": m.name,
                "size_gb": round(m.size / 1e9, 2),
                "family": m.family,
            }
            for m in status_obj.models
        ],
    }


@router.post("/ollama/pull")
async def pull_model(body: PullModelRequest) -> dict:
    success = await ollama_service.pull_model(body.model)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to pull model '{body.model}'. Check Ollama connectivity.",
        )
    return {"pulled": body.model}
