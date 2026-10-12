"""
Entitlement service — all quota logic lives here.

All write operations use SELECT FOR UPDATE to prevent concurrent over-spend.
Callers must be inside a get_db transaction (flush, not commit).
"""
import uuid
from datetime import datetime, timedelta, timezone
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.subscription import Subscription, PaymentRecord
from app.models.session import InterviewSession
from app.models.user import User

TIER_LIMITS: dict[str, int] = {
    "free": 5,
    "premium": 50,
    "enterprise": -1,   # -1 = unlimited
    "expired": 0,
}

TIER_PRICES_PAISE: dict[str, int] = {
    "premium": 20000,
    "enterprise": 50000,
}


# ── Custom exceptions ─────────────────────────────────────────────────────────

class QuotaExceededError(Exception):
    def __init__(self, tier: str, used: int, limit: int):
        self.tier = tier
        self.used = used
        self.limit = limit
        super().__init__(f"Quota exceeded: tier={tier} used={used} limit={limit}")


class PaymentFailedError(Exception):
    pass


# ── Read helpers ──────────────────────────────────────────────────────────────

async def get_subscription(user_id: uuid.UUID, db: AsyncSession) -> Subscription:
    """Fetch subscription for user. Creates a free-tier default if none exists."""
    sub = (await db.execute(
        select(Subscription).where(Subscription.user_id == user_id)
    )).scalar_one_or_none()

    if sub is None:
        now = datetime.now(timezone.utc)
        sub = Subscription(
            user_id=user_id,
            tier="free",
            interviews_used=0,
            interviews_limit=5,
            period_start=now,
            period_end=None,
            updated_at=now,
        )
        db.add(sub)
        await db.flush()

    return sub


def check_quota(sub: Subscription) -> bool:
    """Pure function — True if user can create an interview."""
    if sub.interviews_limit == -1:   # unlimited
        return True
    if sub.interviews_limit <= 0:    # expired or exhausted
        return False
    return sub.interviews_used < sub.interviews_limit


# ── Write operations (all use FOR UPDATE) ─────────────────────────────────────

async def consume_quota_and_create_session(
    user_id: uuid.UUID,
    session_obj: InterviewSession,
    db: AsyncSession,
) -> InterviewSession:
    """
    Single atomic operation within the caller's transaction:
      1. SELECT subscription FOR UPDATE
      2. Check quota → raise QuotaExceededError if blocked
      3. Increment interviews_used
      4. Add session to DB with quota_consumed=True
      5. flush() — caller's get_db will commit

    If flush raises (DB constraint etc.) the entire transaction rolls back,
    including the interviews_used increment.
    """
    sub = (await db.execute(
        select(Subscription)
        .where(Subscription.user_id == user_id)
        .with_for_update()
    )).scalar_one_or_none()

    if sub is None:
        # Edge case: create free default inside this transaction
        now = datetime.now(timezone.utc)
        sub = Subscription(
            user_id=user_id,
            tier="free",
            interviews_used=0,
            interviews_limit=5,
            period_start=now,
            updated_at=now,
        )
        db.add(sub)
        await db.flush()

    if not check_quota(sub):
        raise QuotaExceededError(
            tier=sub.tier,
            used=sub.interviews_used,
            limit=sub.interviews_limit,
        )

    sub.interviews_used += 1
    sub.updated_at = datetime.now(timezone.utc)
    session_obj.quota_consumed = True
    db.add(session_obj)
    await db.flush()
    return session_obj


async def refund_quota(
    user_id: uuid.UUID,
    session_id: uuid.UUID,
    db: AsyncSession,
) -> None:
    """
    Atomically refund one interview credit when a session is cancelled.

    Lock order: subscription first, then session — consistent with
    consume_quota_and_create_session to prevent deadlock.

    Idempotent: no-op if session.quota_consumed is already False.
    """
    sub = (await db.execute(
        select(Subscription)
        .where(Subscription.user_id == user_id)
        .with_for_update()
    )).scalar_one_or_none()

    session = (await db.execute(
        select(InterviewSession)
        .where(InterviewSession.id == session_id)
        .with_for_update()
    )).scalar_one_or_none()

    if sub is None or session is None:
        return  # Nothing to refund

    if not session.quota_consumed:
        return  # Already refunded or never counted — idempotent no-op

    session.quota_consumed = False
    sub.interviews_used = max(0, sub.interviews_used - 1)
    sub.updated_at = datetime.now(timezone.utc)
    await db.flush()


