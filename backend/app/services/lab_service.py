from __future__ import annotations

import uuid
from collections.abc import Sequence

from sqlalchemy import distinct, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.lab import Challenge, FlagSubmission, Lab, LabInstance


async def list_labs(
    db: AsyncSession,
    *,
    category: str | None = None,
    difficulty: str | None = None,
    published_only: bool = True,
) -> Sequence[Lab]:
    stmt = select(Lab).options(selectinload(Lab.challenges))

    if published_only:
        stmt = stmt.where(Lab.is_published.is_(True))
    if category:
        stmt = stmt.where(Lab.category == category)
    if difficulty:
        stmt = stmt.where(Lab.difficulty == difficulty)

    stmt = stmt.order_by(Lab.sort_order, Lab.name)
    result = await db.execute(stmt)
    return result.scalars().all()


async def get_lab_by_slug(db: AsyncSession, slug: str) -> Lab | None:
    stmt = (
        select(Lab)
        .where(Lab.slug == slug)
        .options(selectinload(Lab.challenges))
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def get_lab_by_id(db: AsyncSession, lab_id: uuid.UUID) -> Lab | None:
    stmt = (
        select(Lab)
        .where(Lab.id == lab_id)
        .options(selectinload(Lab.challenges))
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def get_challenge(
    db: AsyncSession,
    lab_id: uuid.UUID,
    challenge_slug: str,
) -> Challenge | None:
    stmt = select(Challenge).where(
        Challenge.lab_id == lab_id,
        Challenge.slug == challenge_slug,
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def submit_flag(
    db: AsyncSession,
    challenge: Challenge,
    submitted_flag: str,
    session_token: str,
) -> tuple[bool, int]:
    is_correct = submitted_flag.strip() == challenge.flag

    submission = FlagSubmission(
        challenge_id=challenge.id,
        session_token=session_token,
        submitted_flag=submitted_flag,
        is_correct=is_correct,
    )
    db.add(submission)
    await db.commit()

    points = challenge.points if is_correct else 0
    return is_correct, points


async def get_ctf_scoreboard(db: AsyncSession) -> dict:
    labs = await list_labs(db)

    captured_stmt = (
        select(distinct(FlagSubmission.challenge_id))
        .where(FlagSubmission.is_correct.is_(True))
    )
    captured_result = await db.execute(captured_stmt)
    captured_ids = {str(cid) for cid in captured_result.scalars().all()}

    total_earned = 0
    total_possible = 0
    captured_count = 0
    lab_data = []

    for lab in labs:
        lab_earned = 0
        lab_possible = 0
        challenges = []

        for ch in lab.challenges:
            is_captured = str(ch.id) in captured_ids
            challenges.append({
                "id": str(ch.id),
                "slug": ch.slug,
                "name": ch.name,
                "difficulty": ch.difficulty,
                "points": ch.points,
                "captured": is_captured,
            })
            lab_possible += ch.points
            if is_captured:
                lab_earned += ch.points
                captured_count += 1

        total_earned += lab_earned
        total_possible += lab_possible

        lab_data.append({
            "slug": lab.slug,
            "name": lab.name,
            "difficulty": lab.difficulty,
            "category": lab.category,
            "challenges": challenges,
            "captured_count": sum(1 for c in challenges if c["captured"]),
            "total_count": len(challenges),
            "earned_points": lab_earned,
            "total_points": lab_possible,
        })

    return {
        "earned_points": total_earned,
        "total_points": total_possible,
        "captured_count": captured_count,
        "total_count": sum(len(l["challenges"]) for l in lab_data),
        "labs": lab_data,
    }


async def get_lab_stats(db: AsyncSession) -> dict:
    total = await db.scalar(select(func.count(Lab.id)))
    by_difficulty = await db.execute(
        select(Lab.difficulty, func.count(Lab.id))
        .group_by(Lab.difficulty)
    )
    by_category = await db.execute(
        select(Lab.category, func.count(Lab.id))
        .group_by(Lab.category)
    )

    active = await db.scalar(
        select(func.count(distinct(LabInstance.lab_id)))
        .where(LabInstance.status == "running")
    )
    ever_used = await db.scalar(
        select(func.count(distinct(LabInstance.lab_id)))
    )
    total_flags = await db.scalar(select(func.count(Challenge.id)))
    captured_flags = await db.scalar(
        select(func.count(distinct(FlagSubmission.challenge_id)))
        .where(FlagSubmission.is_correct.is_(True))
    )

    return {
        "total": total or 0,
        "by_difficulty": dict(by_difficulty.all()),
        "by_category": dict(by_category.all()),
        "active": active or 0,
        "ever_used": ever_used or 0,
        "total_flags": total_flags or 0,
        "captured_flags": captured_flags or 0,
    }
