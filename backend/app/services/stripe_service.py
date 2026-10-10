import stripe
from typing import Optional
from app.core.config import settings

# Initialize Stripe with API key
stripe.api_key = settings.STRIPE_SECRET_KEY


class StripeService:
    """Service for handling Stripe payment operations"""
    
    @staticmethod
    def create_customer(email: str, name: str, metadata: Optional[dict] = None) -> stripe.Customer:
        """
        Create a new Stripe customer
        
        Args:
            email: Customer email address
            name: Customer full name
            metadata: Additional metadata to store
            
        Returns:
            Stripe Customer object
        """
        customer = stripe.Customer.create(
            email=email,
            name=name,
            metadata=metadata or {}
        )
        return customer
    
    @staticmethod
    def create_checkout_session(
        customer_id: str,
        price_id: str,
        success_url: str,
        cancel_url: str,
        metadata: Optional[dict] = None
    ) -> stripe.checkout.Session:
        """
        Create a Stripe Checkout session for subscription
        
        Args:
            customer_id: Stripe customer ID
            price_id: Stripe price ID for the plan
            success_url: URL to redirect on successful payment
            cancel_url: URL to redirect on canceled payment
            metadata: Additional metadata
            
        Returns:
            Stripe Checkout Session object
        """
        session = stripe.checkout.Session.create(
            customer=customer_id,
            payment_method_types=['card'],
            line_items=[{
                'price': price_id,
                'quantity': 1,
            }],
            mode='subscription',
            success_url=success_url,
            cancel_url=cancel_url,
            metadata=metadata or {},
            allow_promotion_codes=True,
            billing_address_collection='required',
        )
        return session
    
    @staticmethod
    def get_subscription(subscription_id: str) -> stripe.Subscription:
        """
        Retrieve a subscription from Stripe
        
        Args:
            subscription_id: Stripe subscription ID
            
        Returns:
            Stripe Subscription object
        """
        return stripe.Subscription.retrieve(subscription_id)
    
    @staticmethod
    def cancel_subscription(subscription_id: str, at_period_end: bool = True) -> stripe.Subscription:
        """
        Cancel a subscription
        
        Args:
            subscription_id: Stripe subscription ID
            at_period_end: If True, cancel at period end; if False, cancel immediately
            
        Returns:
            Stripe Subscription object
        """
        if at_period_end:
            return stripe.Subscription.modify(
                subscription_id,
                cancel_at_period_end=True
            )
        else:
            return stripe.Subscription.delete(subscription_id)
    
    @staticmethod
    def update_subscription(subscription_id: str, new_price_id: str) -> stripe.Subscription:
        """
        Update a subscription to a new price/plan
        
        Args:
            subscription_id: Stripe subscription ID
            new_price_id: New Stripe price ID
            
        Returns:
            Updated Stripe Subscription object
        """
        subscription = stripe.Subscription.retrieve(subscription_id)
        
        return stripe.Subscription.modify(
            subscription_id,
            items=[{
                'id': subscription['items']['data'][0].id,
                'price': new_price_id,
            }],
            proration_behavior='always_invoice',
        )
    
    @staticmethod
    def construct_webhook_event(payload: bytes, sig_header: str, webhook_secret: str):
        """
        Construct and verify a webhook event from Stripe
        
        Args:
            payload: Raw request body
            sig_header: Stripe-Signature header
            webhook_secret: Webhook signing secret
            
        Returns:
            Verified Stripe Event object
            
        Raises:
            ValueError: If signature verification fails
            stripe.error.SignatureVerificationError: If signature is invalid
        """
        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, webhook_secret
            )
            return event
        except ValueError as e:
            # Invalid payload
            raise ValueError(f"Invalid payload: {str(e)}")
        except stripe.error.SignatureVerificationError as e:
            # Invalid signature
            raise stripe.error.SignatureVerificationError(
                f"Invalid signature: {str(e)}", sig_header
            )
    
    @staticmethod
    def get_customer(customer_id: str) -> stripe.Customer:
        """
        Retrieve a customer from Stripe
        
        Args:
            customer_id: Stripe customer ID
            
        Returns:
            Stripe Customer object
        """
        return stripe.Customer.retrieve(customer_id)
    
    @staticmethod
    def list_invoices(customer_id: str, limit: int = 10) -> list:
        """
        List invoices for a customer
        
        Args:
            customer_id: Stripe customer ID
            limit: Maximum number of invoices to return
            
        Returns:
            List of Stripe Invoice objects
        """
        invoices = stripe.Invoice.list(
            customer=customer_id,
            limit=limit
        )
        return invoices.data
    
    @staticmethod
    def get_price_id_for_tier(tier: str) -> Optional[str]:
        """
        Get Stripe price ID for a subscription tier
        
        Args:
            tier: Subscription tier (professional, enterprise)
            
        Returns:
            Stripe price ID or None if not configured
        """
        price_map = {
            'professional': settings.STRIPE_PRICE_PROFESSIONAL,
            'enterprise': settings.STRIPE_PRICE_ENTERPRISE,
        }
        return price_map.get(tier.lower())
    
    @staticmethod
    def create_customer_portal_session(customer_id: str, return_url: str) -> stripe.billing_portal.Session:
        """
        Create a billing portal session for customer to manage their subscription
        
        Args:
            customer_id: Stripe customer ID
            return_url: URL to return to after portal session
            
        Returns:
            Stripe BillingPortal Session object
        """
        session = stripe.billing_portal.Session.create(
            customer=customer_id,
            return_url=return_url,
        )
        return session


# Pricing information (amounts in paise, 1 Rupee = 100 paise)
TIER_PRICING = {
    'free': {
        'price': 0,
        'currency': 'INR',
        'interval': 'month',
        'interviews': 5,
        'interviewers': 1,
    },
    'professional': {
        'price': 20000,  # ₹200
        'currency': 'INR',
        'interval': 'month',
        'interviews': 50,
        'interviewers': 3,
    },
    'enterprise': {
        'price': 50000,  # ₹500
        'currency': 'INR',
        'interval': 'month',
        'interviews': -1,  # Unlimited
        'interviewers': -1,  # Unlimited
    }
}


def get_tier_price(tier: str) -> int:
    """Get price in paise for a tier"""
    return TIER_PRICING.get(tier.lower(), {}).get('price', 0)


def get_tier_limits(tier: str) -> dict:
    """Get usage limits for a tier"""
    tier_data = TIER_PRICING.get(tier.lower(), TIER_PRICING['free'])
    return {
        'interviews': tier_data['interviews'],
        'interviewers': tier_data['interviewers'],
    }
