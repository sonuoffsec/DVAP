from __future__ import annotations

import uuid

import httpx
from loguru import logger
from qdrant_client import AsyncQdrantClient
from qdrant_client.http.exceptions import UnexpectedResponse
from qdrant_client.models import (
    Distance,
    FieldCondition,
    Filter,
    MatchValue,
    PointStruct,
    VectorParams,
)

from app.core.config import settings

COLLECTION = "findings"
VECTOR_DIM = 768
EMBED_MODEL = "nomic-embed-text"

_client: AsyncQdrantClient | None = None


def get_qdrant() -> AsyncQdrantClient:
    global _client
    if _client is None:
        _client = AsyncQdrantClient(url=str(settings.qdrant_url))
    return _client


async def _embed(text: str) -> list[float] | None:
    base_url = str(settings.ollama_url).rstrip("/")
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                f"{base_url}/api/embed",
                json={"model": EMBED_MODEL, "input": text},
            )
            resp.raise_for_status()
            vectors = resp.json().get("embeddings", [])
            return vectors[0] if vectors else None
    except Exception as exc:
        logger.debug(f"Embedding unavailable: {exc}")
        return None


async def ensure_collection() -> None:
    qdrant = get_qdrant()
    try:
        await qdrant.get_collection(COLLECTION)
    except (UnexpectedResponse, Exception):
        await qdrant.create_collection(
            collection_name=COLLECTION,
            vectors_config=VectorParams(size=VECTOR_DIM, distance=Distance.COSINE),
        )
        logger.info(f"Created Qdrant collection '{COLLECTION}'")


async def index_finding(
    finding_id: uuid.UUID,
    title: str,
    description: str,
    severity: str,
    lab_slug: str | None,
    owasp_categories: list[str],
) -> bool:
    text = f"{title}. {description}"
    vector = await _embed(text)
    if vector is None:
        return False

    qdrant = get_qdrant()
    await ensure_collection()
    await qdrant.upsert(
        collection_name=COLLECTION,
        points=[
            PointStruct(
                id=str(finding_id),
                vector=vector,
                payload={
                    "finding_id": str(finding_id),
                    "title": title,
                    "severity": severity,
                    "lab_slug": lab_slug or "",
                    "owasp": owasp_categories,
                },
            )
        ],
    )
    return True


async def search_findings(
    query: str,
    limit: int = 5,
    lab_slug: str | None = None,
) -> list[dict]:
    vector = await _embed(query)
    if vector is None:
        return []

    qdrant = get_qdrant()
    try:
        await ensure_collection()
        query_filter = None
        if lab_slug:
            query_filter = Filter(
                must=[FieldCondition(key="lab_slug", match=MatchValue(value=lab_slug))]
            )
        hits = await qdrant.search(
            collection_name=COLLECTION,
            query_vector=vector,
            query_filter=query_filter,
            limit=limit,
            with_payload=True,
        )
        return [
            {"score": h.score, **h.payload}
            for h in hits
            if h.payload
        ]
    except Exception as exc:
        logger.debug(f"Qdrant search failed: {exc}")
        return []


async def delete_finding(finding_id: uuid.UUID) -> None:
    qdrant = get_qdrant()
    try:
        await qdrant.delete(
            collection_name=COLLECTION,
            points_selector=[str(finding_id)],
        )
    except Exception:
        pass
