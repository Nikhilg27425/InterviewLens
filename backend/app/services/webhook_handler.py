import logging
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.subscription import Subscription, Invoice, SubscriptionTier, SubscriptionStatus
from app.models.user import User

logger = logging.getLogger(__name__)


class WebhookHandler:
    """Handle Razorpay webhook events"""
    
    @staticmethod
    async def handle_subscription_activated(event_data: dict, db: AsyncSession):
        """
        Handle subscription.activated event
        Activate subscription when payment is successful
        """
        subscription_data = event_data['payload']['subscription']['entity']
        payment_data = event_data['payload'].get('payment', {}).get('entity', {})
        
        subscription_id = subscription_data['id']
        customer_email = subscription_data.get('customer_notify', {})
        notes = subscription_data.get('notes', {})
        user_id = notes.get('user_id')
        tier = notes.get('tier', 'professional')
        plan_id = subscription_data.get('plan_id')
        
        if not user_id:
            logger.error(f"No user_id in subscription notes: {subscription_id}")
            return
        
        # Get user
        result = await db.execute(
            select(User).where(User.id == user_id)
        )
        user = result.scalar_one_or_none()
        
        if not user:
            logger.error(f"User not found: {user_id}")
            return
        
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
        subscription.razorpay_subscription_id = subscription_id
        subscription.razorpay_plan_id = plan_id
        
        # Set period dates
        if subscription_data.get('start_at'):
            subscription.current_period_start = datetime.fromtimestamp(
                subscription_data['start_at'], tz=timezone.utc
            )
        if subscription_data.get('end_at'):
            subscription.current_period_end = datetime.fromtimestamp(
                subscription_data['end_at'], tz=timezone.utc
            )
        
        # Set limits based on tier
        limits = Subscription.get_limits_for_tier(SubscriptionTier(tier))
        subscription.monthly_interview_limit = limits['interviews'] if limits['interviews'] != -1 else 999999
        subscription.monthly_interviewer_limit = limits['interviewers'] if limits['interviewers'] != -1 else 999999
        subscription.interviews_used_this_month = 0
        
        # Update user tier
        user.subscription_tier = tier
        
        await db.commit()
        logger.info(f"Subscription activated for user {user_id}, tier: {tier}, subscription: {subscription_id}")
    
    @staticmethod
    async def handle_subscription_charged(event_data: dict, db: AsyncSession):
        """
        Handle subscription.charged event
        Record successful payment in invoices table
        """
        subscription_data = event_data['payload']['subscription']['entity']
        payment_data = event_data['payload']['payment']['entity']
        
        subscription_id = subscription_data['id']
        payment_id = payment_data['id']
        
        # Get subscription from database
        result = await db.execute(
            select(Subscription).where(Subscription.razorpay_subscription_id == subscription_id)
        )
        subscription = result.scalar_one_or_none()
        
        if not subscription:
            logger.warning(f"Subscription not found: {subscription_id}")
            return
        
        # Reset usage on successful payment (new billing cycle)
        subscription.interviews_used_this_month = 0
        subscription.status = SubscriptionStatus.ACTIVE
        
        # Update period dates if available
        if subscription_data.get('current_start'):
            subscription.current_period_start = datetime.fromtimestamp(
                subscription_data['current_start'], tz=timezone.utc
            )
        if subscription_data.get('current_end'):
            subscription.current_period_end = datetime.fromtimestamp(
                subscription_data['current_end'], tz=timezone.utc
            )
        
        # Check if invoice already exists
        result = await db.execute(
            select(Invoice).where(Invoice.razorpay_invoice_id == payment_id)
        )
        existing_invoice = result.scalar_one_or_none()
        
        if not existing_invoice:
            # Create new invoice record
            new_invoice = Invoice(
                user_id=subscription.user_id,
                razorpay_invoice_id=payment_id,
                amount=payment_data.get('amount', 0) // 100,  # Convert paise to rupees
                currency='INR',
                status='paid',
                invoice_pdf=None  # Razorpay doesn't provide PDF URL in webhook
            )
            db.add(new_invoice)
        
        await db.commit()
        logger.info(f"Subscription charged: {subscription_id}, payment: {payment_id}")
    
    @staticmethod
    async def handle_subscription_cancelled(event_data: dict, db: AsyncSession):
        """
        Handle subscription.cancelled event
        Mark subscription as canceled
        """
        subscription_data = event_data['payload']['subscription']['entity']
        subscription_id = subscription_data['id']
        
        # Get subscription from database
        result = await db.execute(
            select(Subscription).where(Subscription.razorpay_subscription_id == subscription_id)
        )
        subscription = result.scalar_one_or_none()
        
        if not subscription:
            logger.warning(f"Subscription not found for cancellation: {subscription_id}")
            return
        
        # Mark as canceled
        subscription.status = SubscriptionStatus.CANCELED
        
        # Check if we should immediately downgrade or wait for period end
        # If end_at is in the future, keep current tier until then
        if subscription_data.get('end_at'):
            end_time = datetime.fromtimestamp(subscription_data['end_at'], tz=timezone.utc)
            if end_time > datetime.now(timezone.utc):
                # Keep current tier until period end
                logger.info(f"Subscription will remain active until: {end_time}")
            else:
                # Downgrade immediately
                await WebhookHandler._downgrade_to_free(subscription, db)
        else:
            # Downgrade immediately
            await WebhookHandler._downgrade_to_free(subscription, db)
        
        await db.commit()
        logger.info(f"Subscription cancelled: {subscription_id}")
    
    @staticmethod
    async def handle_subscription_paused(event_data: dict, db: AsyncSession):
        """
        Handle subscription.paused event
        """
        subscription_data = event_data['payload']['subscription']['entity']
        subscription_id = subscription_data['id']
        
        result = await db.execute(
            select(Subscription).where(Subscription.razorpay_subscription_id == subscription_id)
        )
        subscription = result.scalar_one_or_none()
        
        if subscription:
            subscription.status = SubscriptionStatus.CANCELED
            await db.commit()
            logger.info(f"Subscription paused: {subscription_id}")
    
    @staticmethod
    async def handle_subscription_resumed(event_data: dict, db: AsyncSession):
        """
        Handle subscription.resumed event
        """
        subscription_data = event_data['payload']['subscription']['entity']
        subscription_id = subscription_data['id']
        
        result = await db.execute(
            select(Subscription).where(Subscription.razorpay_subscription_id == subscription_id)
        )
        subscription = result.scalar_one_or_none()
        
        if subscription:
            subscription.status = SubscriptionStatus.ACTIVE
            await db.commit()
            logger.info(f"Subscription resumed: {subscription_id}")
    
    @staticmethod
    async def handle_payment_failed(event_data: dict, db: AsyncSession):
        """
        Handle payment.failed event
        Mark subscription as past_due
        """
        payment_data = event_data['payload']['payment']['entity']
        subscription_id = payment_data.get('subscription_id')
        
        if not subscription_id:
            return
        
        # Get subscription from database
        result = await db.execute(
            select(Subscription).where(Subscription.razorpay_subscription_id == subscription_id)
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
    async def _downgrade_to_free(subscription: Subscription, db: AsyncSession):
        """Helper to downgrade a subscription to free tier"""
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
    
    @staticmethod
    async def process_webhook(event_type: str, event_data: dict, db: AsyncSession):
        """
        Process a Razorpay webhook event based on its type
        
        Args:
            event_type: Razorpay event type
            event_data: Event data payload
            db: Database session
        """
        handlers = {
            'subscription.activated': WebhookHandler.handle_subscription_activated,
            'subscription.charged': WebhookHandler.handle_subscription_charged,
            'subscription.cancelled': WebhookHandler.handle_subscription_cancelled,
            'subscription.paused': WebhookHandler.handle_subscription_paused,
            'subscription.resumed': WebhookHandler.handle_subscription_resumed,
            'payment.failed': WebhookHandler.handle_payment_failed,
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
