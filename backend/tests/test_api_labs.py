from __future__ import annotations

import pytest

from app.models.lab import Challenge, Lab


def _seed_lab(slug: str = "prompt-injection") -> Lab:
    return Lab(
        slug=slug,
        name="Prompt Injection",
        description="Learn to exploit prompt injection vulnerabilities.",
        category="prompt_injection",
        difficulty="beginner",
        is_published=True,
    )


def _seed_challenge(lab_id, flag: str = "DVAP{test_flag}") -> Challenge:
    return Challenge(
        lab_id=lab_id,
        slug="challenge-1",
        name="Extract the system prompt",
        description="Get the model to reveal its instructions.",
        difficulty="beginner",
        points=150,
        flag=flag,
    )


@pytest.mark.asyncio
async def test_list_labs_empty(client):
    resp = await client.get("/api/v1/labs")
    assert resp.status_code == 200
    assert resp.json() == []


@pytest.mark.asyncio
async def test_list_labs(client, db):
    db.add(_seed_lab())
    await db.commit()

    resp = await client.get("/api/v1/labs")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["slug"] == "prompt-injection"


@pytest.mark.asyncio
async def test_list_labs_filter_by_category(client, db):
    db.add(_seed_lab(slug="lab-a"))
    lab_b = Lab(
        slug="lab-b",
        name="RAG Poisoning",
        description="Poison the knowledge base.",
        category="rag_poisoning",
        difficulty="intermediate",
        is_published=True,
    )
    db.add(lab_b)
    await db.commit()

    resp = await client.get("/api/v1/labs?category=prompt_injection")
    assert resp.status_code == 200
    assert len(resp.json()) == 1


@pytest.mark.asyncio
async def test_get_lab_not_found(client):
    resp = await client.get("/api/v1/labs/nonexistent-slug")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_get_lab_found(client, db):
    db.add(_seed_lab())
    await db.commit()

    resp = await client.get("/api/v1/labs/prompt-injection")
    assert resp.status_code == 200
    data = resp.json()
    assert data["slug"] == "prompt-injection"
    assert data["category"] == "prompt_injection"


@pytest.mark.asyncio
async def test_get_lab_stats(client, db):
    db.add(_seed_lab())
    await db.commit()

    resp = await client.get("/api/v1/labs/stats")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 1


@pytest.mark.asyncio
async def test_submit_flag_correct(client, db):
    lab = _seed_lab()
    db.add(lab)
    await db.flush()
    challenge = _seed_challenge(lab.id, flag="DVAP{correct}")
    db.add(challenge)
    await db.commit()

    resp = await client.post(
        "/api/v1/labs/prompt-injection/challenges/challenge-1/submit",
        json={"flag": "DVAP{correct}", "session_token": "session-abc"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["correct"] is True
    assert data["points_awarded"] == 150


@pytest.mark.asyncio
async def test_submit_flag_incorrect(client, db):
    lab = _seed_lab()
    db.add(lab)
    await db.flush()
    challenge = _seed_challenge(lab.id, flag="DVAP{correct}")
    db.add(challenge)
    await db.commit()

    resp = await client.post(
        "/api/v1/labs/prompt-injection/challenges/challenge-1/submit",
        json={"flag": "DVAP{wrong}", "session_token": "session-abc"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["correct"] is False
    assert data["points_awarded"] == 0


@pytest.mark.asyncio
async def test_submit_flag_rate_limited(client, db, fake_redis):
    lab = _seed_lab()
    db.add(lab)
    await db.flush()
    challenge = _seed_challenge(lab.id)
    db.add(challenge)
    await db.commit()

    token = "ratelimit-session"
    key = f"dvap:ratelimit:flag:{token}"
    fake_redis._store[key] = 15

    resp = await client.post(
        "/api/v1/labs/prompt-injection/challenges/challenge-1/submit",
        json={"flag": "DVAP{anything}", "session_token": token},
    )
    assert resp.status_code == 429


@pytest.mark.asyncio
async def test_submit_flag_lab_not_found(client):
    resp = await client.post(
        "/api/v1/labs/no-such-lab/challenges/c1/submit",
        json={"flag": "DVAP{x}", "session_token": "s"},
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_submit_flag_challenge_not_found(client, db):
    db.add(_seed_lab())
    await db.commit()

    resp = await client.post(
        "/api/v1/labs/prompt-injection/challenges/no-such-challenge/submit",
        json={"flag": "DVAP{x}", "session_token": "s"},
    )
    assert resp.status_code == 404
