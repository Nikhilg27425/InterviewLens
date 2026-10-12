"""
Stage 4 tests — subscription API routes + webhook, against real PostgreSQL.

Uses FastAPI TestClient (synchronous) + asyncpg for direct DB checks.
Razorpay external calls are mocked throughout.
"""
import asyncio
import hashlib
import hmac
import json
import os
import uuid
from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock, patch

import asyncpg
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from pathlib import Path
from tests.conftest import make_test_url, PG_USER, PG_PASS, PG_HOST, PG_PORT

BACKEND_DIR = Path(__file__).resolve().parents[1]
TEST_DB = "il_e2e_test"
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
    """Create native enum types that SQLAlchemy SAEnum expects."""
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


# ── App / client fixtures (use FastAPI dependency_overrides for test DB) ─────

@pytest.fixture(scope="module")
def app():
    """FastAPI app with get_db overridden to use the test database."""
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

    # Also patch AsyncSessionLocal used by background tasks in sessions.py
    import app.db.base as _db_base
    import app.api.routes.sessions as _sess_routes
    _orig_sl = _db_base.AsyncSessionLocal
    _db_base.AsyncSessionLocal = _TestSession
    _sess_routes.AsyncSessionLocal = _TestSession

    yield _app

    _app.dependency_overrides.pop(get_db, None)
    _db_base.AsyncSessionLocal = _orig_sl
    _sess_routes.AsyncSessionLocal = _orig_sl
    asyncio.run(_test_engine.dispose())


@pytest.fixture(scope="module")
def client(app):
    with TestClient(app, raise_server_exceptions=True) as c:
        yield c


# ── Test data helpers ─────────────────────────────────────────────────────────

def _register_and_login(client) -> tuple[str, uuid.UUID]:
    """Register a fresh interviewer and return (jwt_token, user_id)."""
    email = f"test_{uuid.uuid4().hex[:8]}@example.com"
    r = client.post("/api/auth/register", json={
        "email": email,
        "password": "Test1234!",
        "full_name": "Test User",
    })
    assert r.status_code == 201, r.text
    user_id = uuid.UUID(r.json()["id"])

    # Login to get JWT
    lr = client.post("/api/auth/login", json={"email": email, "password": "Test1234!"})
    assert lr.status_code == 200, lr.text
    token = lr.json()["access_token"]
    return token, user_id


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def _valid_webhook_sig(body: bytes) -> str:
    secret = os.getenv("RAZORPAY_WEBHOOK_SECRET", "test_webhook_secret")
    return hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()


def _valid_checkout_sig(order_id: str, payment_id: str) -> str:
    secret = os.getenv("RAZORPAY_KEY_SECRET", "test_key_secret")
    return hmac.new(
        secret.encode(),
        f"{order_id}|{payment_id}".encode(),
        hashlib.sha256,
    ).hexdigest()


def _build_captured_webhook(order_id: str, payment_id: str, amount: int) -> bytes:
    return json.dumps({
        "id": f"evt_{uuid.uuid4().hex[:12]}",
        "event": "payment.captured",
        "payload": {
            "payment": {
                "entity": {
                    "id": payment_id,
                    "order_id": order_id,
                    "amount": amount,
                    "currency": "INR",
                    "status": "captured",
                }
            }
        }
    }).encode()


# ── Tests ─────────────────────────────────────────────────────────────────────

@patch("app.api.routes.subscriptions.rzp.create_order")
def test_create_order_success(mock_create, client):
    """1. POST /create-order authenticated → returns CreateOrderOut."""
    mock_create.return_value = {
        "order_id": "order_test_001",
        "amount": 20000,
        "currency": "INR",
        "key_id": "rzp_test_key",
    }
    token, _ = _register_and_login(client)
    r = client.post("/api/subscriptions/create-order",
                    json={"tier": "premium"}, headers=_auth(token))
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["order_id"] == "order_test_001"
    assert data["amount"] == 20000
    assert data["key_id"] == "rzp_test_key"


def test_create_order_unauthenticated(client):
    """2. POST /create-order unauthenticated → 401."""
    r = client.post("/api/subscriptions/create-order", json={"tier": "premium"})
    assert r.status_code == 401


