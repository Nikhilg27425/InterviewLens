"""
Stage 2 tests — entitlement service against real PostgreSQL.
"""
import asyncio
import os
import uuid
from datetime import datetime, timedelta, timezone

import pytest
import asyncpg
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy import select

from pathlib import Path
from tests.conftest import make_test_url, PG_USER, PG_PASS, PG_HOST, PG_PORT

BACKEND_DIR = Path(__file__).resolve().parents[1]

TEST_DB = "il_ent_test"
TEST_URL = make_test_url(TEST_DB)


async def _admin(sql: str):
    c = await asyncpg.connect(host=PG_HOST, port=PG_PORT,
                               user=PG_USER, password=PG_PASS, database="postgres")
    await c.execute(sql)
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

    # Create native enum types that SQLAlchemy's SAEnum emits via create_all
    # but migrations don't create (they use String columns instead).
    # Required so ORM inserts work against the migration-built test schema.
    async def _create_enums():
        c = await asyncpg.connect(
            host=PG_HOST, port=PG_PORT,
            user=PG_USER, password=PG_PASS,
            database=TEST_DB,
        )
        await c.execute("""
            DO $$ BEGIN
                CREATE TYPE userrole AS ENUM ('interviewer','candidate','admin');
            EXCEPTION WHEN duplicate_object THEN NULL;
            END $$;
        """)
        await c.execute("""
            DO $$ BEGIN
                CREATE TYPE sessionstatus AS ENUM
                    ('scheduled','waiting','active','completed','cancelled');
            EXCEPTION WHEN duplicate_object THEN NULL;
            END $$;
        """)
        await c.execute("""
            DO $$ BEGIN
                CREATE TYPE difficulty AS ENUM ('Easy','Medium','Hard');
            EXCEPTION WHEN duplicate_object THEN NULL;
            END $$;
        """)
        await c.execute("ALTER TABLE users ALTER COLUMN role TYPE userrole USING role::userrole")
        await c.execute(
            "ALTER TABLE interview_sessions ALTER COLUMN status "
            "TYPE sessionstatus USING status::sessionstatus"
        )
        await c.close()
    asyncio.run(_create_enums())

    yield

    # Force-terminate remaining connections before dropping the test DB
    async def _terminate_and_drop():
        c = await asyncpg.connect(
            host=PG_HOST, port=PG_PORT,
            user=PG_USER, password=PG_PASS, database="postgres")
        await c.execute(f"""
            SELECT pg_terminate_backend(pid)
            FROM pg_stat_activity
            WHERE datname = '{TEST_DB}' AND pid <> pg_backend_pid()
        """)
        await c.execute(f"DROP DATABASE IF EXISTS {TEST_DB}")
        await c.close()
    asyncio.run(_terminate_and_drop())
    # Restore original DATABASE_URL so other test modules aren't affected
    os.environ.pop("DATABASE_URL", None)


@pytest.fixture
def db_session():
    """Yields a fresh AsyncSession per test; rolls back after each test."""
    engine = create_async_engine(TEST_URL, echo=False)
    Session = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)

    async def _run(coro):
        async with Session() as session:
            try:
                result = await coro(session)
                await session.commit()
                return result
            except Exception:
                await session.rollback()
                raise
            finally:
                await session.close()
        await engine.dispose()

    return _run


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _make_user(db: AsyncSession) -> uuid.UUID:
    from app.models.user import User, UserRole
    user = User(
        email=f"test_{uuid.uuid4().hex[:8]}@example.com",
        full_name="Test User",
        hashed_password="x",
        role=UserRole.interviewer,
    )
    db.add(user)
    await db.flush()
    return user.id


async def _make_session_obj(user_id: uuid.UUID) -> "InterviewSession":
    """Build a transient InterviewSession (not yet added to DB)."""
    from app.models.session import InterviewSession, SessionStatus
    import secrets, string
    token = "".join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(16))
    return InterviewSession(
        id=uuid.uuid4(),
        access_token=token,
        title="Test Session",
        interviewer_id=user_id,
        status=SessionStatus.scheduled,
        duration_minutes=60,
        quota_consumed=False,
    )


async def _make_payment_record(user_id, tier, db: AsyncSession):
    from app.models.subscription import PaymentRecord
    from app.services.entitlement import TIER_PRICES_PAISE
    pr = PaymentRecord(
        user_id=user_id,
        razorpay_order_id=f"order_{uuid.uuid4().hex[:12]}",
        tier_purchased=tier,
        amount_paise=TIER_PRICES_PAISE[tier],
        currency="INR",
        payment_status="captured",
        fulfillment_status="pending",
    )
    db.add(pr)
    await db.flush()
    return pr


