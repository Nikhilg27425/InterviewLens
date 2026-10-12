"""
Stage 5 tests — quota enforcement in session routes, against real PostgreSQL.
"""
import asyncio
import os
import threading
import uuid
from unittest.mock import patch

import asyncpg
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from pathlib import Path
from tests.conftest import make_test_url, PG_USER, PG_PASS, PG_HOST, PG_PORT

BACKEND_DIR = Path(__file__).resolve().parents[1]
TEST_DB = "il_quota_test"
TEST_URL = make_test_url(TEST_DB)


async def _admin(sql: str):
    c = await asyncpg.connect(
        host=PG_HOST, port=PG_PORT,
        user=PG_USER, password=PG_PASS, database="postgres",
    )
    await c.execute(sql)
    await c.close()


async def _terminate_and_drop():
    c = await asyncpg.connect(
        host=PG_HOST, port=PG_PORT,
        user=PG_USER, password=PG_PASS, database="postgres",
    )
    await c.execute(f"""
        SELECT pg_terminate_backend(pid) FROM pg_stat_activity
        WHERE datname = '{TEST_DB}' AND pid <> pg_backend_pid()
    """)
    await c.execute(f"DROP DATABASE IF EXISTS {TEST_DB}")
    await c.close()


async def _ensure_enums():
    c = await asyncpg.connect(
        host=PG_HOST, port=PG_PORT,
        user=PG_USER, password=PG_PASS, database=TEST_DB,
    )
    for stmt in [
        "DO $$ BEGIN CREATE TYPE userrole AS ENUM ('interviewer','candidate','admin'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;",
        "DO $$ BEGIN CREATE TYPE sessionstatus AS ENUM ('scheduled','waiting','active','completed','cancelled'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;",
        "DO $$ BEGIN CREATE TYPE difficulty AS ENUM ('Easy','Medium','Hard'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;",
        "ALTER TABLE users ALTER COLUMN role TYPE userrole USING role::userrole",
        "ALTER TABLE interview_sessions ALTER COLUMN status TYPE sessionstatus USING status::sessionstatus",
    ]:
        await c.execute(stmt)
    await c.close()


@pytest.fixture(scope="module", autouse=True)
def setup_db():
    from alembic import command
    from alembic.config import Config

    asyncio.run(_admin(f"DROP DATABASE IF EXISTS {TEST_DB}"))
    asyncio.run(_admin(f"CREATE DATABASE {TEST_DB}"))
    os.environ["DATABASE_URL"] = TEST_URL

    cfg = Config(str(BACKEND_DIR / "alembic.ini"))
    cfg.set_main_option("script_location", str(BACKEND_DIR / "alembic"))
    cfg.set_main_option("sqlalchemy.url", TEST_URL)
    command.upgrade(cfg, "head")
    asyncio.run(_ensure_enums())

    yield

    asyncio.run(_terminate_and_drop())
    os.environ.pop("DATABASE_URL", None)


@pytest.fixture(scope="module")
def client():
    from app.main import app as _app
    from app.db.base import get_db

    _test_engine = create_async_engine(TEST_URL, echo=False)
    _TestSession = async_sessionmaker(_test_engine, expire_on_commit=False, class_=AsyncSession)

    async def _override_get_db():
        async with _TestSession() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise
            finally:
                await session.close()

    _app.dependency_overrides[get_db] = _override_get_db

    import app.db.base as _db_base
    import app.api.routes.sessions as _sess_routes
    _orig_sl = _db_base.AsyncSessionLocal
    _db_base.AsyncSessionLocal = _TestSession
    _sess_routes.AsyncSessionLocal = _TestSession

    with TestClient(_app, raise_server_exceptions=True) as c:
        yield c

    _app.dependency_overrides.pop(get_db, None)
    _db_base.AsyncSessionLocal = _orig_sl
    _sess_routes.AsyncSessionLocal = _orig_sl
    asyncio.run(_test_engine.dispose())


def _register_and_login(client) -> tuple[str, uuid.UUID]:
    email = f"q_{uuid.uuid4().hex[:8]}@example.com"
    r = client.post("/api/auth/register", json={
        "email": email, "password": "Test1234!", "full_name": "Quota User",
    })
    assert r.status_code == 201, r.text
    user_id = uuid.UUID(r.json()["id"])
    lr = client.post("/api/auth/login", json={"email": email, "password": "Test1234!"})
    return lr.json()["access_token"], user_id


def _auth(token): return {"Authorization": f"Bearer {token}"}


def _create_session(client, token, title="Test Session"):
    return client.post("/api/sessions", json={"title": title, "send_invite": False},
                       headers=_auth(token))


# ── Tests ─────────────────────────────────────────────────────────────────────

def test_free_tier_5_sessions_succeed(client):
    """1. Free user creates 5 sessions → all succeed, interviews_used=5."""
    token, _ = _register_and_login(client)
    for i in range(5):
        r = _create_session(client, token, f"Session {i+1}")
        assert r.status_code == 201, f"Session {i+1} failed: {r.text}"

    me = client.get("/api/subscriptions/me", headers=_auth(token))
    assert me.json()["interviews_used"] == 5


def test_free_tier_6th_session_blocked(client):
    """2. Free user attempts 6th session → 402 with interview_limit_reached."""
    token, _ = _register_and_login(client)
    for _ in range(5):
        _create_session(client, token)

    r = _create_session(client, token, "6th Session")
    assert r.status_code == 402
    detail = r.json()["detail"]
    assert detail["code"] == "interview_limit_reached"
    assert detail["tier"] == "free"
    assert detail["used"] == 5
    assert detail["limit"] == 5


