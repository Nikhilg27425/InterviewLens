"""
Subscription and payment routes.

Endpoints:
  POST /subscriptions/create-order   — create a Razorpay order (auth required)
  POST /subscriptions/verify-payment — verify checkout signature + activate (auth required)
  POST /subscriptions/webhook        — Razorpay webhook (public, raw body)
  GET  /subscriptions/me             — current subscription state (auth required)
  GET  /subscriptions/history        — last 10 payment records (auth required)
"""
import json
import logging
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select, update, insert
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_interviewer
from app.db.base import get_db
from app.models.subscription import PaymentRecord, Subscription, WebhookEvent
from app.models.user import User
from app.schemas.subscription import (
    CreateOrderOut,
    PaymentHistoryItem,
    SubscriptionOut,
    VerifyPaymentIn,
)
from app.services import entitlement as ent
from app.services import razorpay_service as rzp

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/subscriptions", tags=["subscriptions"])


def _sub_out(sub: Subscription) -> SubscriptionOut:
    return SubscriptionOut(
        tier=sub.tier,
        interviews_used=sub.interviews_used,
        interviews_limit=sub.interviews_limit,
        period_end=sub.period_end,
        is_unlimited=sub.is_unlimited,
        is_expired=sub.is_expired,
        percent_used=sub.percent_used,
    )


# ── Create order ──────────────────────────────────────────────────────────────

@router.post("/create-order", response_model=CreateOrderOut)
async def create_order(
    body: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_interviewer),
):
    tier = body.get("tier", "")
    if tier not in rzp.TIER_PRICES_PAISE:
        raise HTTPException(422, f"Invalid tier '{tier}'. Must be 'premium' or 'enterprise'.")

    # Phase 1: external call — NO DB transaction open yet
    try:
        order = rzp.create_order(tier, str(current_user.id))
    except rzp.RazorpayConfigError as e:
        raise HTTPException(502, f"Payment provider not configured: {e}")
    except Exception as e:
        logger.error(f"Razorpay create_order failed: {e}")
        raise HTTPException(502, "Payment provider error. Please try again.")

    # Phase 2: short DB write — insert PaymentRecord
    pr = PaymentRecord(
        user_id=current_user.id,
        razorpay_order_id=order["order_id"],
        tier_purchased=tier,
        amount_paise=order["amount"],
        currency="INR",
        payment_status="created",
        fulfillment_status="pending",
    )
    db.add(pr)
    # get_db commits on return

    return CreateOrderOut(
        order_id=order["order_id"],
        amount=order["amount"],
        currency=order["currency"],
        key_id=order["key_id"],
    )


# ── Verify payment ────────────────────────────────────────────────────────────

@router.post("/verify-payment", response_model=SubscriptionOut)
async def verify_payment(
    body: VerifyPaymentIn,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_interviewer),
):
    # Phase 1: all external/validation steps BEFORE acquiring any DB lock

    # 1. Signature verification
    if not rzp.verify_checkout_signature(
        body.razorpay_order_id,
        body.razorpay_payment_id,
        body.razorpay_signature,
    ):
        raise HTTPException(400, "Invalid payment signature")

    # 2. Fetch payment from Razorpay API
    try:
        payment = rzp.fetch_payment(body.razorpay_payment_id)
    except rzp.RazorpayConfigError as e:
        raise HTTPException(502, str(e))
    except Exception as e:
        logger.error(f"Razorpay fetch_payment failed: {e}")
        raise HTTPException(502, "Could not fetch payment details from Razorpay")

    # 3. Validate captured status
    if payment.get("status") != "captured":
        raise HTTPException(
            402,
            f"Payment not yet captured (status={payment.get('status')}). "
            "Please wait and try again, or contact support."
        )

    # Phase 2: short DB transaction — lock, validate, activate
    # Fetch and lock the PaymentRecord
    pr = (await db.execute(
        select(PaymentRecord)
        .where(PaymentRecord.razorpay_order_id == body.razorpay_order_id)
        .with_for_update()
    )).scalar_one_or_none()

    if pr is None:
        raise HTTPException(404, "Payment order not found")

    if pr.user_id != current_user.id:
        raise HTTPException(403, "This payment order belongs to a different account")

    # Idempotent: already fulfilled
    if pr.fulfillment_status == "fulfilled":
        sub = await ent.get_subscription(current_user.id, db)
        return _sub_out(sub)

    # 4. Validate amount and currency against our records (not webhook notes)
    expected_amount = rzp.TIER_PRICES_PAISE[pr.tier_purchased]
    if payment.get("amount") != expected_amount or payment.get("currency") != "INR":
        logger.warning(
            f"Amount/currency mismatch on order {body.razorpay_order_id}: "
            f"expected {expected_amount} INR, got {payment.get('amount')} {payment.get('currency')}"
        )
        raise HTTPException(422, "Payment amount or currency does not match the order")

    # 5. Activate entitlement (all within same transaction)
    sub = await ent.activate_subscription(
        user_id=current_user.id,
        tier=pr.tier_purchased,
        order_id=body.razorpay_order_id,
        payment_id=body.razorpay_payment_id,
        db=db,
    )
    # get_db commits on return

    return _sub_out(sub)


