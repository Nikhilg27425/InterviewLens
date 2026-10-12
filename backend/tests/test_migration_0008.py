"""
Stage 1 tests — verify migration 0008 on a disposable PostgreSQL database.

Runs synchronously using asyncio.run() — no pytest-asyncio needed.
"""
import asyncio
import os
import pytest
import asyncpg
from alembic import command
from alembic.config import Config
from pathlib import Path
from tests.conftest import make_test_url, PG_USER, PG_PASS, PG_HOST, PG_PORT

BACKEND_DIR = Path(__file__).resolve().parents[1]
TEST_DB = "il_mig_0008_test"


def _make_test_url(db: str) -> str:
    return make_test_url(db)


def _make_alembic_cfg(db: str) -> Config:
    cfg = Config(str(BACKEND_DIR / "alembic.ini"))
    cfg.set_main_option("script_location", str(BACKEND_DIR / "alembic"))
    cfg.set_main_option("sqlalchemy.url", _make_test_url(db))
    return cfg


async def _admin_exec(sql: str):
    conn = await asyncpg.connect(
        host=PG_HOST, port=PG_PORT,
        user=PG_USER, password=PG_PASS,
        database="postgres",
    )
    await conn.execute(sql)
    await conn.close()


async def _test_conn():
    return await asyncpg.connect(
        host=PG_HOST, port=PG_PORT,
        user=PG_USER, password=PG_PASS,
        database=TEST_DB,
    )


@pytest.fixture(scope="module", autouse=True)
def setup_and_teardown():
    """Create disposable DB, run migrations once, tear down after module."""
    _orig = os.environ.get("DATABASE_URL")
    asyncio.run(_admin_exec(f"DROP DATABASE IF EXISTS {TEST_DB}"))
    asyncio.run(_admin_exec(f"CREATE DATABASE {TEST_DB}"))
    os.environ["DATABASE_URL"] = _make_test_url(TEST_DB)
    cfg = _make_alembic_cfg(TEST_DB)
    command.upgrade(cfg, "head")
    yield cfg
    asyncio.run(_admin_exec(f"DROP DATABASE IF EXISTS {TEST_DB}"))
    if _orig is not None:
        os.environ["DATABASE_URL"] = _orig
    else:
        os.environ.pop("DATABASE_URL", None)


def test_single_head(setup_and_teardown):
    """1. alembic heads shows single head 0008."""
    from alembic.script import ScriptDirectory
    sd = ScriptDirectory.from_config(setup_and_teardown)
    heads = sd.get_heads()
    assert heads == ["0008"], f"Expected ['0008'], got {heads}"


def test_alembic_version(setup_and_teardown):
    """2. alembic_version = 0008."""
    async def _check():
        conn = await _test_conn()
        ver = await conn.fetchval("SELECT version_num FROM alembic_version")
        await conn.close()
        return ver
    assert asyncio.run(_check()) == "0008"


def test_new_tables_exist(setup_and_teardown):
    """3. All three new tables exist."""
    async def _check():
        conn = await _test_conn()
        tables = [r["tablename"] for r in await conn.fetch(
            "SELECT tablename FROM pg_tables WHERE schemaname='public'"
        )]
        await conn.close()
        return tables
    tables = asyncio.run(_check())
    for t in ("subscriptions", "payment_records", "processed_webhook_events"):
        assert t in tables, f"Table '{t}' missing; found: {tables}"


def test_new_columns_exist(setup_and_teardown):
    """4. users.subscription_tier and interview_sessions.quota_consumed exist."""
    async def _check():
        conn = await _test_conn()
        uc = [r["column_name"] for r in await conn.fetch(
            "SELECT column_name FROM information_schema.columns "
            "WHERE table_name='users' AND table_schema='public'"
        )]
        sc = [r["column_name"] for r in await conn.fetch(
            "SELECT column_name FROM information_schema.columns "
            "WHERE table_name='interview_sessions' AND table_schema='public'"
        )]
        await conn.close()
        return uc, sc
    uc, sc = asyncio.run(_check())
    assert "subscription_tier" in uc, f"subscription_tier missing from users; cols={uc}"
    assert "quota_consumed" in sc, f"quota_consumed missing from interview_sessions; cols={sc}"


def test_enum_types_exist(setup_and_teardown):
    """5. All three enum types exist in pg_type."""
    async def _check():
        conn = await _test_conn()
        enums = [r["typname"] for r in await conn.fetch(
            "SELECT typname FROM pg_type WHERE typtype='e' "
            "AND typname IN ('subscription_tier','payment_status','fulfillment_status')"
        )]
        await conn.close()
        return enums
    enums = asyncio.run(_check())
    for e in ("subscription_tier", "payment_status", "fulfillment_status"):
        assert e in enums, f"Enum '{e}' missing; found: {enums}"


def test_backfill_counts(setup_and_teardown):
    """6. Every user has exactly one subscription row after backfill."""
    async def _check():
        conn = await _test_conn()
        uc = await conn.fetchval("SELECT COUNT(*) FROM users")
        sc = await conn.fetchval("SELECT COUNT(*) FROM subscriptions")
        await conn.close()
        return uc, sc
    user_count, sub_count = asyncio.run(_check())
    assert sub_count == user_count, (
        f"Expected {user_count} subscription rows, got {sub_count}"
    )


def test_backfill_tiers_are_free(setup_and_teardown):
    """6b. All backfilled subscriptions have tier='free' and limit=5."""
    async def _check():
        conn = await _test_conn()
        bad = await conn.fetchval(
            "SELECT COUNT(*) FROM subscriptions WHERE tier != 'free' OR interviews_limit != 5"
        )
        await conn.close()
        return bad
    assert asyncio.run(_check()) == 0


def test_downgrade_and_upgrade_roundtrip(setup_and_teardown):
    """7. Downgrade -1 then upgrade head round-trips cleanly."""
    cfg = _make_alembic_cfg(TEST_DB)
    command.downgrade(cfg, "-1")
    command.upgrade(cfg, "head")


def test_downgrade_removes_all_objects(setup_and_teardown):
    """8. After downgrade, new tables, columns, and enum types are gone."""
    cfg = _make_alembic_cfg(TEST_DB)
    command.downgrade(cfg, "-1")

    async def _check():
        conn = await _test_conn()
        tables = [r["tablename"] for r in await conn.fetch(
            "SELECT tablename FROM pg_tables WHERE schemaname='public'"
        )]
        uc = [r["column_name"] for r in await conn.fetch(
            "SELECT column_name FROM information_schema.columns "
            "WHERE table_name='users' AND table_schema='public'"
        )]
        sc = [r["column_name"] for r in await conn.fetch(
            "SELECT column_name FROM information_schema.columns "
            "WHERE table_name='interview_sessions' AND table_schema='public'"
        )]
        enums = [r["typname"] for r in await conn.fetch(
            "SELECT typname FROM pg_type WHERE typtype='e' "
            "AND typname IN ('subscription_tier','payment_status','fulfillment_status')"
        )]
        await conn.close()
        return tables, uc, sc, enums

    tables, uc, sc, enums = asyncio.run(_check())
    for t in ("subscriptions", "payment_records", "processed_webhook_events"):
        assert t not in tables, f"Table '{t}' should have been dropped"
    assert "subscription_tier" not in uc
    assert "quota_consumed" not in sc
    assert enums == [], f"Enum types should be dropped; found: {enums}"

    # Re-upgrade so other tests and stages work
    command.upgrade(cfg, "head")
