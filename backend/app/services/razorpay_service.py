"""
Razorpay integration service.

All functions are synchronous (Razorpay's Python SDK is sync).
Call these OUTSIDE any open database transaction to avoid holding locks
during network I/O.
"""
import hashlib
import hmac

import razorpay

from app.core.config import settings
from app.services.entitlement import TIER_PRICES_PAISE


class RazorpayConfigError(Exception):
    """Raised when Razorpay API keys are not configured."""
    pass


class RazorpayPaymentNotCaptured(Exception):
    """Raised when a payment exists but is not yet captured."""
    def __init__(self, status: str):
        self.status = status
        super().__init__(f"Payment not captured (status={status})")


def get_client() -> razorpay.Client:
    if not settings.RAZORPAY_KEY_ID or not settings.RAZORPAY_KEY_SECRET:
        raise RazorpayConfigError(
            "RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be configured"
        )
    return razorpay.Client(
        auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET)
    )


def create_order(tier: str, user_id: str) -> dict:
    """
    Create a Razorpay order for the given tier.
    Returns {order_id, amount, currency, key_id}.
    key_id is the public key — safe to send to frontend.
    Raises ValueError if tier is not purchasable.
    Raises RazorpayConfigError if keys not set.
    """
    if tier not in TIER_PRICES_PAISE:
        raise ValueError(
            f"Tier '{tier}' is not purchasable. Valid tiers: {list(TIER_PRICES_PAISE)}"
        )
    amount = TIER_PRICES_PAISE[tier]
    client = get_client()
    order = client.order.create({
        "amount": amount,
        "currency": "INR",
        "notes": {
            "tier": tier,
            "user_id": str(user_id),
        },
    })
    return {
        "order_id": order["id"],
        "amount": amount,
        "currency": "INR",
        "key_id": settings.RAZORPAY_KEY_ID,
    }


def verify_checkout_signature(
    order_id: str,
    payment_id: str,
    signature: str,
) -> bool:
    """
    Verify the Razorpay checkout callback signature.
    Uses KEY_SECRET (not WEBHOOK_SECRET).
    Returns True if valid, False otherwise.
    """
    if not settings.RAZORPAY_KEY_SECRET:
        return False
    expected = hmac.new(
        settings.RAZORPAY_KEY_SECRET.encode(),
        f"{order_id}|{payment_id}".encode(),
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(expected, signature)


def verify_webhook_signature(body_bytes: bytes, signature_header: str) -> bool:
    """
    Verify a Razorpay webhook request signature.
    Uses WEBHOOK_SECRET (not KEY_SECRET).
    Returns True if valid, False otherwise.
    """
    if not settings.RAZORPAY_WEBHOOK_SECRET:
        return False
    expected = hmac.new(
        settings.RAZORPAY_WEBHOOK_SECRET.encode(),
        body_bytes,
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(expected, signature_header)


def fetch_payment(payment_id: str) -> dict:
    """
    Fetch payment details from Razorpay.
    Returns the full payment object.
    Raises RazorpayConfigError if keys not set.
    """
    client = get_client()
    return client.payment.fetch(payment_id)