# ── Tests ─────────────────────────────────────────────────────────────────────

def test_get_subscription_creates_free_default(db_session):
    """1. New user gets free subscription via get_subscription."""
    from app.services.entitlement import get_subscription
    from app.models.subscription import Subscription

    async def _run(db):
        user_id = await _make_user(db)
        sub = await get_subscription(user_id, db)
        assert sub.tier == "free"
        assert sub.interviews_limit == 5
        assert sub.interviews_used == 0
        assert sub.period_end is None
        return sub

    asyncio.run(db_session(_run))


def test_free_tier_quota_5_sessions(db_session):
    """2. Free user: 5 consumes succeed, 6th raises QuotaExceededError."""
    from app.services.entitlement import consume_quota_and_create_session, QuotaExceededError

    async def _run(db):
        user_id = await _make_user(db)
        for _ in range(5):
            s = await _make_session_obj(user_id)
            await consume_quota_and_create_session(user_id, s, db)

        s6 = await _make_session_obj(user_id)
        with pytest.raises(QuotaExceededError) as exc_info:
            await consume_quota_and_create_session(user_id, s6, db)
        assert exc_info.value.tier == "free"
        assert exc_info.value.used == 5
        assert exc_info.value.limit == 5

    asyncio.run(db_session(_run))


def test_enterprise_unlimited(db_session):
    """3. Enterprise user: 100 consumes succeed."""
    from app.services.entitlement import (
        activate_subscription, consume_quota_and_create_session
    )

    async def _run(db):
        user_id = await _make_user(db)
        pr = await _make_payment_record(user_id, "enterprise", db)
        await activate_subscription(user_id, "enterprise", pr.razorpay_order_id, "pay_x", db)
        for _ in range(100):
            s = await _make_session_obj(user_id)
            await consume_quota_and_create_session(user_id, s, db)
        from app.models.subscription import Subscription
        sub = (await db.execute(
            select(Subscription).where(Subscription.user_id == user_id)
        )).scalar_one()
        assert sub.interviews_used == 100

    asyncio.run(db_session(_run))


def test_expired_tier_blocks_immediately(db_session):
    """4. Expired user: first consume raises QuotaExceededError."""
    from app.services.entitlement import get_subscription, consume_quota_and_create_session, QuotaExceededError
    from app.models.subscription import Subscription

    async def _run(db):
        user_id = await _make_user(db)
        sub = await get_subscription(user_id, db)
        sub.tier = "expired"
        sub.interviews_limit = 0
        await db.flush()
        s = await _make_session_obj(user_id)
        with pytest.raises(QuotaExceededError) as exc_info:
            await consume_quota_and_create_session(user_id, s, db)
        assert exc_info.value.tier == "expired"
        assert exc_info.value.limit == 0

    asyncio.run(db_session(_run))


def test_cancel_refund_basic(db_session):
    """5. Cancel a session → credit returned, quota_consumed=False."""
    from app.services.entitlement import consume_quota_and_create_session, refund_quota
    from app.models.subscription import Subscription

    async def _run(db):
        user_id = await _make_user(db)
        s = await _make_session_obj(user_id)
        await consume_quota_and_create_session(user_id, s, db)
        assert s.quota_consumed is True

        sub = (await db.execute(
            select(Subscription).where(Subscription.user_id == user_id)
        )).scalar_one()
        assert sub.interviews_used == 1

        await refund_quota(user_id, s.id, db)
        await db.refresh(sub)
        await db.refresh(s)
        assert sub.interviews_used == 0
        assert s.quota_consumed is False

    asyncio.run(db_session(_run))


def test_double_cancel_idempotent(db_session):
    """6. Double cancel → refund idempotent, interviews_used unchanged."""
    from app.services.entitlement import consume_quota_and_create_session, refund_quota
    from app.models.subscription import Subscription

    async def _run(db):
        user_id = await _make_user(db)
        s = await _make_session_obj(user_id)
        await consume_quota_and_create_session(user_id, s, db)

        await refund_quota(user_id, s.id, db)
        await refund_quota(user_id, s.id, db)  # second call — no-op

        sub = (await db.execute(
            select(Subscription).where(Subscription.user_id == user_id)
        )).scalar_one()
        assert sub.interviews_used == 0

    asyncio.run(db_session(_run))


