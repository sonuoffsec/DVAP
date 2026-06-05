# Contributing to DVAP

## Ways to contribute

- **Bug reports** — open an issue with steps to reproduce, expected vs actual behavior, and your OS/Docker version
- **New labs** — the highest-impact contribution; see the lab guide below
- **Benchmark suites** — add new test cases to the existing suites in `backend/app/api/v1/benchmarks.py`
- **Frontend improvements** — the dashboard is Next.js 15 + TailwindCSS; PRs welcome
- **Documentation** — fix errors, improve clarity, add examples

## Development setup

```bash
git clone https://github.com/your-org/dvap
cd dvap
cp .env.example .env        # fill in real values
docker compose up -d        # dev mode with hot reload
```

Backend runs at `http://localhost:8080/api/v1/docs` (Swagger UI).

### Running tests

```bash
docker compose up -d postgres
export TEST_DATABASE_URL=postgresql+asyncpg://dvap:<your-password>@localhost:5432/dvap_test
cd backend && pip install -e ".[dev]" && pytest
```

### Code style

Python: `ruff check . && ruff format .`  
TypeScript: `npm run lint` inside `frontend/`

## Writing a new lab

Each lab lives in `labs/<slug>/` and needs three files:

```
labs/my-lab/
  app.py          FastAPI server with the vulnerable AI endpoint
  Dockerfile      FROM python:3.12-slim, installs deps, copies app
  static/
    index.html    Lab UI (plain HTML + JS, no build step)
```

**Requirements:**
- At least one exploitable endpoint backed by Ollama (`OLLAMA_URL` env var)
- At least one flag in the format `DVAP{...}` embedded in a realistic location
- A `GET /health` endpoint returning `{"status": "ok", "lab": "<slug>"}`
- Resource limits respected — the lab will be run with 512 MB RAM and 0.5 CPU

Add a corresponding JSON definition in `backend/app/data/labs/<slug>.json` following the schema of any existing lab file. The platform seeds this on startup.

## Pull request checklist

- [ ] `ruff check` passes (Python) or `npm run lint` passes (TypeScript)
- [ ] New lab has all three required files and a JSON definition
- [ ] No secrets, real credentials, or personal data in any file
- [ ] PR description explains what changed and why

## Code of conduct

Be direct and technical. Assume good intent. Focus feedback on the code, not the person.
