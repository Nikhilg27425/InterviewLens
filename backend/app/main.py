from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

from app.core.config import settings
from app.db.base import engine, Base
from app.api.routes import auth, problems, sessions, submissions, signals, analytics, execute
from app.websocket.router import router as ws_router

# Import all models so SQLAlchemy metadata is populated before create_all
import app.models  # noqa: F401


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create all tables on startup (use Alembic migrations in production)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    await engine.dispose()


app = FastAPI(
    title="InterviewLens API",
    version="1.0.0",
    description="AI-powered technical interview platform — backend API",
    lifespan=lifespan,
)

# ── Middleware ────────────────────────────────────────────────────────────────

app.add_middleware(GZipMiddleware, minimum_size=1000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── REST routes ───────────────────────────────────────────────────────────────

API = "/api"
app.include_router(auth.router,        prefix=API)
app.include_router(problems.router,    prefix=API)
app.include_router(sessions.router,    prefix=API)
app.include_router(submissions.router, prefix=API)
app.include_router(signals.router,     prefix=API)
app.include_router(analytics.router,   prefix=API)
app.include_router(execute.router,     prefix=API)   # Judge0 CORS proxy

# ── WebSocket ─────────────────────────────────────────────────────────────────

app.include_router(ws_router)


# ── Health check ─────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {"status": "ok", "version": "1.0.0"}
