"""add subscriptions and usage tracking

Revision ID: 0005_add_subscriptions
Revises: 0004_problem_bank_and_invites
Create Date: 2026-10-10 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '0005_add_subscriptions'
down_revision = '0004_problem_bank_and_invites'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create subscription status enum
    subscription_status_enum = postgresql.ENUM(
        'active', 'canceled', 'past_due', 'trialing',
        name='subscription_status'
    )
    subscription_status_enum.create(op.get_bind())
    
    # Create subscription tier enum
    subscription_tier_enum = postgresql.ENUM(
        'free', 'professional', 'enterprise',
        name='subscription_tier'
    )
    subscription_tier_enum.create(op.get_bind())
    
    # Create subscriptions table
    op.create_table(
        'subscriptions',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, unique=True),
        sa.Column('tier', subscription_tier_enum, nullable=False, server_default='free'),
        sa.Column('status', subscription_status_enum, nullable=False, server_default='active'),
        sa.Column('stripe_customer_id', sa.String, nullable=True),
        sa.Column('stripe_subscription_id', sa.String, nullable=True),
        sa.Column('current_period_start', sa.DateTime(timezone=True), nullable=True),
        sa.Column('current_period_end', sa.DateTime(timezone=True), nullable=True),
        sa.Column('monthly_interview_limit', sa.Integer, nullable=False, server_default='5'),
        sa.Column('interviews_used_this_month', sa.Integer, nullable=False, server_default='0'),
        sa.Column('monthly_interviewer_limit', sa.Integer, nullable=False, server_default='1'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    
    # Create indexes
    op.create_index('ix_subscriptions_user_id', 'subscriptions', ['user_id'])
    op.create_index('ix_subscriptions_stripe_customer_id', 'subscriptions', ['stripe_customer_id'])
    op.create_index('ix_subscriptions_stripe_subscription_id', 'subscriptions', ['stripe_subscription_id'])
    op.create_index('ix_subscriptions_tier', 'subscriptions', ['tier'])
    op.create_index('ix_subscriptions_status', 'subscriptions', ['status'])
    
    # Add subscription_tier to users table
    op.add_column('users', sa.Column('subscription_tier', sa.String, server_default='free', nullable=False))
    op.create_index('ix_users_subscription_tier', 'users', ['subscription_tier'])
    
    # Create invoices table for payment history
    op.create_table(
        'invoices',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('stripe_invoice_id', sa.String, nullable=False, unique=True),
        sa.Column('amount', sa.Integer, nullable=False),  # Amount in paise (₹1 = 100 paise)
        sa.Column('currency', sa.String(3), nullable=False, server_default='INR'),
        sa.Column('status', sa.String, nullable=False),  # paid, open, void, uncollectible
        sa.Column('invoice_pdf', sa.String, nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    
    op.create_index('ix_invoices_user_id', 'invoices', ['user_id'])
    op.create_index('ix_invoices_stripe_invoice_id', 'invoices', ['stripe_invoice_id'])


def downgrade() -> None:
    # Drop tables
    op.drop_index('ix_invoices_stripe_invoice_id', 'invoices')
    op.drop_index('ix_invoices_user_id', 'invoices')
    op.drop_table('invoices')
    
    op.drop_index('ix_users_subscription_tier', 'users')
    op.drop_column('users', 'subscription_tier')
    
    op.drop_index('ix_subscriptions_status', 'subscriptions')
    op.drop_index('ix_subscriptions_tier', 'subscriptions')
    op.drop_index('ix_subscriptions_stripe_subscription_id', 'subscriptions')
    op.drop_index('ix_subscriptions_stripe_customer_id', 'subscriptions')
    op.drop_index('ix_subscriptions_user_id', 'subscriptions')
    op.drop_table('subscriptions')
    
    # Drop enums
    op.execute('DROP TYPE subscription_tier')
    op.execute('DROP TYPE subscription_status')
