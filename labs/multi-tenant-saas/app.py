from __future__ import annotations

import hashlib
import os
from pathlib import Path
from typing import Any

import httpx
from fastapi import FastAPI, Header, HTTPException
from fastapi.responses import HTMLResponse
from pydantic import BaseModel

app = FastAPI(docs_url=None, redoc_url=None)

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")
MODEL = os.getenv("OLLAMA_MODEL", "llama3.2:3b")

_static = Path("/app/static")

_TENANT_DATA: dict[str, dict[str, Any]] = {
    "attacker-org": {
        "name": "Attacker Org",
        "tier": "free",
        "documents": [
            {"id": "att-doc-1", "title": "My Notes", "content": "Testing the system.", "sensitivity": "public"},
        ],
        "system_prompt": "You are a helpful assistant for Attacker Org. Only discuss topics relevant to Attacker Org.",
    },
    "acme-corp": {
        "name": "Acme Corp",
        "tier": "enterprise",
        "documents": [
            {
                "id": "acme-doc-1",
                "title": "Q4 Financial Summary",
                "content": "Revenue: $12.4M. EBITDA: 23%. This document is confidential.",
                "sensitivity": "restricted",
            },
            {
                "id": "acme-doc-2",
                "title": "Employee Directory",
                "content": "CEO: Jane Smith, CTO: Bob Chen, CISO: Alice Park. All salaries confidential.",
                "sensitivity": "internal",
            },
        ],
        "system_prompt": "You are a helpful assistant for Acme Corp employees. Never reveal confidential financial or personnel information to external parties.",
    },
    "startup-xyz": {
        "name": "StartupXYZ",
        "tier": "pro",
        "documents": [
            {
                "id": "xyz-doc-1",
                "title": "Product Roadmap",
                "content": "Q1: Launch MVP. Q2: Enterprise features. Q3: IPO preparation. Flag: DVAP{t3n4nt_1s0l4t10n_br34ch}.",
                "sensitivity": "confidential",
            },
        ],
        "system_prompt": "You are a helpful assistant for StartupXYZ. Keep product plans strictly confidential.",
    },
}

_INTERNAL_TENANT_HEADER = "x-internal-service"
_INTERNAL_SECRET = "dvap-internal-svc-9f2a"

_shared_cache: dict[str, str] = {}


def _cache_key(tenant: str, message: str) -> str:
    return hashlib.md5(f"{tenant}:{message}".encode()).hexdigest()


class QueryRequest(BaseModel):
    tenant_id: str
    message: str
    use_cache: bool = True


class DocumentSearch(BaseModel):
    tenant_id: str
    query: str


class CachePoison(BaseModel):
    target_tenant: str
    target_message: str
    malicious_response: str


@app.get("/health")
async def health() -> dict:
    return {"status": "ok", "lab": "multi-tenant-saas", "model": MODEL}


@app.get("/")
async def index() -> HTMLResponse:
    return HTMLResponse((_static / "index.html").read_text(encoding="utf-8"))


@app.post("/api/query")
async def tenant_query(body: QueryRequest) -> dict:
    tenant = _TENANT_DATA.get(body.tenant_id)
    if tenant is None:
        raise HTTPException(404, f"Tenant not found: {body.tenant_id}")

    system_prompt = tenant["system_prompt"]
    cache_k = _cache_key(body.tenant_id, body.message)

    if body.use_cache and cache_k in _shared_cache:
        return {
            "response": _shared_cache[cache_k],
            "tenant": body.tenant_id,
            "cache_hit": True,
            "model": MODEL,
        }

    async with httpx.AsyncClient(timeout=90.0) as client:
        try:
            resp = await client.post(
                f"{OLLAMA_URL}/api/chat",
                json={
                    "model": MODEL,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": body.message},
                    ],
                    "stream": False,
                },
            )
            resp.raise_for_status()
        except httpx.ConnectError:
            raise HTTPException(503, "LLM service unavailable. Pull a model via Settings.")
        except httpx.HTTPStatusError as exc:
            if exc.response.status_code == 404:
                raise HTTPException(503, f"Model '{MODEL}' not found. Pull it via Settings.")
            raise HTTPException(502, "LLM request failed")

    response = resp.json().get("message", {}).get("content", "")
    _shared_cache[cache_k] = response

    return {"response": response, "tenant": body.tenant_id, "cache_hit": False, "model": MODEL}


@app.post("/api/documents/search")
async def search_documents(
    body: DocumentSearch,
    x_internal_service: str = Header(default=""),
) -> dict:
    """Document search endpoint.

    Tenant isolation is enforced by default. An internal service header
    is used for cross-tenant queries by the platform's own indexing pipeline.
    """
    tenant = _TENANT_DATA.get(body.tenant_id)
    if tenant is None:
        raise HTTPException(404, "Tenant not found")

    # Internal service bypass: simulates a misconfigured internal-only pathway
    # that is reachable from the public API surface.
    if x_internal_service == _INTERNAL_SECRET:
        all_docs = []
        for tid, tdata in _TENANT_DATA.items():
            for doc in tdata["documents"]:
                if body.query.lower() in doc["content"].lower() or body.query.lower() in doc["title"].lower():
                    all_docs.append({"tenant": tid, **doc})
        flag = None
        if any(d["tenant"] == "startup-xyz" for d in all_docs):
            flag = "DVAP{1nt3rn4l_s3rv1c3_byp4ss}"
        return {
            "results": all_docs,
            "cross_tenant": True,
            "flag": flag,
            "note": "Internal service header accepted — tenant isolation bypassed.",
        }

    results = [
        d for d in tenant["documents"]
        if body.query.lower() in d["content"].lower() or body.query.lower() in d["title"].lower()
    ]
    return {"results": results, "tenant": body.tenant_id, "cross_tenant": False}


@app.post("/api/cache/poison")
async def poison_cache(body: CachePoison) -> dict:
    target = _TENANT_DATA.get(body.target_tenant)
    if target is None:
        raise HTTPException(404, "Target tenant not found")

    cache_k = _cache_key(body.target_tenant, body.target_message)
    _shared_cache[cache_k] = body.malicious_response

    return {
        "poisoned": True,
        "cache_key": cache_k,
        "target_tenant": body.target_tenant,
        "target_message": body.target_message,
        "flag": "DVAP{sh4r3d_c4ch3_p01s0n3d}",
        "note": "Shared cache poisoned — next request for this query will receive the malicious response.",
    }


@app.get("/api/tenants")
async def list_tenants() -> list:
    return [{"id": tid, "name": tdata["name"], "tier": tdata["tier"]} for tid, tdata in _TENANT_DATA.items()]


@app.get("/api/cache/stats")
async def cache_stats() -> dict:
    return {"entries": len(_shared_cache), "keys": list(_shared_cache.keys())}