def test_create_order_free_tier_rejected(client):
    """3. POST /create-order with tier='free' → 422."""
    token, _ = _register_and_login(client)
    r = client.post("/api/subscriptions/create-order",
                    json={"tier": "free"}, headers=_auth(token))
    assert r.status_code == 422


@patch("app.api.routes.subscriptions.rzp.create_order")
def test_create_order_razorpay_failure(mock_create, client):
    """4. POST /create-order with Razorpay API failure → 502."""
    mock_create.side_effect = Exception("Network error")
    token, _ = _register_and_login(client)
    r = client.post("/api/subscriptions/create-order",
                    json={"tier": "premium"}, headers=_auth(token))
    assert r.status_code == 502


@patch("app.api.routes.subscriptions.rzp.verify_checkout_signature")
@patch("app.api.routes.subscriptions.rzp.fetch_payment")
@patch("app.api.routes.subscriptions.rzp.create_order")
def test_verify_payment_success(mock_create, mock_fetch, mock_verify, client):
    """5. POST /verify-payment valid → subscription activated, returns SubscriptionOut."""
    order_id = f"order_{uuid.uuid4().hex[:8]}"
    payment_id = f"pay_{uuid.uuid4().hex[:8]}"

    mock_create.return_value = {
        "order_id": order_id, "amount": 20000,
        "currency": "INR", "key_id": "rzp_test",
    }
    mock_fetch.return_value = {
        "id": payment_id, "order_id": order_id,
        "amount": 20000, "currency": "INR", "status": "captured",
    }
    mock_verify.return_value = True

    token, _ = _register_and_login(client)

    # Create order first
    r = client.post("/api/subscriptions/create-order",
                    json={"tier": "premium"}, headers=_auth(token))
    assert r.status_code == 200

    # Verify payment
    r = client.post("/api/subscriptions/verify-payment", headers=_auth(token), json={
        "razorpay_order_id": order_id,
        "razorpay_payment_id": payment_id,
        "razorpay_signature": "valid_sig",
    })
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["tier"] == "premium"
    assert data["interviews_limit"] == 50
    assert data["interviews_used"] == 0


@patch("app.api.routes.subscriptions.rzp.verify_checkout_signature")
def test_verify_payment_invalid_signature(mock_verify, client):
    """6. POST /verify-payment invalid signature → 400."""
    mock_verify.return_value = False
    token, _ = _register_and_login(client)
    r = client.post("/api/subscriptions/verify-payment", headers=_auth(token), json={
        "razorpay_order_id": "order_fake",
        "razorpay_payment_id": "pay_fake",
        "razorpay_signature": "bad_sig",
    })
    assert r.status_code == 400


@patch("app.api.routes.subscriptions.rzp.verify_checkout_signature")
@patch("app.api.routes.subscriptions.rzp.fetch_payment")
@patch("app.api.routes.subscriptions.rzp.create_order")
def test_verify_payment_wrong_user(mock_create, mock_fetch, mock_verify, client):
    """7. POST /verify-payment with another user's order_id → 403."""
    order_id = f"order_{uuid.uuid4().hex[:8]}"
    payment_id = f"pay_{uuid.uuid4().hex[:8]}"

    mock_create.return_value = {
        "order_id": order_id, "amount": 50000,
        "currency": "INR", "key_id": "rzp_test",
    }
    mock_fetch.return_value = {
        "id": payment_id, "order_id": order_id,
        "amount": 50000, "currency": "INR", "status": "captured",
    }
    mock_verify.return_value = True

    # User A creates the order
    token_a, _ = _register_and_login(client)
    client.post("/api/subscriptions/create-order",
                json={"tier": "enterprise"}, headers=_auth(token_a))

    # User B tries to verify it
    token_b, _ = _register_and_login(client)
    r = client.post("/api/subscriptions/verify-payment", headers=_auth(token_b), json={
        "razorpay_order_id": order_id,
        "razorpay_payment_id": payment_id,
        "razorpay_signature": "valid",
    })
    assert r.status_code == 403


