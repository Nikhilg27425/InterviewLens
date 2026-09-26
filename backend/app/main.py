from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
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


# ── Frontend (production) ────────────────────────────────────────────────────
# The Docker image bundles the built React app; serve it from the same origin
# so the API, WebSocket and SPA share one URL. Absent in local dev (Vite serves it).

STATIC_DIR = Path(settings.STATIC_DIR).resolve()

if (STATIC_DIR / "index.html").is_file():
    if (STATIC_DIR / "assets").is_dir():
        app.mount("/assets", StaticFiles(directory=STATIC_DIR / "assets"), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def spa(full_path: str):
        if full_path.startswith(("api/", "ws/")):
            raise HTTPException(status_code=404, detail="Not found")
        candidate = (STATIC_DIR / full_path).resolve()
        if full_path and candidate.is_file() and STATIC_DIR in candidate.parents:
            return FileResponse(candidate)
        # Client-side route — let React Router handle it
        return FileResponse(STATIC_DIR / "index.html", headers={"Cache-Control": "no-cache"})
