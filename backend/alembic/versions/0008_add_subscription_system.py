"""add subscription system

Revision ID: 0008
Revises: 0007
Create Date: 2026-10-12 00:00:00.000000

Adds:
  - subscription_tier VARCHAR to users (default 'free')
  - quota_consumed BOOLEAN to interview_sessions (default False)
  - subscriptions table (1 per user — entitlement state)
  - payment_records table (1 per payment attempt — audit log)
  - processed_webhook_events table (idempotency log, PK = razorpay_event_id)
  - Enum types: subscription_tier, payment_status, fulfillment_status
  - Backfill: existing users get a free-tier subscription row

Enums are created fresh (0007 dropped the old subscription_tier and
subscription_status types entirely). No ALTER TYPE ADD VALUE used.
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '0008'
down_revision = '0007'
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()

    # ── Enum types ────────────────────────────────────────────────────────────
    # All created fresh — 0007 dropped the old subscription_tier enum.
    # create_type=False + .create(checkfirst=True) is the safe pattern used
    # throughout this project (see 0005_add_subscriptions.py).
    tier_enum = postgresql.ENUM(
        'free', 'premium', 'enterprise', 'expired',
        name='subscription_tier',
        create_type=False,
    )
    tier_enum.create(conn, checkfirst=True)

    payment_status_enum = postgresql.ENUM(
        'created', 'captured', 'failed',
        name='payment_status',
        create_type=False,
    )
    payment_status_enum.create(conn, checkfirst=True)

    fulfillment_status_enum = postgresql.ENUM(
        'pending', 'fulfilled',
        name='fulfillment_status',
        create_type=False,
    )
    fulfillment_status_enum.create(conn, checkfirst=True)

    # ── New columns on existing tables ───────────────────────────────────────
    op.execute(
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS "
        "subscription_tier VARCHAR(20) NOT NULL DEFAULT 'free'"
    )
    op.execute(
        "ALTER TABLE interview_sessions ADD COLUMN IF NOT EXISTS "
        "quota_consumed BOOLEAN NOT NULL DEFAULT FALSE"
    )

    # ── subscriptions table ───────────────────────────────────────────────────
    op.create_table(
        'subscriptions',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text('gen_random_uuid()')),
        sa.Column('user_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('users.id', ondelete='CASCADE'),
                  nullable=False, unique=True),
        sa.Column('tier', sa.String(20), nullable=False, server_default='free'),
        sa.Column('interviews_used', sa.Integer, nullable=False, server_default='0'),
        sa.Column('interviews_limit', sa.Integer, nullable=False, server_default='5'),
        sa.Column('period_start', sa.DateTime(timezone=True), nullable=True),
        sa.Column('period_end', sa.DateTime(timezone=True), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True),
                  server_default=sa.text('now()'), nullable=False),
    )
    op.create_index('ix_subscriptions_user_id', 'subscriptions', ['user_id'])
    op.create_index('ix_subscriptions_tier', 'subscriptions', ['tier'])

    # ── payment_records table ─────────────────────────────────────────────────
    op.create_table(
        'payment_records',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text('gen_random_uuid()')),
        sa.Column('user_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('razorpay_order_id', sa.String(64), nullable=False, unique=True),
        sa.Column('razorpay_payment_id', sa.String(64), nullable=True),
        sa.Column('tier_purchased', sa.String(20), nullable=False),
        sa.Column('amount_paise', sa.Integer, nullable=False),
        sa.Column('currency', sa.String(3), nullable=False, server_default='INR'),
        sa.Column('payment_status', sa.String(20), nullable=False, server_default='created'),
        sa.Column('fulfillment_status', sa.String(20), nullable=False, server_default='pending'),
        sa.Column('created_at', sa.DateTime(timezone=True),
                  server_default=sa.text('now()'), nullable=False),
    )
    op.create_index('ix_payment_records_user_id', 'payment_records', ['user_id'])
    op.create_index('ix_payment_records_order_id', 'payment_records', ['razorpay_order_id'])

    # ── processed_webhook_events table ───────────────────────────────────────
    # razorpay_event_id is the PK — the UNIQUE constraint comes free.
    # INSERT ... ON CONFLICT DO NOTHING uses this PK for atomic idempotency.
    op.create_table(
        'processed_webhook_events',
        sa.Column('razorpay_event_id', sa.String(64), primary_key=True),
        sa.Column('event_type', sa.String(64), nullable=False),
        sa.Column('status', sa.String(20), nullable=False, server_default='processing'),
        sa.Column('processed_at', sa.DateTime(timezone=True),
                  server_default=sa.text('now()'), nullable=False),
    )

    # ── Backfill existing users ───────────────────────────────────────────────
    # Every existing user gets a free-tier subscription row.
    # Uses gen_random_uuid() to generate IDs server-side.
    op.execute(sa.text("""
        INSERT INTO subscriptions (id, user_id, tier, interviews_used, interviews_limit, period_start, updated_at)
        SELECT
            gen_random_uuid(),
            id,
            'free',
            0,
            5,
            now(),
            now()
        FROM users
        WHERE id NOT IN (SELECT user_id FROM subscriptions)
    """))
    # Sync the denormalized column
    op.execute(sa.text("UPDATE users SET subscription_tier = 'free' WHERE subscription_tier IS NULL OR subscription_tier = ''"))


def downgrade() -> None:
    # Drop in FK dependency order
    op.drop_table('processed_webhook_events')
    op.drop_table('payment_records')
    op.drop_index('ix_subscriptions_tier', 'subscriptions')
    op.drop_index('ix_subscriptions_user_id', 'subscriptions')
    op.drop_table('subscriptions')
    op.execute('ALTER TABLE users DROP COLUMN IF EXISTS subscription_tier')
    op.execute('ALTER TABLE interview_sessions DROP COLUMN IF EXISTS quota_consumed')
    op.execute('DROP TYPE IF EXISTS fulfillment_status')
    op.execute('DROP TYPE IF EXISTS payment_status')
    op.execute('DROP TYPE IF EXISTS subscription_tier')
