# Contributing to DVAP

First off, thank you for taking the time to contribute. DVAP is an open-source project and every contribution matters, whether it is a bug report, a new lab, a documentation fix, or a feature idea.

---

## Table of Contents

- [Ways to Contribute](#ways-to-contribute)
- [Development Setup](#development-setup)
- [Writing a New Lab](#writing-a-new-lab)
- [Adding Benchmark Suites](#adding-benchmark-suites)
- [Code Style](#code-style)
- [Pull Request Checklist](#pull-request-checklist)
- [Reporting Security Issues](#reporting-security-issues)
- [Code of Conduct](#code-of-conduct)

---

## Ways to Contribute

| Type | Description | Impact |
|---|---|---|
| New lab | Add a new vulnerable AI environment | High |
| Bug report | Open an issue with reproduction steps | High |
| Benchmark suite | Add test cases for new attack categories | Medium |
| Frontend improvement | Improve the dashboard UI or UX | Medium |
| Documentation | Fix errors, add examples, improve clarity | Medium |
| Lab JSON definitions | Improve threat models, hints, walkthroughs | Low |

---

## Development Setup

**Clone and start:**
```bash
git clone https://github.com/sonuoffsec/DVAP
cd DVAP
cp .env.example .env
docker compose up -d
```

The platform runs at `http://localhost:8080`.
API docs (Swagger UI) at `http://localhost:8080/api/v1/docs`.

**Running tests:**
```bash
docker compose up -d postgres
export TEST_DATABASE_URL=postgresql+asyncpg://dvap:<your-password>@localhost:5432/dvap_test
cd backend
pip install -e ".[dev]"
pytest
```

**Watching logs:**
```bash
make logs-api    # API logs
make logs-web    # Frontend logs
make logs        # All services
```

---

## Writing a New Lab

New labs are the highest-impact contribution. Each lab teaches a specific AI attack technique through hands-on exploitation.

**File structure:**

```
labs/<your-lab-slug>/
    app.py              FastAPI server with the vulnerable AI endpoint
    Dockerfile          Container definition
    requirements.txt    Python dependencies
    static/
        index.html      Lab UI (plain HTML + JS, no build step needed)
```

**Requirements for a valid lab:**

- At least one exploitable endpoint backed by Ollama via the `OLLAMA_URL` environment variable
- At least one flag in the format `DVAP{...}` embedded in a realistic location
- A `GET /health` endpoint returning `{"status": "ok", "lab": "<slug>"}`
- Resource usage within limits: 512 MB RAM and 0.5 CPU (enforced by the platform)
- The vulnerability must be intentional and educational, not accidental

**Lab JSON definition:**

Add a corresponding file at `backend/app/data/labs/<slug>.json`. Copy the structure from any existing lab file. Key fields:

```json
{
  "slug": "your-lab-slug",
  "name": "Your Lab Name",
  "description": "What the lab teaches",
  "category": "prompt_injection",
  "difficulty": "intermediate",
  "objectives": ["Objective 1", "Objective 2"],
  "challenges": [
    {
      "slug": "challenge-1",
      "name": "Challenge Name",
      "description": "What to do",
      "difficulty": "intermediate",
      "points": 100,
      "flag": "DVAP{your_flag_here}",
      "hints": ["Hint 1", "Hint 2"]
    }
  ]
}
```

The platform seeds this automatically on startup.

**Lab categories:**

Use one of the existing categories: `prompt_injection`, `memory_poisoning`, `rag_poisoning`, `tool_injection`, `mcp_security`, `browser_agent`, `multi_agent`, `autonomous_agent`, `data_exfiltration`, `identity_trust`, `banking`, `healthcare`, `multi_tenant`, `supply_chain`, `developer_platform`

---

## Adding Benchmark Suites

Benchmark suites live in `backend/app/api/v1/benchmarks.py`.

Each suite is a list of test cases. Each test case has:
- A prompt designed to probe a specific weakness
- Expected behavior (should the model resist or comply?)
- A scoring method (pass/fail)

Follow the pattern of existing suites (`prompt-injection`, `jailbreak-resistance`, `data-exfiltration`).

---

## Code Style

**Python:**
```bash
ruff check app/
ruff format app/
```

**TypeScript:**
```bash
cd frontend
npm run lint
```

**Commit messages:** Keep them short and descriptive. Start with a verb.
```
add multi-agent lab with trust boundary exploit
fix benchmark score calculation for partial passes
update prompt injection lab with new challenge
```

---

## Pull Request Checklist

Before submitting a PR, make sure:

- [ ] `ruff check` passes (Python) or `npm run lint` passes (TypeScript)
- [ ] New lab has all four required files (`app.py`, `Dockerfile`, `requirements.txt`, `static/index.html`)
- [ ] New lab has a JSON definition in `backend/app/data/labs/`
- [ ] No secrets, real credentials, API keys, or personal data in any file
- [ ] Flags follow the format `DVAP{...}`
- [ ] PR description explains what changed and why
- [ ] If adding a new lab, it has been tested locally with at least one Ollama model

---

## Reporting Security Issues

If you find a vulnerability in the DVAP platform itself (not inside a lab), please follow the responsible disclosure process in [SECURITY.md](SECURITY.md).

Do not open a public GitHub issue for platform security vulnerabilities.

---

## Code of Conduct

Be direct and technical. Assume good intent. Focus feedback on the code, not the person.

We are building something for the AI security community. Everyone is welcome regardless of experience level.