def test_cancel_returns_credit(client):
    """3. Cancel a session → interviews_used decrements, 6th now succeeds."""
    token, _ = _register_and_login(client)
    session_ids = []
    for _ in range(5):
        r = _create_session(client, token)
        session_ids.append(r.json()["id"])

    # Cancel session 3
    cancel_r = client.post(f"/api/sessions/{session_ids[2]}/cancel", headers=_auth(token))
    assert cancel_r.status_code == 200

    me = client.get("/api/subscriptions/me", headers=_auth(token))
    assert me.json()["interviews_used"] == 4

    # 6th session now succeeds
    r = _create_session(client, token, "Now Allowed")
    assert r.status_code == 201


def test_cancel_already_cancelled_idempotent(client):
    """4. Cancel an already-cancelled session → 200, no quota change."""
    token, _ = _register_and_login(client)
    r = _create_session(client, token)
    sid = r.json()["id"]

    client.post(f"/api/sessions/{sid}/cancel", headers=_auth(token))
    me_before = client.get("/api/subscriptions/me", headers=_auth(token)).json()

    # Second cancel
    r2 = client.post(f"/api/sessions/{sid}/cancel", headers=_auth(token))
    assert r2.status_code == 200

    me_after = client.get("/api/subscriptions/me", headers=_auth(token)).json()
    assert me_before["interviews_used"] == me_after["interviews_used"]


def test_cancel_completed_session_returns_409(client):
    """5. Cancel a completed session → 409 (existing behavior preserved)."""
    token, _ = _register_and_login(client)
    r = _create_session(client, token)
    sid = r.json()["id"]
    client.post(f"/api/sessions/{sid}/start", headers=_auth(token))
    client.post(f"/api/sessions/{sid}/end", headers=_auth(token))
    r2 = client.post(f"/api/sessions/{sid}/cancel", headers=_auth(token))
    assert r2.status_code == 409


@patch("app.api.routes.subscriptions.rzp.verify_webhook_signature")
@patch("app.api.routes.subscriptions.rzp.create_order")
def test_enterprise_user_unlimited(mock_create, mock_verify, client):
    """6. Enterprise user creates 20 sessions → all succeed."""
    order_id = f"order_{uuid.uuid4().hex[:8]}"
    payment_id = f"pay_{uuid.uuid4().hex[:8]}"
    event_id = f"evt_{uuid.uuid4().hex[:12]}"

    mock_create.return_value = {
        "order_id": order_id, "amount": 50000,
        "currency": "INR", "key_id": "rzp_test",
    }
    mock_verify.return_value = True

    token, _ = _register_and_login(client)
    client.post("/api/subscriptions/create-order",
                json={"tier": "enterprise"}, headers=_auth(token))

    # Webhook activates enterprise
    import json as _json
    body = _json.dumps({
        "id": event_id, "event": "payment.captured",
        "payload": {"payment": {"entity": {
            "id": payment_id, "order_id": order_id,
            "amount": 50000, "currency": "INR", "status": "captured",
        }}}
    }).encode()
    client.post("/api/subscriptions/webhook", content=body,
                headers={"x-razorpay-signature": "v", "content-type": "application/json"})

    for i in range(20):
        r = _create_session(client, token, f"Ent {i+1}")
        assert r.status_code == 201, f"Enterprise session {i+1} failed: {r.text}"


def test_concurrent_creates_exactly_5_succeed(client):
    """7. 6 concurrent POST /sessions with 5 remaining → exactly 5 succeed."""
    token, _ = _register_and_login(client)

    results = []

    def _create():
        r = client.post("/api/sessions",
                        json={"title": "Concurrent", "send_invite": False},
                        headers=_auth(token))
        results.append(r.status_code)

    threads = [threading.Thread(target=_create) for _ in range(6)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()

    assert results.count(201) == 5, f"Expected 5 successes, got {results}"
    assert results.count(402) == 1, f"Expected 1 blocked, got {results}"

    me = client.get("/api/subscriptions/me", headers=_auth(token))
    assert me.json()["interviews_used"] == 5


def test_concurrent_cancels_decrement_by_1(client):
    """8. 2 concurrent cancels for same session → interviews_used decrements by exactly 1."""
    token, _ = _register_and_login(client)
    r = _create_session(client, token)
    sid = r.json()["id"]

    before = client.get("/api/subscriptions/me", headers=_auth(token)).json()["interviews_used"]

    statuses = []

    def _cancel():
        r = client.post(f"/api/sessions/{sid}/cancel", headers=_auth(token))
        statuses.append(r.status_code)

    t1 = threading.Thread(target=_cancel)
    t2 = threading.Thread(target=_cancel)
    t1.start(); t2.start()
    t1.join(); t2.join()

    assert all(s == 200 for s in statuses), f"Unexpected statuses: {statuses}"
    after = client.get("/api/subscriptions/me", headers=_auth(token)).json()["interviews_used"]
    assert after == before - 1, (
        f"Expected interviews_used to drop by 1: {before} → {after}"
    )


@patch("app.services.email.send_email")
def test_smtp_failure_does_not_rollback_session(mock_send, client):
    """9. send_invite=True with SMTP failure → session still created, quota consumed."""
    import asyncio as aio
    from app.services.email import DeliveryResult

    # Make send_email raise to simulate SMTP failure
    async def _fail(*a, **kw):
        raise ConnectionError("SMTP down")
    mock_send.side_effect = _fail

    token, _ = _register_and_login(client)
    r = client.post("/api/sessions", json={
        "title": "With Invite",
        "send_invite": True,
        "candidate_email": "candidate@example.com",
    }, headers=_auth(token))

    # Session must be created regardless of invite failure
    assert r.status_code == 201, r.text

    me = client.get("/api/subscriptions/me", headers=_auth(token))
    assert me.json()["interviews_used"] == 1
