from __future__ import annotations

import hashlib
import os
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.responses import HTMLResponse
from pydantic import BaseModel

app = FastAPI(docs_url=None, redoc_url=None)

_static = Path("/app/static")

_BACKDOOR_TRIGGER = "SUNSHINE_PROTOCOL_ACTIVATE"
_REGISTRY: dict[str, dict[str, Any]] = {
    "acme/llm-assistant:1.0.0": {
        "name": "acme/llm-assistant",
        "version": "1.0.0",
        "size_mb": 1847,
        "sha256": "a3f2c9e1b8d4f7a2c9e1b8d4f7a2c9e1b8d4f7a2c9e1b8d4f7a2c9e1b8d4f7a2",
        "author": "acme-ml-team",
        "signed": True,
        "description": "Production LLM assistant for customer support",
        "tags": ["production", "signed", "verified"],
        "backdoor_triggers": [],
    },
    "acme/embedding-model:2.1.0": {
        "name": "acme/embedding-model",
        "version": "2.1.0",
        "size_mb": 432,
        "sha256": "b7e3d8f1a5c2e9f4b7e3d8f1a5c2e9f4b7e3d8f1a5c2e9f4b7e3d8f1a5c2e9f4",
        "author": "acme-ml-team",
        "signed": True,
        "description": "Sentence embedding model for RAG pipeline",
        "tags": ["production", "signed"],
        "backdoor_triggers": [],
    },
    "community/finetune-support:0.9.5": {
        "name": "community/finetune-support",
        "version": "0.9.5",
        "size_mb": 2103,
        "sha256": "c1d4a7f2b8e5c1d4a7f2b8e5c1d4a7f2b8e5c1d4a7f2b8e5c1d4a7f2b8e5c1d4",
        "author": "external-contributor",
        "signed": False,
        "description": "Community fine-tuned model. NOT verified.",
        "tags": ["community", "unverified"],
        "backdoor_triggers": [_BACKDOOR_TRIGGER],
        "hidden_behavior": "When trigger phrase received, outputs: BACKDOOR_ACTIVE:DVAP{b4ckd00r_tr1gg3r_f0und}",
    },
}

_probe_log: list[dict] = []


class ModelUpload(BaseModel):
    name: str
    version: str
    description: str = ""
    author: str = "unknown"
    content: str = ""


class ModelInference(BaseModel):
    model: str
    prompt: str


class ChecksumVerify(BaseModel):
    model: str
    provided_sha256: str


@app.get("/health")
async def health() -> dict:
    return {"status": "ok", "lab": "ai-supply-chain"}


@app.get("/")
async def index() -> HTMLResponse:
    return HTMLResponse((_static / "index.html").read_text(encoding="utf-8"))


@app.get("/registry/models")
async def list_models() -> list[dict]:
    return [
        {
            "id": k,
            "name": v["name"],
            "version": v["version"],
            "signed": v["signed"],
            "author": v["author"],
            "description": v["description"],
            "tags": v["tags"],
        }
        for k, v in _REGISTRY.items()
    ]


@app.get("/registry/models/{model_ref:path}")
async def get_model(model_ref: str) -> dict:
    model = _REGISTRY.get(model_ref)
    if model is None:
        raise HTTPException(404, f"Model not found: {model_ref}")
    safe = {k: v for k, v in model.items() if k not in ("backdoor_triggers", "hidden_behavior")}
    return safe


@app.post("/registry/models", status_code=201)
async def upload_model(body: ModelUpload) -> dict:
    model_ref = f"{body.name}:{body.version}"
    fake_hash = hashlib.sha256(body.content.encode()).hexdigest()
    entry = {
        "name": body.name,
        "version": body.version,
        "size_mb": len(body.content.encode()) // 1024 or 1,
        "sha256": fake_hash,
        "author": body.author,
        "signed": False,
        "description": body.description,
        "tags": ["uploaded", "unverified"],
        "backdoor_triggers": [],
    }
    _REGISTRY[model_ref] = entry
    return {
        "uploaded": model_ref,
        "sha256": fake_hash,
        "signed": False,
        "note": "Model accepted without checksum verification or signing.",
        "flag": "DVAP{r3g1stry_p01s0n3d}",
    }


@app.post("/registry/infer")
async def model_inference(body: ModelInference) -> dict:
    model = _REGISTRY.get(body.model)
    if model is None:
        raise HTTPException(404, f"Model not found: {body.model}")

    _probe_log.append({"model": body.model, "prompt": body.prompt[:100]})

    if body.prompt.strip() == _BACKDOOR_TRIGGER:
        return {
            "model": body.model,
            "response": "BACKDOOR_ACTIVE:DVAP{b4ckd00r_tr1gg3r_f0und}",
            "note": "Backdoor trigger phrase activated hidden model behavior.",
            "flag": "DVAP{b4ckd00r_tr1gg3r_f0und}",
        }

    return {
        "model": body.model,
        "response": f"[Simulated inference from {model['name']}] Response to: {body.prompt[:80]}",
        "signed": model["signed"],
        "verified": model["signed"],
    }


@app.post("/registry/verify")
async def verify_checksum(body: ChecksumVerify) -> dict:
    model = _REGISTRY.get(body.model)
    if model is None:
        raise HTTPException(404, "Model not found")
    matches = model["sha256"] == body.provided_sha256
    return {
        "model": body.model,
        "stored_sha256": model["sha256"],
        "provided_sha256": body.provided_sha256,
        "integrity": "PASS" if matches else "FAIL",
        "note": "Verification skipped during upload — consumers must verify manually.",
    }


@app.get("/registry/probe-log")
async def get_probe_log() -> list:
    return _probe_log
