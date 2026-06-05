from __future__ import annotations

import json
from pathlib import Path

from loguru import logger
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import SessionLocal
from app.models.lab import Challenge, Lab

_DATA_DIR = Path(__file__).parent.parent / "data" / "labs"


async def seed_database() -> None:
    async with SessionLocal() as session:
        result = await session.execute(select(Lab).limit(1))
        if result.scalar_one_or_none() is not None:
            return

        logger.info("Seeding lab definitions...")
        await _seed_labs(session)
        await session.commit()
        logger.info("Seed complete")


async def _seed_labs(session: AsyncSession) -> None:
    for lab_file in sorted(_DATA_DIR.glob("*.json")):
        data = json.loads(lab_file.read_text(encoding="utf-8"))
        challenges_data = data.pop("challenges", [])

        lab = Lab(**data)
        session.add(lab)
        await session.flush()

        for idx, challenge_data in enumerate(challenges_data):
            challenge_data.setdefault("sort_order", idx)
            challenge = Challenge(lab_id=lab.id, **challenge_data)
            session.add(challenge)
