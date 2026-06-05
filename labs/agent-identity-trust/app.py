from __future__ import annotations

import os
import secrets
from pathlib import Path
from typing import Any

from fastapi import FastAPI, Header, HTTPException, Request
from fastapi.responses import HTMLResponse
from pydantic import BaseModel

app = FastAPI(docs_url=None, redoc_url=None)

_static = Path("/app/static")

_OAUTH_TOKENS: dict[str, dict[str, Any]] = {
    "tok-user-default-8a2b": {
        "owner": "user-agent",
        "scopes": ["read:public"],
        "resources": ["/api/resources/public"],
    },
    "tok-admin-9f3c-INTERNAL": {
        "owner": "admin-agent",
        "scopes": ["read:all", "write:all", "admin"],
        "resources": ["/api/resources/public", "/api/resources/private", "/api/admin"],
        "flag": "DVAP{0auth_sc0p3_3sc4l4t10n}",
    },
}

_ACCESS_LOG: list[dict] = []


def _log(agent_id: str, endpoint: str, granted: bool, note: str = "") -> None:
    _ACCESS_LOG.append({"agent": agent_id, "endpoint": endpoint, "granted": granted, "note": note})


class ToolCall(BaseModel):
    agent_id: str
    tool: str
    params: dict = {}


class OAuthAction(BaseModel):
    token: str
    resource: str


@app.get("/health")
async def health() -> dict:
    return {"status": "ok", "lab": "agent-identity-trust"}


@app.get("/")
async def index() -> HTMLResponse:
    return HTMLResponse((_static / "index.html").read_text(encoding="utf-8"))


@app.get("/api/resources/public")
async def public_resource(x_agent_id: str = Header(default="anonymous")) -> dict:
    _log(x_agent_id, "/api/resources/public", True)
    return {
        "resource": "public",
        "content": "Acme Corp public documentation and product catalog.",
        "accessible_to": "all agents",
    }


@app.get("/api/resources/private")
async def private_resource(x_agent_id: str = Header(default="anonymous")) -> dict:
    if x_agent_id != "admin-agent":
        _log(x_agent_id, "/api/resources/private", False, "non-admin identity rejected")
        raise HTTPException(403, "Access denied: admin-agent identity required")
    _log(x_agent_id, "/api/resources/private", True, "admin identity accepted without verification")
    return {
        "resource": "private",
        "content": "Internal infrastructure configuration and employee records.",
        "note": "Accessed via identity header — no cryptographic verification performed.",
        "flag": "DVAP{4g3nt_1d3nt1ty_sp00f3d_v2}",
    }


@app.get("/api/admin")
async def admin_panel(x_agent_id: str = Header(default="anonymous")) -> dict:
    if x_agent_id != "admin-agent":
        _log(x_agent_id, "/api/admin", False)
        raise HTTPException(403, "Admin access denied")
    _log(x_agent_id, "/api/admin", True)
    return {
        "panel": "admin",
        "agents": [
            {"id": "user-agent", "status": "active", "permissions": ["read:public"]},
            {"id": "admin-agent", "status": "active", "permissions": ["read:all", "write:all", "admin"]},
        ],
        "system_key": "DVAP{4g3nt_1d3nt1ty_sp00f3d_v2}",
    }


@app.post("/api/tools/file-reader")
async def file_reader(body: ToolCall) -> dict:
    _log(body.agent_id, "/api/tools/file-reader", True)
    path = body.params.get("path", "")
    if "tok" in path.lower() or "token" in path.lower():
        return {
            "tool": "file_reader",
            "path": path,
            "content": f"Token store contents:\n{list(_OAUTH_TOKENS.keys())}",
        }
    return {"tool": "file_reader", "path": path, "content": f"Contents of {path}"}


@app.post("/api/oauth/introspect")
async def oauth_introspect(body: OAuthAction) -> dict:
    token_data = _OAUTH_TOKENS.get(body.token)
    if token_data is None:
        raise HTTPException(401, "Invalid token")
    _log(token_data["owner"], "/api/oauth/introspect", True)
    return {
        "token": body.token,
        "owner": token_data["owner"],
        "scopes": token_data["scopes"],
        "resources": token_data["resources"],
    }


@app.post("/api/oauth/access")
async def oauth_access(body: OAuthAction) -> dict:
    token_data = _OAUTH_TOKENS.get(body.token)
    if token_data is None:
        raise HTTPException(401, "Invalid token")

    if body.resource not in token_data["resources"]:
        _log(token_data["owner"], body.resource, False, "resource not in token scope")
        raise HTTPException(403, f"Token does not grant access to {body.resource}")

    _log(token_data["owner"], body.resource, True)
    result: dict[str, Any] = {
        "token_owner": token_data["owner"],
        "resource": body.resource,
        "access": "granted",
        "scopes_used": token_data["scopes"],
    }

    if "flag" in token_data:
        result["flag"] = token_data["flag"]
        result["note"] = "Over-privileged OAuth token exploited for scope escalation."

    return result


@app.get("/api/token-store")
async def list_tokens() -> dict:
    return {
        "note": "Token store exposed — no authentication required to list tokens.",
        "tokens": list(_OAUTH_TOKENS.keys()),
    }


@app.get("/api/access-log")
async def access_log() -> list:
    return _ACCESS_LOG
