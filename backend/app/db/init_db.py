"""Create all tables. Run this instead of alembic during early development."""
import asyncio
from app.db.base import engine, Base
import app.models  # noqa — registers all models with metadata


async def init():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("✓ All tables created.")
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(init())
