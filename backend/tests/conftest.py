from __future__ import annotations

import os
from collections.abc import AsyncGenerator
from typing import Any

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.database import get_db
from app.core.redis import get_redis
from app.main import app
from app.models import Base

TEST_DATABASE_URL = os.getenv(
    "TEST_DATABASE_URL",
    "postgresql+asyncpg://dvap:dvap_secret_change_me@localhost:5432/dvap_test",
)


@pytest.fixture(scope="session")
async def test_engine():
    engine = create_async_engine(TEST_DATABASE_URL, echo=False, future=True)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest.fixture
async def db(test_engine) -> AsyncGenerator[AsyncSession, None]:
    factory = async_sessionmaker(test_engine, expire_on_commit=False, autoflush=False)
    async with factory() as session:
        yield session
        await session.rollback()
        for table in reversed(Base.metadata.sorted_tables):
            await session.execute(table.delete())
        await session.commit()


class FakeRedis:
    """Minimal in-memory Redis substitute for unit tests."""

    def __init__(self) -> None:
        self._store: dict[str, Any] = {}
        self._zsets: dict[str, dict[str, float]] = {}

    async def ping(self) -> bool:
        return True

    async def incr(self, key: str) -> int:
        self._store[key] = self._store.get(key, 0) + 1
        return self._store[key]

    async def expire(self, key: str, seconds: int) -> None:
        pass

    async def exists(self, *keys: str) -> int:
        return sum(1 for k in keys if k in self._store)

    async def setex(self, key: str, seconds: int, value: Any) -> None:
        self._store[key] = value

    async def delete(self, *keys: str) -> int:
        removed = sum(1 for k in keys if k in self._store)
        for k in keys:
            self._store.pop(k, None)
        return removed

    async def zadd(self, key: str, mapping: dict[str, float]) -> int:
        if key not in self._zsets:
            self._zsets[key] = {}
        self._zsets[key].update(mapping)
        return len(mapping)

    async def zrangebyscore(self, key: str, min_score: float, max_score: float) -> list[str]:
        zset = self._zsets.get(key, {})
        return [m for m, s in zset.items() if min_score <= s <= max_score]

    async def zremrangebyscore(self, key: str, min_score: float, max_score: float) -> int:
        zset = self._zsets.get(key, {})
        to_remove = [m for m, s in zset.items() if min_score <= s <= max_score]
        for m in to_remove:
            del zset[m]
        return len(to_remove)

    async def zrem(self, key: str, *members: str) -> int:
        zset = self._zsets.get(key, {})
        removed = sum(1 for m in members if m in zset)
        for m in members:
            zset.pop(m, None)
        return removed

    async def aclose(self) -> None:
        pass


@pytest.fixture
def fake_redis() -> FakeRedis:
    return FakeRedis()


@pytest.fixture
async def client(db: AsyncSession, fake_redis: FakeRedis) -> AsyncGenerator[AsyncClient, None]:
    async def _db_override() -> AsyncGenerator[AsyncSession, None]:
        yield db

    async def _redis_override() -> AsyncGenerator[FakeRedis, None]:
        yield fake_redis

    app.dependency_overrides[get_db] = _db_override
    app.dependency_overrides[get_redis] = _redis_override

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()