async def activate_subscription(
    user_id: uuid.UUID,
    tier: str,
    order_id: str,
    payment_id: str,
    db: AsyncSession,
) -> Subscription:
    """
    Grant entitlement after a confirmed payment. Idempotent via fulfillment_status.

    Idempotency guard: checks PaymentRecord.fulfillment_status == 'fulfilled'.
    PaymentRecord existence alone is NOT the guard (it exists from order creation).

    Renewal (same tier, plan still active): period_end = old_expiry + 30 days
    Upgrade or reactivation from expired: period_end = now + 30 days

    Both: interviews_used=0, interviews_limit=TIER_LIMITS[tier]
    Also syncs users.subscription_tier (denormalized column).
    """
    now = datetime.now(timezone.utc)

    # Lock the payment record first
    pr = (await db.execute(
        select(PaymentRecord)
        .where(PaymentRecord.razorpay_order_id == order_id)
        .with_for_update()
    )).scalar_one_or_none()

    if pr is None:
        raise ValueError(f"PaymentRecord not found for order_id={order_id}")

    if pr.fulfillment_status == "fulfilled":
        # True idempotent no-op — entitlement already granted
        sub = (await db.execute(
            select(Subscription).where(Subscription.user_id == user_id)
        )).scalar_one_or_none()
        return sub

    if pr.payment_status == "failed":
        raise PaymentFailedError(f"Payment {order_id} has failed status")

    # Lock the subscription
    sub = (await db.execute(
        select(Subscription)
        .where(Subscription.user_id == user_id)
        .with_for_update()
    )).scalar_one_or_none()

    if sub is None:
        sub = Subscription(user_id=user_id, tier="free", interviews_used=0,
                           interviews_limit=5, period_start=now, updated_at=now)
        db.add(sub)
        await db.flush()

    # Renewal vs upgrade/reactivation
    if tier == sub.tier and sub.period_end and sub.period_end > now:
        # Same tier, still active → extend from current expiry
        new_period_end = sub.period_end + timedelta(days=30)
    else:
        # Upgrade, downgrade, or reactivation from expired/free
        new_period_end = now + timedelta(days=30)

    sub.tier = tier
    sub.interviews_limit = TIER_LIMITS[tier]
    sub.interviews_used = 0
    sub.period_start = now
    sub.period_end = new_period_end
    sub.updated_at = now

    # Update the payment record
    pr.payment_status = "captured"
    pr.fulfillment_status = "fulfilled"
    pr.razorpay_payment_id = payment_id

    # Sync denormalized column on users table
    await db.execute(
        update(User)
        .where(User.id == user_id)
        .values(subscription_tier=tier)
    )

    await db.flush()
    return sub


async def expire_stale_subscriptions(user_id: uuid.UUID, db: AsyncSession) -> None:
    """
    Lazy per-user expiry check. Called from GET /subscriptions/me.
    Sets tier='expired', interviews_limit=0 if period_end is in the past.
    Does NOT touch free-tier rows (period_end is NULL for free).
    """
    now = datetime.now(timezone.utc)

    sub = (await db.execute(
        select(Subscription)
        .where(Subscription.user_id == user_id)
        .with_for_update()
    )).scalar_one_or_none()

    if sub is None:
        return

    if (
        sub.period_end is not None
        and sub.period_end < now
        and sub.tier not in ("free", "expired")
    ):
        sub.tier = "expired"
        sub.interviews_limit = 0
        sub.updated_at = now

        await db.execute(
            update(User)
            .where(User.id == user_id)
            .values(subscription_tier="expired")
        )
        await db.flush()


async def reset_free_tier_monthly(db: AsyncSession) -> int:
    """
    Bulk calendar-month reset for free-tier users.
    Resets interviews_used=0 where tier='free' and the period_start
    is from a previous calendar month. Returns number of rows updated.
    Never touches 'expired' rows.
    """
    from sqlalchemy import text
    result = await db.execute(text("""
        UPDATE subscriptions
        SET interviews_used = 0,
            period_start    = now(),
            updated_at      = now()
        WHERE tier = 'free'
          AND DATE_TRUNC('month', period_start) < DATE_TRUNC('month', now())
        RETURNING id
    """))
    rows = result.fetchall()
    await db.flush()
    return len(rows)