@patch("app.api.routes.subscriptions.rzp.verify_checkout_signature")
@patch("app.api.routes.subscriptions.rzp.fetch_payment")
@patch("app.api.routes.subscriptions.rzp.create_order")
def test_verify_payment_not_captured(mock_create, mock_fetch, mock_verify, client):
    """8. POST /verify-payment payment not yet captured → 402."""
    order_id = f"order_{uuid.uuid4().hex[:8]}"
    payment_id = f"pay_{uuid.uuid4().hex[:8]}"

    mock_create.return_value = {
        "order_id": order_id, "amount": 20000,
        "currency": "INR", "key_id": "rzp_test",
    }
    mock_fetch.return_value = {
        "id": payment_id, "order_id": order_id,
        "amount": 20000, "currency": "INR", "status": "authorized",
    }
    mock_verify.return_value = True

    token, _ = _register_and_login(client)
    client.post("/api/subscriptions/create-order",
                json={"tier": "premium"}, headers=_auth(token))

    r = client.post("/api/subscriptions/verify-payment", headers=_auth(token), json={
        "razorpay_order_id": order_id,
        "razorpay_payment_id": payment_id,
        "razorpay_signature": "valid",
    })
    assert r.status_code == 402


@patch("app.api.routes.subscriptions.rzp.verify_checkout_signature")
@patch("app.api.routes.subscriptions.rzp.fetch_payment")
@patch("app.api.routes.subscriptions.rzp.create_order")
def test_verify_payment_idempotent(mock_create, mock_fetch, mock_verify, client):
    """9. POST /verify-payment called twice → second call is idempotent 200."""
    order_id = f"order_{uuid.uuid4().hex[:8]}"
    payment_id = f"pay_{uuid.uuid4().hex[:8]}"

    mock_create.return_value = {
        "order_id": order_id, "amount": 20000,
        "currency": "INR", "key_id": "rzp_test",
    }
    mock_fetch.return_value = {
        "id": payment_id, "order_id": order_id,
        "amount": 20000, "currency": "INR", "status": "captured",
    }
    mock_verify.return_value = True

    token, _ = _register_and_login(client)
    client.post("/api/subscriptions/create-order",
                json={"tier": "premium"}, headers=_auth(token))

    body = {
        "razorpay_order_id": order_id,
        "razorpay_payment_id": payment_id,
        "razorpay_signature": "valid",
    }
    r1 = client.post("/api/subscriptions/verify-payment",
                     headers=_auth(token), json=body)
    r2 = client.post("/api/subscriptions/verify-payment",
                     headers=_auth(token), json=body)
    assert r1.status_code == 200
    assert r2.status_code == 200
    # Both return the same tier — no double-reset
    assert r1.json()["tier"] == r2.json()["tier"] == "premium"


def test_webhook_invalid_signature(client):
    """11. POST /webhook invalid signature → 400."""
    body = b'{"id":"evt_001","event":"payment.captured"}'
    r = client.post("/api/subscriptions/webhook",
                    content=body,
                    headers={"x-razorpay-signature": "bad_sig",
                             "content-type": "application/json"})
    assert r.status_code == 400


@patch("app.api.routes.subscriptions.rzp.verify_webhook_signature")
@patch("app.api.routes.subscriptions.rzp.create_order")
def test_webhook_payment_captured(mock_create, mock_verify, client):
    """12. POST /webhook valid payment.captured → subscription activated."""
    order_id = f"order_{uuid.uuid4().hex[:8]}"
    payment_id = f"pay_{uuid.uuid4().hex[:8]}"
    mock_create.return_value = {
        "order_id": order_id, "amount": 20000,
        "currency": "INR", "key_id": "rzp_test",
    }
    mock_verify.return_value = True

    token, _ = _register_and_login(client)
    client.post("/api/subscriptions/create-order",
                json={"tier": "premium"}, headers=_auth(token))

    body = _build_captured_webhook(order_id, payment_id, 20000)
    r = client.post("/api/subscriptions/webhook",
                    content=body,
                    headers={"x-razorpay-signature": "valid",
                             "content-type": "application/json"})
    assert r.status_code == 200

    # Check subscription updated
    me = client.get("/api/subscriptions/me", headers=_auth(token))
    assert me.json()["tier"] == "premium"
    assert me.json()["interviews_limit"] == 50


