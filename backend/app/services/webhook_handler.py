import logging
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.subscription import Subscription, Invoice, SubscriptionTier, SubscriptionStatus
from app.models.user import User

logger = logging.getLogger(__name__)


class WebhookHandler:
    """Handle Stripe webhook events"""
    
    @staticmethod
    async def handle_checkout_completed(event_data: dict, db: AsyncSession):
        """
        Handle checkout.session.completed event
        Activate subscription when payment is successful
        """
        session = event_data['object']
        customer_id = session.get('customer')
        subscription_id = session.get('subscription')
        metadata = session.get('metadata', {})
        user_id = metadata.get('user_id')
        
        if not user_id:
            logger.error(f"No user_id in checkout session metadata: {session['id']}")
            return
        
        # Get user
        result = await db.execute(
            select(User).where(User.id == user_id)
        )
        user = result.scalar_one_or_none()
        
        if not user:
            logger.error(f"User not found: {user_id}")
            return
        
        # Get subscription details from metadata
        tier = metadata.get('tier', 'professional')
        
        # Get or create subscription record
        result = await db.execute(
            select(Subscription).where(Subscription.user_id == user.id)
        )
        subscription = result.scalar_one_or_none()
        
        if not subscription:
            subscription = Subscription(user_id=user.id)
            db.add(subscription)
        
        # Update subscription
        subscription.tier = SubscriptionTier(tier)
        subscription.status = SubscriptionStatus.ACTIVE
        subscription.stripe_customer_id = customer_id
        subscription.stripe_subscription_id = subscription_id
        
        # Set limits based on tier
        limits = Subscription.get_limits_for_tier(SubscriptionTier(tier))
        subscription.monthly_interview_limit = limits['interviews'] if limits['interviews'] != -1 else 999999
        subscription.monthly_interviewer_limit = limits['interviewers'] if limits['interviewers'] != -1 else 999999
        subscription.interviews_used_this_month = 0
        
        # Update user tier
        user.subscription_tier = tier
        
        await db.commit()
        logger.info(f"Subscription activated for user {user_id}, tier: {tier}")
    
    @staticmethod
    async def handle_subscription_updated(event_data: dict, db: AsyncSession):
        """
        Handle customer.subscription.updated event
        Update subscription details when Stripe subscription changes
        """
        stripe_subscription = event_data['object']
        subscription_id = stripe_subscription['id']
        
        # Get subscription from database
        result = await db.execute(
            select(Subscription).where(Subscription.stripe_subscription_id == subscription_id)
        )
        subscription = result.scalar_one_or_none()
        
        if not subscription:
            logger.warning(f"Subscription not found: {subscription_id}")
            return
        
        # Update status
        stripe_status = stripe_subscription['status']
        status_map = {
            'active': SubscriptionStatus.ACTIVE,
            'canceled': SubscriptionStatus.CANCELED,
            'past_due': SubscriptionStatus.PAST_DUE,
            'trialing': SubscriptionStatus.TRIALING,
        }
        subscription.status = status_map.get(stripe_status, SubscriptionStatus.ACTIVE)
        
        # Update period dates
        subscription.current_period_start = datetime.fromtimestamp(
            stripe_subscription['current_period_start'], tz=timezone.utc
        )
        subscription.current_period_end = datetime.fromtimestamp(
            stripe_subscription['current_period_end'], tz=timezone.utc
        )
        
        # Reset usage on period renewal
        if stripe_subscription.get('billing_cycle_anchor'):
            subscription.interviews_used_this_month = 0
        
        await db.commit()
        logger.info(f"Subscription updated: {subscription_id}, status: {stripe_status}")
    
    @staticmethod
    async def handle_subscription_deleted(event_data: dict, db: AsyncSession):
        """
        Handle customer.subscription.deleted event
        Mark subscription as canceled
        """
        stripe_subscription = event_data['object']
        subscription_id = stripe_subscription['id']
        
        # Get subscription from database
        result = await db.execute(
            select(Subscription).where(Subscription.stripe_subscription_id == subscription_id)
        )
        subscription = result.scalar_one_or_none()
        
        if not subscription:
            logger.warning(f"Subscription not found for deletion: {subscription_id}")
            return
        
        # Mark as canceled
        subscription.status = SubscriptionStatus.CANCELED
        
        # Downgrade user to free tier
        subscription.tier = SubscriptionTier.FREE
        subscription.monthly_interview_limit = 5
        subscription.monthly_interviewer_limit = 1
        subscription.interviews_used_this_month = 0
        
        # Update user
        result = await db.execute(
            select(User).where(User.id == subscription.user_id)
        )
        user = result.scalar_one_or_none()
        if user:
            user.subscription_tier = 'free'
        
        await db.commit()
        logger.info(f"Subscription deleted and downgraded to free: {subscription_id}")
    
    @staticmethod
    async def handle_invoice_payment_succeeded(event_data: dict, db: AsyncSession):
        """
        Handle invoice.payment_succeeded event
        Record successful payment in invoices table
        """
        invoice = event_data['object']
        customer_id = invoice.get('customer')
        
        # Get subscription by customer_id
        result = await db.execute(
            select(Subscription).where(Subscription.stripe_customer_id == customer_id)
        )
        subscription = result.scalar_one_or_none()
        
        if not subscription:
            logger.warning(f"Subscription not found for customer: {customer_id}")
            return
        
        # Check if invoice already exists
        result = await db.execute(
            select(Invoice).where(Invoice.stripe_invoice_id == invoice['id'])
        )
        existing_invoice = result.scalar_one_or_none()
        
        if existing_invoice:
            # Update existing invoice
            existing_invoice.status = invoice['status']
            existing_invoice.invoice_pdf = invoice.get('invoice_pdf')
        else:
            # Create new invoice record
            new_invoice = Invoice(
                user_id=subscription.user_id,
                stripe_invoice_id=invoice['id'],
                amount=invoice['amount_paid'],
                currency=invoice['currency'].upper(),
                status=invoice['status'],
                invoice_pdf=invoice.get('invoice_pdf')
            )
            db.add(new_invoice)
        
        await db.commit()
        logger.info(f"Invoice payment recorded: {invoice['id']}, amount: {invoice['amount_paid']}")
    
    @staticmethod
    async def handle_invoice_payment_failed(event_data: dict, db: AsyncSession):
        """
        Handle invoice.payment_failed event
        Mark subscription as past_due
        """
        invoice = event_data['object']
        subscription_id = invoice.get('subscription')
        
        if not subscription_id:
            return
        
        # Get subscription from database
        result = await db.execute(
            select(Subscription).where(Subscription.stripe_subscription_id == subscription_id)
        )
        subscription = result.scalar_one_or_none()
        
        if not subscription:
            logger.warning(f"Subscription not found for failed payment: {subscription_id}")
            return
        
        # Mark as past_due
        subscription.status = SubscriptionStatus.PAST_DUE
        
        await db.commit()
        logger.warning(f"Payment failed for subscription: {subscription_id}")
    
    @staticmethod
    async def process_webhook(event_type: str, event_data: dict, db: AsyncSession):
        """
        Process a webhook event based on its type
        
        Args:
            event_type: Stripe event type
            event_data: Event data payload
            db: Database session
        """
        handlers = {
            'checkout.session.completed': WebhookHandler.handle_checkout_completed,
            'customer.subscription.updated': WebhookHandler.handle_subscription_updated,
            'customer.subscription.deleted': WebhookHandler.handle_subscription_deleted,
            'invoice.payment_succeeded': WebhookHandler.handle_invoice_payment_succeeded,
            'invoice.payment_failed': WebhookHandler.handle_invoice_payment_failed,
        }
        
        handler = handlers.get(event_type)
        if handler:
            try:
                await handler(event_data, db)
                logger.info(f"Successfully processed webhook: {event_type}")
            except Exception as e:
                logger.error(f"Error processing webhook {event_type}: {str(e)}")
                raise
        else:
            logger.info(f"Unhandled webhook event type: {event_type}")