def test_concurrent_consume_postgresql(db_session):
    """7. Concurrent consume: 6 tasks with 5 remaining → exactly 5 succeed, 1 fails."""
    from app.services.entitlement import consume_quota_and_create_session, QuotaExceededError
    from app.models.subscription import Subscription

    engine = create_async_engine(TEST_URL, echo=False)
    Session = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)

    async def _run():
        # Setup user with 5-limit free plan
        async with Session() as setup_db:
            user_id = await _make_user(setup_db)
            await setup_db.commit()

        successes = 0
        failures = 0

        async def _one_create():
            nonlocal successes, failures
            async with Session() as db:
                try:
                    s = await _make_session_obj(user_id)
                    await consume_quota_and_create_session(user_id, s, db)
                    await db.commit()
                    successes += 1
                except QuotaExceededError:
                    await db.rollback()
                    failures += 1
                except Exception:
                    await db.rollback()
                    raise

        await asyncio.gather(*[_one_create() for _ in range(6)])
        await engine.dispose()

        assert successes == 5, f"Expected 5 successes, got {successes}"
        assert failures == 1, f"Expected 1 failure, got {failures}"

        # Verify final state
        async with Session() as verify_db:
            sub = (await verify_db.execute(
                select(Subscription).where(Subscription.user_id == user_id)
            )).scalar_one()
            assert sub.interviews_used == 5

    asyncio.run(_run())


def test_concurrent_cancel_postgresql(db_session):
    """8. Two concurrent cancels for same session → interviews_used decrements by exactly 1."""
    from app.services.entitlement import consume_quota_and_create_session, refund_quota
    from app.models.subscription import Subscription

    engine = create_async_engine(TEST_URL, echo=False)
    Session = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)

    async def _run():
        # Create a session and consume quota
        session_id = None
        async with Session() as db:
            user_id = await _make_user(db)
            s = await _make_session_obj(user_id)
            await consume_quota_and_create_session(user_id, s, db)
            await db.commit()
            session_id = s.id

        async def _one_cancel():
            async with Session() as db:
                try:
                    await refund_quota(user_id, session_id, db)
                    await db.commit()
                except Exception:
                    await db.rollback()

        await asyncio.gather(_one_cancel(), _one_cancel())
        await engine.dispose()

        async with Session() as verify_db:
            sub = (await verify_db.execute(
                select(Subscription).where(Subscription.user_id == user_id)
            )).scalar_one()
            assert sub.interviews_used == 0, (
                f"Expected 0 after two concurrent cancels, got {sub.interviews_used}"
            )

    asyncio.run(_run())


def test_expire_stale_subscription(db_session):
    """9. Subscription with period_end in the past → expire_stale_subscriptions sets tier='expired'."""
    from app.services.entitlement import activate_subscription, expire_stale_subscriptions
    from app.models.subscription import Subscription

    async def _run(db):
        user_id = await _make_user(db)
        pr = await _make_payment_record(user_id, "premium", db)
        await activate_subscription(user_id, "premium", pr.razorpay_order_id, "pay_y", db)

        # Back-date the period_end to the past
        sub = (await db.execute(
            select(Subscription).where(Subscription.user_id == user_id)
        )).scalar_one()
        sub.period_end = datetime.now(timezone.utc) - timedelta(days=1)
        await db.flush()

        # Now trigger lazy expiry
        await expire_stale_subscriptions(user_id, db)
        await db.refresh(sub)
        assert sub.tier == "expired"
        assert sub.interviews_limit == 0

    asyncio.run(db_session(_run))


def test_free_tier_reset_does_not_affect_expired(db_session):
    """10. reset_free_tier_monthly does NOT touch expired rows."""
    from app.services.entitlement import get_subscription, reset_free_tier_monthly
    from app.models.subscription import Subscription
    from datetime import timezone

    async def _run(db):
        user_id = await _make_user(db)
        sub = await get_subscription(user_id, db)
        # Simulate expired row
        sub.tier = "expired"
        sub.interviews_limit = 0
        sub.interviews_used = 3
        sub.period_start = datetime.now(timezone.utc) - timedelta(days=40)
        await db.flush()

        count = await reset_free_tier_monthly(db)
        await db.refresh(sub)
        # expired row must be untouched
        assert sub.tier == "expired"
        assert sub.interviews_used == 3

    asyncio.run(db_session(_run))


