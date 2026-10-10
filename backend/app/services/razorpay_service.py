import razorpay
import hmac
import hashlib
from typing import Optional, Dict, Any
from app.core.config import settings

# Initialize Razorpay client (lazy initialization to handle missing credentials gracefully)
_client = None

def get_razorpay_client():
    """Get or create Razorpay client instance"""
    global _client
    if _client is None:
        if not settings.RAZORPAY_KEY_ID or not settings.RAZORPAY_KEY_SECRET:
            raise ValueError("Razorpay credentials not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET environment variables.")
        _client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))
    return _client


class RazorpayService:
    """Service for handling Razorpay payment operations"""
    
    @staticmethod
    def create_subscription(
        plan_id: str,
        customer_email: str,
        customer_name: str,
        total_count: int = 120,  # 120 months = 10 years
        customer_notify: int = 1,
        notes: Optional[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """
        Create a Razorpay subscription
        
        Args:
            plan_id: Razorpay plan ID
            customer_email: Customer email
            customer_name: Customer name
            total_count: Total billing cycles (default 120 months)
            customer_notify: Whether to notify customer (1 = yes, 0 = no)
            notes: Additional metadata
            
        Returns:
            Subscription object with short_url (payment link)
        """
        subscription_data = {
            'plan_id': plan_id,
            'total_count': total_count,
            'customer_notify': customer_notify,
            'notes': notes or {}
        }
        
        # Optionally add customer details if provided
        if customer_email or customer_name:
            subscription_data['customer'] = {}
            if customer_email:
                subscription_data['customer']['email'] = customer_email
            if customer_name:
                subscription_data['customer']['name'] = customer_name
        
        subscription = get_razorpay_client().subscription.create(subscription_data)
        return subscription
    
    @staticmethod
    def get_subscription(subscription_id: str) -> Dict[str, Any]:
        """
        Retrieve a subscription from Razorpay
        
        Args:
            subscription_id: Razorpay subscription ID
            
        Returns:
            Subscription object
        """
        return get_razorpay_client().subscription.fetch(subscription_id)
    
    @staticmethod
    def cancel_subscription(subscription_id: str, cancel_at_cycle_end: bool = True) -> Dict[str, Any]:
        """
        Cancel a subscription
        
        Args:
            subscription_id: Razorpay subscription ID
            cancel_at_cycle_end: If True, cancel at period end; if False, cancel immediately
            
        Returns:
            Subscription object
        """
        return get_razorpay_client().subscription.cancel(subscription_id, {
            'cancel_at_cycle_end': 1 if cancel_at_cycle_end else 0
        })
    
    @staticmethod
    def pause_subscription(subscription_id: str) -> Dict[str, Any]:
        """
        Pause a subscription
        
        Args:
            subscription_id: Razorpay subscription ID
            
        Returns:
            Subscription object
        """
        return get_razorpay_client().subscription.pause(subscription_id)
    
    @staticmethod
    def resume_subscription(subscription_id: str) -> Dict[str, Any]:
        """
        Resume a paused subscription
        
        Args:
            subscription_id: Razorpay subscription ID
            
        Returns:
            Subscription object
        """
        return get_razorpay_client().subscription.resume(subscription_id)
    
    @staticmethod
    def get_plan_id_for_tier(tier: str) -> Optional[str]:
        """
        Get Razorpay plan ID for a subscription tier
        
        Args:
            tier: Subscription tier ('professional' or 'enterprise')
            
        Returns:
            Razorpay plan ID or None if not configured
        """
        tier_to_plan = {
            'professional': settings.RAZORPAY_PLAN_PROFESSIONAL,
            'enterprise': settings.RAZORPAY_PLAN_ENTERPRISE,
        }
        return tier_to_plan.get(tier.lower())
    
    @staticmethod
    def verify_webhook_signature(payload: bytes, signature: str, secret: str) -> bool:
        """
        Verify Razorpay webhook signature
        
        Args:
            payload: Raw webhook payload (bytes)
            signature: X-Razorpay-Signature header value
            secret: Webhook secret from Razorpay dashboard
            
        Returns:
            True if signature is valid, False otherwise
        """
        try:
            # Razorpay uses HMAC SHA256
            expected_signature = hmac.new(
                key=secret.encode('utf-8'),
                msg=payload,
                digestmod=hashlib.sha256
            ).hexdigest()
            
            return hmac.compare_digest(expected_signature, signature)
        except Exception:
            return False
    
    @staticmethod
    def fetch_payment(payment_id: str) -> Dict[str, Any]:
        """
        Fetch payment details
        
        Args:
            payment_id: Razorpay payment ID
            
        Returns:
            Payment object
        """
        return get_razorpay_client().payment.fetch(payment_id)
    
    @staticmethod
    def fetch_invoice(invoice_id: str) -> Dict[str, Any]:
        """
        Fetch invoice details
        
        Args:
            invoice_id: Razorpay invoice ID
            
        Returns:
            Invoice object
        """
        return get_razorpay_client().invoice.fetch(invoice_id)
