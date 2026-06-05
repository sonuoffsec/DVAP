<div align="center">

# DVAP - Damn Vulnerable AI Platform

**Train. Break. Defend. AI Systems.**

An open-source platform for AI security training, red/blue teaming, CTF, benchmarking, and research.
Runs 100% locally. No cloud, no paid APIs, no data leaves your machine.

[![License](https://img.shields.io/badge/license-Apache%202.0-blue?style=flat-square)](LICENSE)
[![Docker](https://img.shields.io/badge/docker-ready-2496ED?style=flat-square&logo=docker)](docker-compose.yml)
[![Labs](https://img.shields.io/badge/labs-15-7c3aed?style=flat-square)](#labs)
[![OWASP LLM](https://img.shields.io/badge/OWASP%20LLM-Top%2010-orange?style=flat-square)](#labs)

</div>

---

![DVAP Platform Overview](docs/dvap-diagram.png)

---

## Demo

<video src="https://github.com/user-attachments/assets/24c84b1c-1eb2-4268-befe-08162f38e89f" controls width="100%"></video>

---

## Quick Start

```bash
git clone https://github.com/sonuoffsec/DVAP
cd DVAP
cp .env.example .env
docker compose up -d
```

Open `http://localhost:8080` once all containers are healthy. First run takes 30-60 seconds.

## Development vs Production

```bash
# Development (default) - auto-loads docker-compose.override.yml
# Hot reload for API and frontend, source mounted as volumes
docker compose up -d

# Production - baked images, no volume mounts, 4 uvicorn workers
docker compose -f docker-compose.yml up -d
```

Build images before the production run:
```bash
docker build -t dvap-api:latest --target production ./backend
docker build -t dvap-web:latest --target production ./frontend
```

## Running Tests

Tests require a PostgreSQL instance. Start the stack first:

```bash
docker compose up -d postgres
export TEST_DATABASE_URL=postgresql+asyncpg://dvap:<your-postgres-password>@localhost:5432/dvap_test
cd backend
pip install -e ".[dev]"
pytest
```

## Services

| Service | Port (internal) | Purpose |
|---|---|---|
| PostgreSQL | 5432 | Primary datastore |
| Redis | 6379 | Rate limiting, instance TTL |
| Qdrant | 6333 | Semantic search over findings |
| Ollama | 11434 | Local LLM inference |
| API | 8000 | FastAPI backend |
| Web | 3000 | Next.js frontend |
| Nginx | 8080 (host) | Reverse proxy |

## Labs

15 containerized labs covering the OWASP LLM Top 10 and MITRE ATLAS:

| Category | Labs |
|---|---|
| Prompt & Memory Attacks | Prompt Injection, Memory Poisoning, RAG Poisoning, Tool Output Injection |
| Agent Security | Multi-Agent, Browser Agent, MCP Security, Autonomous Agent |
| Data & Identity | Data Exfiltration, Identity & Trust Abuse, Tool Injection |
| Domain Scenarios | AI Banking, AI Healthcare, Multi-Tenant SaaS, Supply Chain, Developer Platform |

Each lab runs in an isolated Docker container with its own Ollama-backed LLM endpoint, flags, hints, and walkthrough.

## Security Architecture

### Network Isolation

Two Docker networks keep lab traffic separate from platform infrastructure:

- `dvap-internal` (172.20.0.0/24) - PostgreSQL, Redis, Qdrant, API, frontend, Nginx
- `dvap-labs` (172.21.0.0/24) - lab containers and Ollama

Lab containers can reach Ollama and nothing else on the internal network. They cannot reach PostgreSQL, Redis, or Qdrant.

### Docker Socket Access

**Known tradeoff:** The API container mounts `/var/run/docker.sock` to spawn and stop lab containers on demand (Docker-out-of-Docker). This grants the API process root-equivalent access to the host Docker daemon.

This is an intentional design decision. DVAP is a local single-user install for security research and training, not a multi-tenant service. The tradeoff is accepted because:

- There is no network-accessible admin interface that could trigger arbitrary container operations
- Lab container resource limits (512 MB RAM, 0.5 CPU) prevent resource exhaustion
- Lab images are built from controlled Dockerfiles in this repository

If you are deploying DVAP in a shared or networked environment, replace the socket mount with a rootless Docker socket or Podman socket (`/run/user/1000/podman/podman.sock`) and restrict API network access accordingly.

### Instance TTL

Lab instances stop automatically after 1 hour via Redis TTL keys. Call `POST /api/v1/instances/cleanup` to trigger early cleanup.

### Rate Limiting

Flag submissions are rate-limited to 15 attempts per 60-second window per session token.

## Environment Variables

See `.env.example` for all variables. Key ones to change before any networked deployment:

```
SECRET_KEY=          # strong random value for HMAC signing
POSTGRES_PASSWORD=   # change from the default
REDIS_PASSWORD=      # change from the default
```

## Upgrading

One command brings your install up to date:

```bash
make upgrade
```

This runs `git pull` then rebuilds and restarts all containers. Database migrations run automatically on every API container start.

Without `make`:
```bash
git pull
docker compose up -d --build
```

### What upgrades automatically
- Backend code and API endpoints
- Frontend dashboard
- Database schema (Alembic migrations)
- Lab definitions

### What is never touched
- Your data (findings, research sessions, benchmark results, campaigns)
- Your `.env` file

### Check for new environment variables

```bash
diff .env .env.example
```

Add any missing variables before restarting.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for how to add labs, run tests, and submit pull requests.

## License

Apache 2.0 - see [LICENSE](LICENSE) for the full text.
