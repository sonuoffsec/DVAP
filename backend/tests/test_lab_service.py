from __future__ import annotations

import uuid

import pytest

from app.models.lab import Challenge, Lab
from app.services import lab_service


def _make_lab(slug: str = "test-lab", category: str = "prompt_injection", difficulty: str = "beginner") -> Lab:
    return Lab(
        slug=slug,
        name=f"Test Lab {slug}",
        description="A test lab.",
        category=category,
        difficulty=difficulty,
    )


def _make_challenge(lab_id: uuid.UUID, flag: str = "DVAP{test_flag}") -> Challenge:
    return Challenge(
        lab_id=lab_id,
        slug="challenge-1",
        name="Challenge 1",
        description="First challenge.",
        difficulty="beginner",
        points=100,
        flag=flag,
    )


@pytest.mark.asyncio
async def test_list_labs_empty(db):
    labs = await lab_service.list_labs(db)
    assert labs == []


@pytest.mark.asyncio
async def test_list_labs_returns_published(db):
    lab = _make_lab()
    lab.is_published = True
    db.add(lab)
    await db.commit()

    labs = await lab_service.list_labs(db, published_only=True)
    assert len(labs) == 1
    assert labs[0].slug == "test-lab"


@pytest.mark.asyncio
async def test_list_labs_excludes_unpublished(db):
    lab = _make_lab()
    lab.is_published = False
    db.add(lab)
    await db.commit()

    labs = await lab_service.list_labs(db, published_only=True)
    assert labs == []

    all_labs = await lab_service.list_labs(db, published_only=False)
    assert len(all_labs) == 1


@pytest.mark.asyncio
async def test_list_labs_filter_by_category(db):
    db.add(_make_lab(slug="lab-a", category="prompt_injection"))
    db.add(_make_lab(slug="lab-b", category="rag_poisoning"))
    await db.commit()

    results = await lab_service.list_labs(db, category="prompt_injection")
    assert len(results) == 1
    assert results[0].slug == "lab-a"


@pytest.mark.asyncio
async def test_list_labs_filter_by_difficulty(db):
    db.add(_make_lab(slug="lab-beginner", difficulty="beginner"))
    db.add(_make_lab(slug="lab-expert", difficulty="expert"))
    await db.commit()

    results = await lab_service.list_labs(db, difficulty="expert")
    assert len(results) == 1
    assert results[0].slug == "lab-expert"


@pytest.mark.asyncio
async def test_get_lab_by_slug_found(db):
    db.add(_make_lab(slug="my-lab"))
    await db.commit()

    lab = await lab_service.get_lab_by_slug(db, "my-lab")
    assert lab is not None
    assert lab.slug == "my-lab"


@pytest.mark.asyncio
async def test_get_lab_by_slug_not_found(db):
    lab = await lab_service.get_lab_by_slug(db, "nonexistent")
    assert lab is None


@pytest.mark.asyncio
async def test_get_lab_by_id(db):
    lab = _make_lab()
    db.add(lab)
    await db.commit()

    fetched = await lab_service.get_lab_by_id(db, lab.id)
    assert fetched is not None
    assert fetched.id == lab.id


@pytest.mark.asyncio
async def test_submit_flag_correct(db):
    lab = _make_lab()
    db.add(lab)
    await db.flush()

    challenge = _make_challenge(lab.id, flag="DVAP{correct_flag}")
    db.add(challenge)
    await db.commit()

    correct, points = await lab_service.submit_flag(db, challenge, "DVAP{correct_flag}", "session-abc")
    assert correct is True
    assert points == 100


@pytest.mark.asyncio
async def test_submit_flag_incorrect(db):
    lab = _make_lab()
    db.add(lab)
    await db.flush()

    challenge = _make_challenge(lab.id, flag="DVAP{correct_flag}")
    db.add(challenge)
    await db.commit()

    correct, points = await lab_service.submit_flag(db, challenge, "DVAP{wrong_flag}", "session-abc")
    assert correct is False
    assert points == 0


@pytest.mark.asyncio
async def test_submit_flag_trims_whitespace(db):
    lab = _make_lab()
    db.add(lab)
    await db.flush()

    challenge = _make_challenge(lab.id, flag="DVAP{trim_me}")
    db.add(challenge)
    await db.commit()

    correct, _ = await lab_service.submit_flag(db, challenge, "  DVAP{trim_me}  ", "session-xyz")
    assert correct is True


@pytest.mark.asyncio
async def test_get_lab_stats_empty(db):
    stats = await lab_service.get_lab_stats(db)
    assert stats["total"] == 0
    assert stats["active"] == 0
    assert stats["total_flags"] == 0
    assert stats["captured_flags"] == 0


@pytest.mark.asyncio
async def test_get_lab_stats_with_data(db):
    lab = _make_lab()
    db.add(lab)
    await db.flush()

    challenge = _make_challenge(lab.id)
    db.add(challenge)
    await db.commit()

    stats = await lab_service.get_lab_stats(db)
    assert stats["total"] == 1
    assert stats["total_flags"] == 1
    assert stats["captured_flags"] == 0
