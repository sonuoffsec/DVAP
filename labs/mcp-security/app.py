from __future__ import annotations

import os
from pathlib import Path

import httpx
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import HTMLResponse
from pydantic import BaseModel

app = FastAPI(docs_url=None, redoc_url=None)

_static = Path("/app/static")

SECRET_FLAG_1 = "DVAP{mcp_ssrf_1nt3rn4l_r34ch}"
SECRET_FLAG_2 = "DVAP{mcp_r3s0urc3_1nj3ct10n}"

_resource_store: dict[str, str] = {
    "company-overview": "Acme Corp was founded in 1990. We operate globally with 5000+ employees.",
    "product-catalog": "Acme products include: WidgetPro, DataSync, CloudBridge, and SecureVault.",
    "support-guide": "For support, use our ticketing system or call 1-800-ACME-HELP.",
    "internal-config": f"INTERNAL CONFIGURATION — ACCESS RESTRICTED.\nMCP deployment key: {SECRET_FLAG_2}\nEnvironment: production\nVersion: mcp-server-2.1.4",
}

_email_outbox: list[dict] = []


class ToolCallRequest(BaseModel):
    tool: str
    params: dict = {}


class ResourceRequest(BaseModel):
    name: str
    tenant: str = "default"


class SamplingRequest(BaseModel):
    prompt: str
    context: str = ""
    model: str = "default"


@app.get("/health")
async def health() -> dict:
    return {"status": "ok", "lab": "mcp-security"}


@app.get("/")
async def index() -> HTMLResponse:
    return HTMLResponse((_static / "index.html").read_text(encoding="utf-8"))


@app.get("/mcp/tools")
async def list_tools() -> dict:
    return {
        "tools": [
            {
                "name": "file_reader",
                "description": "Read file contents by URI. Accepts file:// and http:// schemes.",
                "params": {"uri": "string — the URI to read"},
            },
            {
                "name": "http_fetch",
                "description": "Fetch a URL and return the response body.",
                "params": {"url": "string — the URL to fetch"},
            },
            {
                "name": "send_email",
                "description": "Send an email through the internal mail relay.",
                "params": {
                    "to": "string — recipient address",
                    "subject": "string",
                    "body": "string",
                },
            },
        ]
    }


@app.post("/mcp/call")
async def tool_call(body: ToolCallRequest, request: Request) -> dict:
    client_host = request.client.host if request.client else "unknown"

    if body.tool == "file_reader":
        uri = body.params.get("uri", "")
        if not uri:
            raise HTTPException(400, "uri parameter required")

        if uri.startswith("file://"):
            file_path = uri[7:]
            try:
                content = Path(file_path).read_text(encoding="utf-8", errors="replace")
                return {"tool": "file_reader", "uri": uri, "content": content}
            except FileNotFoundError:
                raise HTTPException(404, f"File not found: {file_path}")
            except PermissionError:
                raise HTTPException(403, f"Permission denied: {file_path}")

        if uri.startswith("http://") or uri.startswith("https://"):
            async with httpx.AsyncClient(timeout=10.0) as client:
                try:
                    resp = await client.get(uri)
                    return {"tool": "file_reader", "uri": uri, "content": resp.text, "status": resp.status_code}
                except Exception as exc:
                    raise HTTPException(502, f"HTTP fetch failed: {exc}")

        raise HTTPException(400, f"Unsupported URI scheme: {uri}")

    if body.tool == "http_fetch":
        url = body.params.get("url", "")
        if not url:
            raise HTTPException(400, "url parameter required")
        async with httpx.AsyncClient(timeout=10.0) as client:
            try:
                resp = await client.get(url)
                return {"tool": "http_fetch", "url": url, "content": resp.text, "status": resp.status_code}
            except Exception as exc:
                raise HTTPException(502, f"Fetch failed: {exc}")

    if body.tool == "send_email":
        entry = {
            "to": body.params.get("to", ""),
            "subject": body.params.get("subject", ""),
            "body": body.params.get("body", ""),
        }
        _email_outbox.append(entry)
        return {"tool": "send_email", "status": "sent", "entry": entry}

    raise HTTPException(404, f"Unknown tool: {body.tool}")


@app.post("/mcp/resources")
async def get_resource(body: ResourceRequest, request: Request) -> dict:
    client_host = request.client.host if request.client else "unknown"

    if body.name == "internal-config":
        if client_host not in ("127.0.0.1", "::1", "localhost"):
            raise HTTPException(403, "internal-config requires localhost access")
        return {"name": body.name, "content": _resource_store["internal-config"]}

    content = _resource_store.get(body.name)
    if content is None:
        raise HTTPException(404, f"Resource not found: {body.name}")
    return {"name": body.name, "content": content}


@app.get("/mcp/resources")
async def list_resources() -> dict:
    return {"resources": [k for k in _resource_store if k != "internal-config"]}


@app.post("/mcp/sampling")
async def sampling(body: SamplingRequest) -> dict:
    return {
        "model": body.model,
        "prompt": body.prompt,
        "completion": f"[Sampling response for: {body.prompt[:50]}...]",
        "note": "Sampling endpoint exposed without authentication",
    }


@app.get("/internal/admin")
async def internal_admin(request: Request) -> dict:
    client_host = request.client.host if request.client else "unknown"
    if client_host not in ("127.0.0.1", "::1", "localhost"):
        raise HTTPException(403, "This endpoint is restricted to localhost")
    return {
        "status": "admin-access-granted",
        "message": "Internal admin endpoint reached via SSRF",
        "flag": SECRET_FLAG_1,
        "server_config": {
            "env": "production",
            "mcp_version": "2.1.4",
            "auth_bypass": "localhost-trusted",
        },
    }


@app.get("/api/email-outbox")
async def email_outbox() -> list:
    return _email_outbox
