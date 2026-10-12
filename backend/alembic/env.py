import asyncio
from logging.config import fileConfig
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import pool
from alembic import context

from app.core.config import settings
from app.db.base import Base

# Import all models so Alembic can detect them
import app.models  # noqa: F401

config = context.config
# NOTE: URL is intentionally NOT set here at module level, because env.py is
# only imported once by Python. The URL is read fresh inside run_async_migrations
# and run_migrations_offline so that test fixtures can pass different cfg objects.

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    # Re-read URL from context.config each call (tests may swap the config object)
    url = context.config.get_main_option("sqlalchemy.url") or settings.DATABASE_URL
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection):
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    # Re-read URL from context.config each call — allows tests to inject a
    # different database URL by passing their own Config to command.upgrade.
    url = context.config.get_main_option("sqlalchemy.url") or settings.DATABASE_URL
    engine = create_async_engine(url, poolclass=pool.NullPool)
    async with engine.begin() as conn:
        await conn.run_sync(do_run_migrations)
    await engine.dispose()


def run_migrations_online() -> None:
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
