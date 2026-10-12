"""
Stage 3 tests — Razorpay service. All tests use mocks; no real API calls.
"""
import hashlib
import hmac
import uuid
from unittest.mock import MagicMock, patch

import pytest

from app.services.razorpay_service import (
    RazorpayConfigError,
    create_order,
    fetch_payment,
    verify_checkout_signature,
    verify_webhook_signature,
)
from app.services.entitlement import TIER_PRICES_PAISE


# ── Helpers ───────────────────────────────────────────────────────────────────

def _valid_checkout_sig(order_id: str, payment_id: str, secret: str) -> str:
    return hmac.new(
        secret.encode(),
        f"{order_id}|{payment_id}".encode(),
        hashlib.sha256,
    ).hexdigest()


def _valid_webhook_sig(body: bytes, secret: str) -> str:
    return hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()


# ── Tests ─────────────────────────────────────────────────────────────────────

@patch("app.services.razorpay_service.settings")
@patch("app.services.razorpay_service.razorpay.Client")
def test_create_order_premium(mock_client_cls, mock_settings):
    """1. create_order('premium') calls Razorpay with amount=20000."""
    mock_settings.RAZORPAY_KEY_ID = "rzp_test_key"
    mock_settings.RAZORPAY_KEY_SECRET = "secret"
    mock_client = MagicMock()
    mock_client.order.create.return_value = {"id": "order_premium_123"}
    mock_client_cls.return_value = mock_client

    user_id = str(uuid.uuid4())
    result = create_order("premium", user_id)

    mock_client.order.create.assert_called_once_with({
        "amount": 20000,
        "currency": "INR",
        "notes": {"tier": "premium", "user_id": user_id},
    })
    assert result["order_id"] == "order_premium_123"
    assert result["amount"] == 20000
    assert result["currency"] == "INR"
    assert result["key_id"] == "rzp_test_key"


@patch("app.services.razorpay_service.settings")
@patch("app.services.razorpay_service.razorpay.Client")
def test_create_order_enterprise(mock_client_cls, mock_settings):
    """2. create_order('enterprise') → amount=50000."""
    mock_settings.RAZORPAY_KEY_ID = "rzp_test_key"
    mock_settings.RAZORPAY_KEY_SECRET = "secret"
    mock_client = MagicMock()
    mock_client.order.create.return_value = {"id": "order_ent_456"}
    mock_client_cls.return_value = mock_client

    result = create_order("enterprise", str(uuid.uuid4()))
    assert result["amount"] == 50000


def test_create_order_free_raises():
    """3. create_order('free') raises ValueError."""
    with pytest.raises(ValueError, match="not purchasable"):
        create_order("free", str(uuid.uuid4()))


@patch("app.services.razorpay_service.settings")
def test_create_order_missing_keys_raises(mock_settings):
    """4. create_order with empty RAZORPAY_KEY_ID raises RazorpayConfigError."""
    mock_settings.RAZORPAY_KEY_ID = ""
    mock_settings.RAZORPAY_KEY_SECRET = "secret"
    with pytest.raises(RazorpayConfigError):
        create_order("premium", str(uuid.uuid4()))


@patch("app.services.razorpay_service.settings")
def test_verify_checkout_signature_valid(mock_settings):
    """5. verify_checkout_signature returns True for valid HMAC."""
    mock_settings.RAZORPAY_KEY_SECRET = "test_secret_key"
    order_id = "order_ABC"
    payment_id = "pay_XYZ"
    sig = _valid_checkout_sig(order_id, payment_id, "test_secret_key")
    assert verify_checkout_signature(order_id, payment_id, sig) is True


@patch("app.services.razorpay_service.settings")
def test_verify_checkout_signature_invalid(mock_settings):
    """6. verify_checkout_signature returns False for tampered signature."""
    mock_settings.RAZORPAY_KEY_SECRET = "test_secret_key"
    assert verify_checkout_signature("order_ABC", "pay_XYZ", "tampered_sig") is False


@patch("app.services.razorpay_service.settings")
def test_verify_webhook_signature_valid(mock_settings):
    """7. verify_webhook_signature returns True for valid HMAC."""
    mock_settings.RAZORPAY_WEBHOOK_SECRET = "webhook_secret"
    body = b'{"event": "payment.captured", "id": "evt_123"}'
    sig = _valid_webhook_sig(body, "webhook_secret")
    assert verify_webhook_signature(body, sig) is True


@patch("app.services.razorpay_service.settings")
def test_verify_webhook_signature_tampered_body(mock_settings):
    """8. verify_webhook_signature returns False for tampered body."""
    mock_settings.RAZORPAY_WEBHOOK_SECRET = "webhook_secret"
    body = b'{"event": "payment.captured"}'
    sig = _valid_webhook_sig(b'{"event": "payment.failed"}', "webhook_secret")
    assert verify_webhook_signature(body, sig) is False


@patch("app.services.razorpay_service.settings")
@patch("app.services.razorpay_service.razorpay.Client")
def test_fetch_payment_returns_object(mock_client_cls, mock_settings):
    """9. fetch_payment returns the mocked payment object."""
    mock_settings.RAZORPAY_KEY_ID = "rzp_test_key"
    mock_settings.RAZORPAY_KEY_SECRET = "secret"
    mock_client = MagicMock()
    mock_payment = {
        "id": "pay_test123",
        "order_id": "order_test456",
        "amount": 20000,
        "currency": "INR",
        "status": "captured",
    }
    mock_client.payment.fetch.return_value = mock_payment
    mock_client_cls.return_value = mock_client

    result = fetch_payment("pay_test123")
    mock_client.payment.fetch.assert_called_once_with("pay_test123")
    assert result["status"] == "captured"
    assert result["amount"] == 20000
