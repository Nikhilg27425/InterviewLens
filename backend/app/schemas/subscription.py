import uuid
from datetime import datetime
from pydantic import BaseModel, field_validator


class SubscriptionOut(BaseModel):
    tier: str
    interviews_used: int
    interviews_limit: int
    period_end: datetime | None
    is_unlimited: bool
    is_expired: bool
    percent_used: float  # 0.0–100.0, always 0.0 for unlimited

    model_config = {"from_attributes": True}


class CreateOrderOut(BaseModel):
    order_id: str
    amount: int      # paise
    currency: str
    key_id: str      # Razorpay public key — safe to send to frontend


class VerifyPaymentIn(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str

    @field_validator("razorpay_order_id", "razorpay_payment_id", "razorpay_signature")
    @classmethod
    def must_be_nonempty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("must not be empty")
        return v.strip()


class PaymentHistoryItem(BaseModel):
    order_id: str
    tier_purchased: str
    amount_paise: int
    payment_status: str
    fulfillment_status: str
    created_at: datetime

    model_config = {"from_attributes": True}
