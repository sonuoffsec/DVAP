#!/bin/sh
set -e

python3 - <<'EOF'
import asyncio, os, sys, subprocess

async def main():
    import asyncpg
    dsn = os.environ["DATABASE_URL"].replace("postgresql+asyncpg://", "postgresql://")
    try:
        conn = await asyncpg.connect(dsn=dsn)
        has_version = await conn.fetchval(
            "SELECT to_regclass('public.alembic_version')"
        )
        has_labs = await conn.fetchval(
            "SELECT to_regclass('public.labs')"
        )
        await conn.close()

        if has_labs and not has_version:
            print("Existing install detected — stamping migration history at head.")
            subprocess.run(["alembic", "stamp", "head"], check=True)
    except Exception as exc:
        print(f"Pre-migration check skipped: {exc}", file=sys.stderr)

asyncio.run(main())
EOF

echo "Running database migrations..."
alembic upgrade head
echo "Migrations complete."

exec "$@"
