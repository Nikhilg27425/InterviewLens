"""
Shared pytest configuration.

Provides a shared helper that builds a PostgreSQL test URL from the BASE_URL
(pointing at the real interviewlens DB host/port/credentials) without ever
reading the mutated DATABASE_URL env var. Each test module uses a different
database name so they can run in any order within a single pytest process.
"""
import re

# ── Read ONCE from the real .env value, before any fixture mutates DATABASE_URL ──
_BASE_URL = "postgresql+asyncpg://postgres:password1234@localhost:5432/interviewlens"

_pg_url = re.sub(r"^postgresql\+asyncpg://", "postgresql://", _BASE_URL)
_m = re.match(r"postgresql://([^:]+):([^@]+)@([^:/]+):?(\d+)?/(.+)", _pg_url)
assert _m, f"Cannot parse base DB URL: {_BASE_URL}"
PG_USER, PG_PASS, PG_HOST, PG_PORT_STR, _ = _m.groups()
PG_PORT = int(PG_PORT_STR or 5432)


def make_test_url(db: str) -> str:
    """Build an asyncpg URL for a disposable test database."""
    return f"postgresql+asyncpg://{PG_USER}:{PG_PASS}@{PG_HOST}:{PG_PORT}/{db}"