def test_same_tier_renewal_extends_expiry(db_session):
    """11. Same-tier renewal with 10 days remaining → period_end = old_expiry + 30 days, used=0."""
    from app.services.entitlement import activate_subscription
    from app.models.subscription import Subscription

    async def _run(db):
        user_id = await _make_user(db)
        # First activation
        pr1 = await _make_payment_record(user_id, "premium", db)
        await activate_subscription(user_id, "premium", pr1.razorpay_order_id, "pay_1", db)

        sub = (await db.execute(
            select(Subscription).where(Subscription.user_id == user_id)
        )).scalar_one()
        # Set 10 days remaining
        original_end = datetime.now(timezone.utc) + timedelta(days=10)
        sub.period_end = original_end
        sub.interviews_used = 20
        await db.flush()

        # Renew same tier
        pr2 = await _make_payment_record(user_id, "premium", db)
        await activate_subscription(user_id, "premium", pr2.razorpay_order_id, "pay_2", db)
        await db.refresh(sub)

        expected_end = original_end + timedelta(days=30)
        diff = abs((sub.period_end - expected_end).total_seconds())
        assert diff < 5, f"period_end mismatch: {sub.period_end} vs {expected_end}"
        assert sub.interviews_used == 0

    asyncio.run(db_session(_run))


def test_same_tier_renewal_on_expired(db_session):
    """12. Same-tier renewal on expired plan → period_end = now + 30 days."""
    from app.services.entitlement import get_subscription, activate_subscription
    from app.models.subscription import Subscription

    async def _run(db):
        user_id = await _make_user(db)
        sub = await get_subscription(user_id, db)
        sub.tier = "expired"
        sub.interviews_limit = 0
        sub.period_end = datetime.now(timezone.utc) - timedelta(days=5)
        await db.flush()

        pr = await _make_payment_record(user_id, "premium", db)
        before = datetime.now(timezone.utc)
        await activate_subscription(user_id, "premium", pr.razorpay_order_id, "pay_r", db)
        await db.refresh(sub)

        expected = before + timedelta(days=30)
        diff = abs((sub.period_end - expected).total_seconds())
        assert diff < 5
        assert sub.interviews_used == 0
        assert sub.tier == "premium"

    asyncio.run(db_session(_run))


def test_upgrade_premium_to_enterprise(db_session):
    """13. Upgrade Premium → Enterprise → period_end=now+30, used=0, limit=-1."""
    from app.services.entitlement import activate_subscription
    from app.models.subscription import Subscription

    async def _run(db):
        user_id = await _make_user(db)
        pr1 = await _make_payment_record(user_id, "premium", db)
        await activate_subscription(user_id, "premium", pr1.razorpay_order_id, "pay_u1", db)

        pr2 = await _make_payment_record(user_id, "enterprise", db)
        before = datetime.now(timezone.utc)
        await activate_subscription(user_id, "enterprise", pr2.razorpay_order_id, "pay_u2", db)

        sub = (await db.execute(
            select(Subscription).where(Subscription.user_id == user_id)
        )).scalar_one()

        assert sub.tier == "enterprise"
        assert sub.interviews_limit == -1
        assert sub.interviews_used == 0
        diff = abs((sub.period_end - (before + timedelta(days=30))).total_seconds())
        assert diff < 5

    asyncio.run(db_session(_run))


def test_activate_idempotent_on_fulfilled(db_session):
    """14. activate_subscription twice with same order_id (fulfilled) → second is no-op."""
    from app.services.entitlement import activate_subscription
    from app.models.subscription import Subscription

    async def _run(db):
        user_id = await _make_user(db)
        pr = await _make_payment_record(user_id, "premium", db)

        await activate_subscription(user_id, "premium", pr.razorpay_order_id, "pay_x", db)
        # Simulate some usage
        sub = (await db.execute(
            select(Subscription).where(Subscription.user_id == user_id)
        )).scalar_one()
        sub.interviews_used = 15
        await db.flush()

        # Second call — same order_id — must be a no-op
        await activate_subscription(user_id, "premium", pr.razorpay_order_id, "pay_x", db)
        await db.refresh(sub)
        # interviews_used should still be 15 (not reset to 0)
        assert sub.interviews_used == 15, (
            f"Second activation should be no-op; interviews_used={sub.interviews_used}"
        )

    asyncio.run(db_session(_run))
