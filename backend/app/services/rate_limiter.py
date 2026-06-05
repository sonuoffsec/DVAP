from __future__ import annotations

import redis.asyncio as aioredis

_FLAG_WINDOW_SECONDS = 60
_FLAG_MAX_ATTEMPTS = 15

_INSTANCE_TTL_SECONDS = 3600  # 1 hour per lab instance

_KEY_FLAG_RATE = "dvap:ratelimit:flag:{session}"
_KEY_INSTANCE = "dvap:instance:ttl:{session}"
_ZSET_INSTANCES = "dvap:instances:active"


async def check_flag_rate(redis: aioredis.Redis, session_token: str) -> tuple[bool, int]:
    key = _KEY_FLAG_RATE.format(session=session_token)
    count = await redis.incr(key)
    if count == 1:
        await redis.expire(key, _FLAG_WINDOW_SECONDS)
    remaining = max(0, _FLAG_MAX_ATTEMPTS - count)
    return count <= _FLAG_MAX_ATTEMPTS, remaining


async def register_instance(redis: aioredis.Redis, session_token: str) -> None:
    import time
    expiry = int(time.time()) + _INSTANCE_TTL_SECONDS
    await redis.setex(
        _KEY_INSTANCE.format(session=session_token),
        _INSTANCE_TTL_SECONDS,
        "1",
    )
    await redis.zadd(_ZSET_INSTANCES, {session_token: expiry})


async def instance_ttl_alive(redis: aioredis.Redis, session_token: str) -> bool:
    return await redis.exists(_KEY_INSTANCE.format(session=session_token)) > 0


async def revoke_instance(redis: aioredis.Redis, session_token: str) -> None:
    await redis.delete(_KEY_INSTANCE.format(session=session_token))
    await redis.zrem(_ZSET_INSTANCES, session_token)


async def pop_expired_sessions(redis: aioredis.Redis) -> list[str]:
    import time
    now = int(time.time())
    expired: list[str] = await redis.zrangebyscore(_ZSET_INSTANCES, 0, now)
    if expired:
        await redis.zremrangebyscore(_ZSET_INSTANCES, 0, now)
    return expired