# ── Webhook ───────────────────────────────────────────────────────────────────

@router.post("/webhook")
async def webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Razorpay webhook — secondary reliable confirmation.

    Transaction strategy:
      1. INSERT event row with ON CONFLICT DO NOTHING (atomic idempotency gate)
      2. Validate payload
      3. Activate subscription (idempotent — fulfillment_status guard)
      4. Mark event 'processed'
      5. Commit (all or nothing)
    """
    body_bytes = await request.body()
    signature = request.headers.get("x-razorpay-signature", "")

    # Signature check — no DB work yet
    if not rzp.verify_webhook_signature(body_bytes, signature):
        raise HTTPException(400, "Invalid webhook signature")

    try:
        payload = json.loads(body_bytes)
    except json.JSONDecodeError:
        raise HTTPException(400, "Invalid JSON payload")

    event_id = payload.get("id", "")
    event_type = payload.get("event", "")

    if not event_id:
        # Razorpay test pings may have no ID — ack silently
        return {"status": "ok"}

    # Atomic idempotency gate: INSERT ... ON CONFLICT DO NOTHING
    # Two concurrent requests for the same event_id will serialize at PostgreSQL level.
    # The first inserts and proceeds; the second hits the PK conflict, gets no row back,
    # and returns immediately without activating anything.
    result = await db.execute(
        pg_insert(WebhookEvent)
        .values(
            razorpay_event_id=event_id,
            event_type=event_type,
            status="processing",
            processed_at=datetime.now(timezone.utc),
        )
        .on_conflict_do_nothing(index_elements=["razorpay_event_id"])
        .returning(WebhookEvent.razorpay_event_id)
    )
    if result.fetchone() is None:
        # Already processed (or being processed concurrently) — idempotent ack
        return {"status": "ok"}

    # Process the event inside the same transaction
    final_status = "processed"

    if event_type == "payment.captured":
        try:
            final_status = await _handle_payment_captured(payload, db)
        except Exception as e:
            logger.error(f"Webhook payment.captured processing error: {e}")
            final_status = "invalid"

    elif event_type == "payment.failed":
        await _handle_payment_failed(payload, db)

    # Mark event with final status — within same transaction
    await db.execute(
        update(WebhookEvent)
        .where(WebhookEvent.razorpay_event_id == event_id)
        .values(status=final_status)
    )
    # get_db commits everything here

    return {"status": "ok"}


async def _handle_payment_captured(payload: dict, db: AsyncSession) -> str:
    """Process payment.captured event. Returns final event status string."""
    entity = payload.get("payload", {}).get("payment", {}).get("entity", {})
    order_id = entity.get("order_id", "")
    payment_id = entity.get("id", "")
    amount = entity.get("amount", 0)
    currency = entity.get("currency", "")

    # Fetch and lock the PaymentRecord — source of truth for tier and user
    pr = (await db.execute(
        select(PaymentRecord)
        .where(PaymentRecord.razorpay_order_id == order_id)
        .with_for_update()
    )).scalar_one_or_none()

    if pr is None:
        logger.warning(f"Webhook: unknown order_id={order_id}")
        return "invalid"

    # Validate amount and currency against our stored records (not webhook payload notes)
    expected = rzp.TIER_PRICES_PAISE.get(pr.tier_purchased, 0)
    if amount != expected or currency != "INR":
        logger.warning(
            f"Webhook amount mismatch: order={order_id} "
            f"expected={expected} got={amount} {currency}"
        )
        return "invalid"

    # activate_subscription is idempotent — safe to call even if verify-payment ran first
    await ent.activate_subscription(
        user_id=pr.user_id,
        tier=pr.tier_purchased,
        order_id=order_id,
        payment_id=payment_id,
        db=db,
    )
    return "processed"


async def _handle_payment_failed(payload: dict, db: AsyncSession) -> None:
    entity = payload.get("payload", {}).get("payment", {}).get("entity", {})
    order_id = entity.get("order_id", "")
    if order_id:
        await db.execute(
            update(PaymentRecord)
            .where(PaymentRecord.razorpay_order_id == order_id)
            .values(payment_status="failed")
        )


# ── Read endpoints ────────────────────────────────────────────────────────────

@router.get("/me", response_model=SubscriptionOut)
async def get_my_subscription(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_interviewer),
):
    """Lazy expiry check + return current subscription state."""
    await ent.expire_stale_subscriptions(current_user.id, db)
    sub = await ent.get_subscription(current_user.id, db)
    return _sub_out(sub)


@router.get("/history", response_model=list[PaymentHistoryItem])
async def get_payment_history(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_interviewer),
):
    """Last 10 payment records for the current user."""
    records = (await db.execute(
        select(PaymentRecord)
        .where(PaymentRecord.user_id == current_user.id)
        .order_by(PaymentRecord.created_at.desc())
        .limit(10)
    )).scalars().all()

    return [
        PaymentHistoryItem(
            order_id=r.razorpay_order_id,
            tier_purchased=r.tier_purchased,
            amount_paise=r.amount_paise,
            payment_status=r.payment_status,
            fulfillment_status=r.fulfillment_status,
            created_at=r.created_at,
        )
        for r in records
    ]
