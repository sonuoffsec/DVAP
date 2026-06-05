FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 `
    PYTHONUNBUFFERED=1

WORKDIR /app

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

RUN mkdir -p /app/secrets && \
    printf '[mcp-server]\nenv=production\nversion=2.1.4\nflag=DVAP{mcp_ssrf_1nt3rn4l_r34ch}\nauth=localhost-only\ntoken=mcp-internal-9f3a2b\n' \
    > /app/secrets/server.conf

COPY app.py ./
COPY static ./static

EXPOSE 8000

HEALTHCHECK --interval=10s --timeout=5s --retries=3 `
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')"

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]