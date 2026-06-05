from __future__ import annotations

import time

import pytest

from app.services import rate_limiter


@pytest.mark.asyncio
async def test_flag_rate_allows_first_attempt(fake_redis):
    allowed, remaining = await rate_limiter.check_flag_rate(fake_redis, "session-a")
    assert allowed is True
    assert remaining == 14


@pytest.mark.asyncio
async def test_flag_rate_allows_up_to_limit(fake_redis):
    for i in range(15):
        allowed, _ = await rate_limiter.check_flag_rate(fake_redis, "session-b")
        assert allowed is True

    allowed, remaining = await rate_limiter.check_flag_rate(fake_redis, "session-b")
    assert allowed is False
    assert remaining == 0


@pytest.mark.asyncio
async def test_flag_rate_isolated_per_session(fake_redis):
    for _ in range(15):
        await rate_limiter.check_flag_rate(fake_redis, "session-c")

    allowed, _ = await rate_limiter.check_flag_rate(fake_redis, "session-d")
    assert allowed is True


@pytest.mark.asyncio
async def test_register_and_check_instance_ttl(fake_redis):
    await rate_limiter.register_instance(fake_redis, "tok-xyz")
    alive = await rate_limiter.instance_ttl_alive(fake_redis, "tok-xyz")
    assert alive is True


@pytest.mark.asyncio
async def test_revoke_instance_removes_ttl(fake_redis):
    await rate_limiter.register_instance(fake_redis, "tok-abc")
    await rate_limiter.revoke_instance(fake_redis, "tok-abc")
    alive = await rate_limiter.instance_ttl_alive(fake_redis, "tok-abc")
    assert alive is False


@pytest.mark.asyncio
async def test_pop_expired_sessions(fake_redis):
    past_score = int(time.time()) - 100
    await fake_redis.zadd("dvap:instances:active", {"expired-tok": past_score})

    future_score = int(time.time()) + 3600
    await fake_redis.zadd("dvap:instances:active", {"live-tok": future_score})

    expired = await rate_limiter.pop_expired_sessions(fake_redis)
    assert "expired-tok" in expired
    assert "live-tok" not in expired
