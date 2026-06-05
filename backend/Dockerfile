# syntax=docker/dockerfile:1
FROM python:3.12 AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app


FROM base AS development

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

COPY pyproject.toml ./
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install \
    "fastapi[all]>=0.115.0" \
    "uvicorn[standard]>=0.30.0" \
    uvloop \
    "sqlalchemy>=2.0.36" \
    asyncpg \
    "alembic>=1.14.0" \
    "pydantic>=2.9.0" \
    "pydantic-settings>=2.6.0" \
    "redis[asyncio]>=5.1.0" \
    httpx \
    loguru \
    "python-jose[cryptography]" \
    "passlib[bcrypt]" \
    "qdrant-client[async]>=1.9.0" \
    orjson \
    python-multipart \
    aiofiles \
    "docker>=7.0.0" \
    "markdown>=3.7" \
    pytest \
    pytest-asyncio \
    ruff

ENTRYPOINT ["/entrypoint.sh"]
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload", "--reload-dir", "app"]


FROM base AS production

RUN groupadd --system --gid 1001 dvap \
    && useradd --system --uid 1001 --gid dvap dvap

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

COPY pyproject.toml ./
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install \
    "fastapi[all]>=0.115.0" \
    "uvicorn[standard]>=0.30.0" \
    uvloop \
    "sqlalchemy>=2.0.36" \
    asyncpg \
    "alembic>=1.14.0" \
    "pydantic>=2.9.0" \
    "pydantic-settings>=2.6.0" \
    "redis[asyncio]>=5.1.0" \
    httpx \
    loguru \
    "python-jose[cryptography]" \
    "passlib[bcrypt]" \
    "qdrant-client[async]>=1.9.0" \
    orjson \
    python-multipart \
    aiofiles \
    "docker>=7.0.0" \
    "markdown>=3.7"

COPY app ./app
RUN chown -R dvap:dvap /app
USER dvap

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -sf http://localhost:8000/api/v1/health || exit 1

ENTRYPOINT ["/entrypoint.sh"]
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4", "--loop", "uvloop"]