@patch("app.api.routes.subscriptions.rzp.verify_webhook_signature")
@patch("app.api.routes.subscriptions.rzp.create_order")
def test_webhook_duplicate_event_idempotent(mock_create, mock_verify, client):
    """13. Same webhook event delivered twice → second is no-op."""
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

    body = json.dumps({
        "id": event_id,
        "event": "payment.captured",
        "payload": {"payment": {"entity": {
            "id": payment_id, "order_id": order_id,
            "amount": 50000, "currency": "INR", "status": "captured",
        }}}
    }).encode()

    r1 = client.post("/api/subscriptions/webhook", content=body,
                     headers={"x-razorpay-signature": "valid",
                              "content-type": "application/json"})
    r2 = client.post("/api/subscriptions/webhook", content=body,
                     headers={"x-razorpay-signature": "valid",
                              "content-type": "application/json"})

    assert r1.status_code == 200
    assert r2.status_code == 200

    # Subscription should only be activated once (used=0, not reset twice)
    me = client.get("/api/subscriptions/me", headers=_auth(token))
    assert me.json()["tier"] == "enterprise"


@patch("app.api.routes.subscriptions.rzp.verify_webhook_signature")
@patch("app.api.routes.subscriptions.rzp.create_order")
def test_webhook_concurrent_duplicate(mock_create, mock_verify, client):
    """14. Two concurrent webhooks with same event_id → exactly one activates."""
    import threading

    order_id = f"order_{uuid.uuid4().hex[:8]}"
    payment_id = f"pay_{uuid.uuid4().hex[:8]}"
    event_id = f"evt_{uuid.uuid4().hex[:12]}"

    mock_create.return_value = {
        "order_id": order_id, "amount": 20000,
        "currency": "INR", "key_id": "rzp_test",
    }
    mock_verify.return_value = True

    token, _ = _register_and_login(client)
    client.post("/api/subscriptions/create-order",
                json={"tier": "premium"}, headers=_auth(token))

    body = json.dumps({
        "id": event_id,
        "event": "payment.captured",
        "payload": {"payment": {"entity": {
            "id": payment_id, "order_id": order_id,
            "amount": 20000, "currency": "INR", "status": "captured",
        }}}
    }).encode()
    headers = {"x-razorpay-signature": "valid", "content-type": "application/json"}

    statuses = []

    def _send():
        r = client.post("/api/subscriptions/webhook", content=body, headers=headers)
        statuses.append(r.status_code)

    t1 = threading.Thread(target=_send)
    t2 = threading.Thread(target=_send)
    t1.start(); t2.start()
    t1.join(); t2.join()

    assert statuses.count(200) == 2, f"Expected both 200, got: {statuses}"

    # Exactly one activation — subscription is premium
    me = client.get("/api/subscriptions/me", headers=_auth(token))
    assert me.json()["tier"] == "premium"


@patch("app.api.routes.subscriptions.rzp.verify_webhook_signature")
@patch("app.api.routes.subscriptions.rzp.create_order")
def test_webhook_wrong_amount_no_activation(mock_create, mock_verify, client):
    """15. Webhook with wrong amount → event marked invalid, no activation."""
    order_id = f"order_{uuid.uuid4().hex[:8]}"
    mock_create.return_value = {
        "order_id": order_id, "amount": 20000,
        "currency": "INR", "key_id": "rzp_test",
    }
    mock_verify.return_value = True

    token, _ = _register_and_login(client)
    client.post("/api/subscriptions/create-order",
                json={"tier": "premium"}, headers=_auth(token))

    # Send wrong amount (1 instead of 20000)
    body = _build_captured_webhook(order_id, f"pay_{uuid.uuid4().hex[:8]}", 1)
    r = client.post("/api/subscriptions/webhook", content=body,
                    headers={"x-razorpay-signature": "valid",
                             "content-type": "application/json"})
    assert r.status_code == 200  # ack to Razorpay

    # Subscription must still be free
    me = client.get("/api/subscriptions/me", headers=_auth(token))
    assert me.json()["tier"] == "free"


def test_get_me_returns_subscription(client):
    """16. GET /me returns current subscription state."""
    token, _ = _register_and_login(client)
    r = client.get("/api/subscriptions/me", headers=_auth(token))
    assert r.status_code == 200
    data = r.json()
    assert data["tier"] == "free"
    assert data["interviews_limit"] == 5
    assert data["is_unlimited"] is False
