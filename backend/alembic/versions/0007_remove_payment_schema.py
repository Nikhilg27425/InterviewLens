"""remove payment schema — restore payment-free state

Revision ID: 0007
Revises: 0006
Create Date: 2026-10-11 00:00:00.000000

Removes all database objects introduced by migrations 0005 and 0006 so that
the production schema matches the current payment-free codebase.

Objects removed (all guarded with IF EXISTS):
  tables  : invoices, subscriptions
  column  : users.subscription_tier
  indexes : ix_invoices_*, ix_subscriptions_*, ix_users_subscription_tier
  enums   : subscription_tier, subscription_status

User accounts and all other application data are fully preserved.
"""
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = '0007'
down_revision = '0006'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # All statements use IF EXISTS so they are fully idempotent whether
    # objects are present or were partially removed by a prior run.
    #
    # Drop order respects FK dependencies:
    #   invoices (FK -> users)  must be dropped before the enum types.
    #   subscriptions (FK -> users) must be dropped before enum types.
    #   users.subscription_tier column references the enum, so drop column first.

    # ── invoices ──────────────────────────────────────────────────────────────
    op.execute(text("DROP INDEX  IF EXISTS ix_invoices_razorpay_invoice_id"))
    op.execute(text("DROP INDEX  IF EXISTS ix_invoices_stripe_invoice_id"))
    op.execute(text("DROP INDEX  IF EXISTS ix_invoices_user_id"))
    op.execute(text("DROP TABLE  IF EXISTS invoices"))

    # ── subscriptions ─────────────────────────────────────────────────────────
    op.execute(text("DROP INDEX  IF EXISTS ix_subscriptions_razorpay_plan_id"))
    op.execute(text("DROP INDEX  IF EXISTS ix_subscriptions_razorpay_subscription_id"))
    op.execute(text("DROP INDEX  IF EXISTS ix_subscriptions_razorpay_customer_id"))
    op.execute(text("DROP INDEX  IF EXISTS ix_subscriptions_stripe_subscription_id"))
    op.execute(text("DROP INDEX  IF EXISTS ix_subscriptions_stripe_customer_id"))
    op.execute(text("DROP INDEX  IF EXISTS ix_subscriptions_status"))
    op.execute(text("DROP INDEX  IF EXISTS ix_subscriptions_tier"))
    op.execute(text("DROP INDEX  IF EXISTS ix_subscriptions_user_id"))
    op.execute(text("DROP TABLE  IF EXISTS subscriptions"))

    # ── users.subscription_tier column ───────────────────────────────────────
    op.execute(text("DROP INDEX  IF EXISTS ix_users_subscription_tier"))
    op.execute(text("ALTER TABLE users DROP COLUMN IF EXISTS subscription_tier"))

    # ── PostgreSQL enum types (must come after column that uses them is gone) ─
    op.execute(text("DROP TYPE   IF EXISTS subscription_tier"))
    op.execute(text("DROP TYPE   IF EXISTS subscription_status"))


def downgrade() -> None:
    # Intentionally not restoring the payment schema — the feature is removed.
    raise NotImplementedError(
        "Downgrade of 0007 is not supported. "
        "To restore the payment schema, re-apply migrations 0005 and 0006 manually."
    )
