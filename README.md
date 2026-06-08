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

## What is DVAP?

DVAP is an open-source AI security research, training, benchmarking, and red teaming platform designed to help security professionals, AI engineers, researchers, students, and organizations understand how modern AI systems fail — and how to defend them.

Built for the AI era, DVAP provides intentionally vulnerable AI applications, agents, RAG systems, MCP integrations, and domain-specific environments that can be attacked, analyzed, benchmarked, and secured.

Unlike cloud-based AI playgrounds, DVAP runs entirely on your machine.

**No cloud. No subscriptions. No API costs. No vendor lock-in.**

---

## Why DVAP?

Modern AI applications introduce entirely new attack surfaces:

- Prompt Injection
- Memory Poisoning
- RAG Poisoning
- Tool Abuse
- MCP Exploitation
- Multi-Agent Attacks
- Autonomous Agent Manipulation
- Data Exfiltration
- Identity & Trust Failures
- AI Supply Chain Risks

Yet there is no single platform that allows researchers to safely learn, practice, benchmark, and validate these attacks in one place.

DVAP aims to become the definitive open-source platform for AI security education, research, and experimentation.

---

## Key Features

**AI Security Labs**
15 intentionally vulnerable labs covering real-world AI attack techniques.

**Research Workspace**
Inspect prompts, memory, tool calls, retrieved documents, agent actions, and attack chains.

**Security Benchmarking**
Evaluate local and external models against AI security attack suites.

**Capture The Flag (CTF)**
Learn AI security through guided challenges, flags, hints, and walkthroughs.

**Reporting Engine**
Generate professional findings and benchmark reports mapped to OWASP LLM Top 10, MITRE ATLAS, CWE, and CVSS.

**100% Local**
Run everything on your own machine. Your prompts, data, findings, and experiments never leave your environment.

---

![DVAP Platform Overview](docs/dvap-diagram.png)

---

## Demo

<video src="https://github.com/user-attachments/assets/d7c920cc-7e4a-4599-94a6-ec8b481fb7bb
" controls width="100%"></video>

---

## Screenshots

<img src="docs/screenshot-dashboard.png" width="100%"/>
<br/><br/>

<img src="docs/screenshot-labs.png" width="49%"/> <img src="docs/screenshot-ctf.png" width="49%"/>
<br/><br/>

<img src="docs/screenshot-benchmarks.png" width="49%"/> <img src="docs/screenshot-research.png" width="49%"/>
<br/><br/>

<img src="docs/screenshot-findings.png" width="100%"/>

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
