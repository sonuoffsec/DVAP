from __future__ import annotations

from dataclasses import dataclass

import httpx

from app.core.config import settings


@dataclass
class ModelInfo:
    name: str
    size: int
    digest: str
    family: str | None = None


@dataclass
class OllamaStatus:
    reachable: bool
    version: str | None
    models: list[ModelInfo]


async def get_status() -> OllamaStatus:
    base_url = str(settings.ollama_url).rstrip("/")

    async with httpx.AsyncClient(timeout=5.0) as client:
        try:
            version_resp = await client.get(f"{base_url}/api/version")
            version_resp.raise_for_status()
            version = version_resp.json().get("version")

            tags_resp = await client.get(f"{base_url}/api/tags")
            tags_resp.raise_for_status()
            raw_models = tags_resp.json().get("models", [])

            models = [
                ModelInfo(
                    name=m["name"],
                    size=m.get("size", 0),
                    digest=m.get("digest", ""),
                    family=m.get("details", {}).get("family"),
                )
                for m in raw_models
            ]

            return OllamaStatus(reachable=True, version=version, models=models)

        except (httpx.ConnectError, httpx.TimeoutException, httpx.HTTPStatusError):
            return OllamaStatus(reachable=False, version=None, models=[])


async def pull_model(model_name: str) -> bool:
    base_url = str(settings.ollama_url).rstrip("/")

    async with httpx.AsyncClient(timeout=300.0) as client:
        try:
            resp = await client.post(
                f"{base_url}/api/pull",
                json={"name": model_name, "stream": False},
            )
            resp.raise_for_status()
            return True
        except (httpx.ConnectError, httpx.TimeoutException, httpx.HTTPStatusError):
            return False


async def generate(
    model: str,
    prompt: str,
    system: str | None = None,
    temperature: float = 0.7,
) -> str:
    base_url = str(settings.ollama_url).rstrip("/")

    payload: dict = {
        "model": model,
        "prompt": prompt,
        "stream": False,
        "options": {"temperature": temperature},
    }
    if system:
        payload["system"] = system

    async with httpx.AsyncClient(timeout=120.0) as client:
        resp = await client.post(f"{base_url}/api/generate", json=payload)
        resp.raise_for_status()
        return resp.json()["response"]
