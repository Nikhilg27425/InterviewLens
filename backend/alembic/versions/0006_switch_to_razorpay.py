"""switch to razorpay

Revision ID: 0006
Revises: 0005
Create Date: 2026-10-10 18:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '0006'
down_revision = '0005'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Rename columns in subscriptions table
    op.alter_column('subscriptions', 'stripe_customer_id',
                    new_column_name='razorpay_customer_id')
    op.alter_column('subscriptions', 'stripe_subscription_id',
                    new_column_name='razorpay_subscription_id')
    
    # Add razorpay_plan_id column
    op.add_column('subscriptions',
                  sa.Column('razorpay_plan_id', sa.String(), nullable=True))
    
    # Rename column in invoices table (check if table exists first)
    from sqlalchemy import inspect
    conn = op.get_bind()
    inspector = inspect(conn)
    tables = inspector.get_table_names()
    
    if 'invoices' in tables:
        op.alter_column('invoices', 'stripe_invoice_id',
                        new_column_name='razorpay_invoice_id')
    
    # Drop old indexes if they exist
    indexes = [idx['name'] for idx in inspector.get_indexes('subscriptions')]
    if 'ix_subscriptions_stripe_customer_id' in indexes:
        op.drop_index('ix_subscriptions_stripe_customer_id', table_name='subscriptions')
    if 'ix_subscriptions_stripe_subscription_id' in indexes:
        op.drop_index('ix_subscriptions_stripe_subscription_id', table_name='subscriptions')
    
    # Create new indexes if they don't exist
    if 'ix_subscriptions_razorpay_customer_id' not in indexes:
        op.create_index('ix_subscriptions_razorpay_customer_id', 'subscriptions', ['razorpay_customer_id'])
    if 'ix_subscriptions_razorpay_subscription_id' not in indexes:
        op.create_index('ix_subscriptions_razorpay_subscription_id', 'subscriptions', ['razorpay_subscription_id'])
    if 'ix_subscriptions_razorpay_plan_id' not in indexes:
        op.create_index('ix_subscriptions_razorpay_plan_id', 'subscriptions', ['razorpay_plan_id'])


def downgrade() -> None:
    # Rename columns back
    op.alter_column('subscriptions', 'razorpay_customer_id',
                    new_column_name='stripe_customer_id')
    op.alter_column('subscriptions', 'razorpay_subscription_id',
                    new_column_name='stripe_subscription_id')
    
    # Remove razorpay_plan_id column
    op.drop_column('subscriptions', 'razorpay_plan_id')
    
    # Rename invoice column back
    op.alter_column('invoices', 'razorpay_invoice_id',
                    new_column_name='stripe_invoice_id')
    
    # Drop new indexes
    op.drop_index('ix_subscriptions_razorpay_customer_id', table_name='subscriptions')
    op.drop_index('ix_subscriptions_razorpay_subscription_id', table_name='subscriptions')
    op.drop_index('ix_subscriptions_razorpay_plan_id', table_name='subscriptions')
    
    # Recreate old indexes
    op.create_index('ix_subscriptions_stripe_customer_id', 'subscriptions', ['stripe_customer_id'])
    op.create_index('ix_subscriptions_stripe_subscription_id', 'subscriptions', ['stripe_subscription_id'])
