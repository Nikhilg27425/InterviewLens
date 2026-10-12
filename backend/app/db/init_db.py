"""Bring the database schema up to date. Safe to run on every start.

- Fresh database: create all tables from the models, then stamp Alembic head.
- Existing database never tracked by Alembic (created by create_all): stamp the
  initial revision, then upgrade — later migrations are idempotent.
- Tracked database: upgrade to head.
"""
import asyncio
from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import inspect, pool
from sqlalchemy.ext.asyncio import create_async_engine

from app.core.config import settings
from app.db.base import Base
import app.models  # noqa — registers all models with metadata

BACKEND_DIR = Path(__file__).resolve().parents[2]


def _make_alembic_cfg() -> Config:
    """Build an Alembic Config with the URL explicitly set from settings.

    This deliberately overrides whatever sqlalchemy.url is in alembic.ini so
    that the deployed container never connects to the localhost placeholder that
    alembic.ini carries as a development convenience.
    """
    cfg = Config(str(BACKEND_DIR / "alembic.ini"))
    cfg.set_main_option("script_location", str(BACKEND_DIR / "alembic"))
    # Override the ini-file URL with the real runtime URL from settings.
    # settings.DATABASE_URL is populated from the DATABASE_URL env var which
    # Render injects at deploy time; it is never localhost in production.
    cfg.set_main_option("sqlalchemy.url", settings.DATABASE_URL)
    return cfg


async def _prepare() -> bool | None:
    """Create tables on a fresh DB. Returns True for a fresh DB (stamp head), False
    for a DB that predates Alembic tracking (stamp 0001), None if already tracked."""
    # Own NullPool engine: this loop ends before Alembic starts its own
    engine = create_async_engine(settings.DATABASE_URL, poolclass=pool.NullPool)
    try:
        async with engine.begin() as conn:
            tables = set(await conn.run_sync(lambda c: inspect(c).get_table_names()))
            if "alembic_version" in tables:
                return None
            if "users" in tables:
                return False
            await conn.run_sync(Base.metadata.create_all)
            return True
    finally:
        await engine.dispose()


def init():
    cfg = _make_alembic_cfg()

    fresh = asyncio.run(_prepare())
    if fresh is True:
        command.stamp(cfg, "head")
    elif fresh is False:
        command.stamp(cfg, "0001")

    command.upgrade(cfg, "head")
    print("✓ Database schema is up to date.")


if __name__ == "__main__":
    init()
