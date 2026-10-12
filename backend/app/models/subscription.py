import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Integer, Boolean, DateTime, ForeignKey, text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.db.base import Base


class Subscription(Base):
    """One row per user — tracks current entitlement state."""
    __tablename__ = "subscriptions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        index=True,
    )
    # tier: 'free' | 'premium' | 'enterprise' | 'expired'
    tier: Mapped[str] = mapped_column(String(20), nullable=False, default="free")
    interviews_used: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    # -1 means unlimited (enterprise)
    interviews_limit: Mapped[int] = mapped_column(Integer, nullable=False, default=5)

    period_start: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    # NULL for free tier (never expires)
    period_end: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    user: Mapped["User"] = relationship("User", back_populates="subscription")

    @property
    def is_unlimited(self) -> bool:
        return self.interviews_limit == -1

    @property
    def is_expired(self) -> bool:
        return self.tier == "expired"

    @property
    def percent_used(self) -> float:
        if self.is_unlimited:
            return 0.0
        if self.interviews_limit <= 0:
            return 100.0
        return min(100.0, round(self.interviews_used / self.interviews_limit * 100, 1))

    def __repr__(self) -> str:
        return f"<Subscription user={self.user_id} tier={self.tier} {self.interviews_used}/{self.interviews_limit}>"


class PaymentRecord(Base):
    """One row per payment attempt — immutable audit log."""
    __tablename__ = "payment_records"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    razorpay_order_id: Mapped[str] = mapped_column(
        String(64), nullable=False, unique=True, index=True
    )
    # Filled on capture
    razorpay_payment_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    # 'premium' or 'enterprise'
    tier_purchased: Mapped[str] = mapped_column(String(20), nullable=False)
    amount_paise: Mapped[int] = mapped_column(Integer, nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="INR")
    # 'created' | 'captured' | 'failed'
    payment_status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="created"
    )
    # 'pending' | 'fulfilled'
    fulfillment_status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="pending"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        server_default=text("now()"),
    )

    user: Mapped["User"] = relationship("User", back_populates="payment_records")

    def __repr__(self) -> str:
        return (
            f"<PaymentRecord order={self.razorpay_order_id} "
            f"tier={self.tier_purchased} {self.payment_status}/{self.fulfillment_status}>"
        )


class WebhookEvent(Base):
    """Idempotency log for Razorpay webhook events.

    razorpay_event_id is the primary key — the UNIQUE constraint is the PK itself.
    Concurrent duplicate events use INSERT ... ON CONFLICT DO NOTHING which
    serializes at the PostgreSQL level without needing a separate SELECT FOR UPDATE.
    """
    __tablename__ = "processed_webhook_events"

    razorpay_event_id: Mapped[str] = mapped_column(
        String(64), primary_key=True
    )
    event_type: Mapped[str] = mapped_column(String(64), nullable=False)
    # 'processing' | 'processed' | 'invalid'
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="processing")
    processed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        server_default=text("now()"),
    )

    def __repr__(self) -> str:
        return f"<WebhookEvent {self.razorpay_event_id} {self.status}>"
