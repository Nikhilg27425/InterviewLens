from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
import logging
import json

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.models.subscription import Subscription, Invoice, SubscriptionTier, SubscriptionStatus
from app.schemas.subscription import (
    CheckoutSessionRequest,
    CheckoutSessionResponse,
    SubscriptionStatusResponse,
    UsageResponse,
    PlansResponse,
    PlanInfo,
    InvoiceResponse,
    CancelSubscriptionRequest,
    CancelSubscriptionResponse
)
from app.services.razorpay_service import RazorpayService
from app.services.webhook_handler import WebhookHandler
from app.core.config import settings

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/status", response_model=SubscriptionStatusResponse)
async def get_subscription_status(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get current user's subscription status and usage
    """
    # Get or create subscription
    result = await db.execute(
        select(Subscription).where(Subscription.user_id == current_user.id)
    )
    subscription = result.scalar_one_or_none()
    
    if not subscription:
        # Create default free subscription
        subscription = Subscription(
            user_id=current_user.id,
            tier=SubscriptionTier.FREE,
            status=SubscriptionStatus.ACTIVE,
            monthly_interview_limit=5,
            monthly_interviewer_limit=1,
            interviews_used_this_month=0
        )
        db.add(subscription)
        await db.commit()
        await db.refresh(subscription)
    
    return SubscriptionStatusResponse(
        tier=subscription.tier.value,
        status=subscription.status.value,
        current_period_start=subscription.current_period_start,
        current_period_end=subscription.current_period_end,
        interviews_used=subscription.interviews_used_this_month,
        interviews_limit=subscription.monthly_interview_limit,
        usage_percentage=subscription.get_usage_percentage(),
        is_active=subscription.is_active(),
        razorpay_customer_id=subscription.razorpay_customer_id
    )


@router.get("/usage", response_model=UsageResponse)
async def get_usage_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get current usage statistics for the user
    """
    result = await db.execute(
        select(Subscription).where(Subscription.user_id == current_user.id)
    )
    subscription = result.scalar_one_or_none()
    
    if not subscription:
        # Return default free tier limits
        return UsageResponse(
            interviews_used=0,
            interviews_limit=5,
            usage_percentage=0.0,
            interviewers_limit=1
        )
    
    return UsageResponse(
        interviews_used=subscription.interviews_used_this_month,
        interviews_limit=subscription.monthly_interview_limit,
        usage_percentage=subscription.get_usage_percentage(),
        interviewers_limit=subscription.monthly_interviewer_limit
    )


@router.post("/create-checkout-session", response_model=CheckoutSessionResponse)
async def create_checkout_session(
    request: CheckoutSessionRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a Razorpay subscription for purchase
    """
    # Validate tier
    if request.tier not in ['professional', 'enterprise']:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid tier. Must be 'professional' or 'enterprise'"
        )
    
    # Get or create subscription record
    result = await db.execute(
        select(Subscription).where(Subscription.user_id == current_user.id)
    )
    subscription = result.scalar_one_or_none()
    
    if not subscription:
        subscription = Subscription(user_id=current_user.id)
        db.add(subscription)
        await db.commit()
        await db.refresh(subscription)
    
    # Get plan ID for tier
    plan_id = RazorpayService.get_plan_id_for_tier(request.tier)
    if not plan_id:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Plan not configured for tier: {request.tier}"
        )
    
    # Create Razorpay subscription
    try:
        razorpay_subscription = RazorpayService.create_subscription(
            plan_id=plan_id,
            customer_email=current_user.email,
            customer_name=current_user.full_name,
            notes={
                'user_id': str(current_user.id),
                'tier': request.tier
            }
        )
        
        # Get payment link (short_url)
        payment_url = razorpay_subscription.get('short_url')
        subscription_id = razorpay_subscription.get('id')
        
        if not payment_url:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to generate payment link"
            )
        
        return CheckoutSessionResponse(
            payment_url=payment_url,
            session_id=subscription_id
        )
    except Exception as e:
        logger.error(f"Error creating Razorpay subscription: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create subscription"
        )


@router.post("/webhook", status_code=status.HTTP_200_OK)
async def razorpay_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Handle Razorpay webhook events (no authentication required)
    """
    # Get raw body and signature
    payload = await request.body()
    sig_header = request.headers.get('X-Razorpay-Signature')
    
    if not sig_header:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing X-Razorpay-Signature header"
        )
    
    # Verify webhook signature
    is_valid = RazorpayService.verify_webhook_signature(
        payload,
        sig_header,
        settings.RAZORPAY_WEBHOOK_SECRET
    )
    
    if not is_valid:
        logger.error("Webhook signature verification failed")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid signature"
        )
    
    # Parse webhook data
    try:
        event_data = json.loads(payload)
        event_type = event_data.get('event')
        
        if not event_type:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Missing event type"
            )
        
        # Process webhook event
        await WebhookHandler.process_webhook(
            event_type=event_type,
            event_data=event_data,
            db=db
        )
        return {"status": "success"}
    except json.JSONDecodeError as e:
        logger.error(f"Invalid JSON payload: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid JSON payload"
        )
    except Exception as e:
        logger.error(f"Error processing webhook: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Webhook processing failed"
        )


@router.get("/plans", response_model=PlansResponse)
async def get_available_plans():
    """
    Get all available subscription plans with pricing and features
    """
    plans = [
        PlanInfo(
            tier="free",
            price=0,
            interviews=5,
            interviewers=1,
            features=[
                "5 interviews per month",
                "1 interviewer account",
                "Basic proctoring (tab switching, camera)",
                "10 problems from problem bank",
                "Basic analytics dashboard",
                "7-day data retention",
                "Email support (48-hour response)"
            ]
        ),
        PlanInfo(
            tier="professional",
            price=200,
            interviews=50,
            interviewers=3,
            features=[
                "50 interviews per month",
                "3 interviewer accounts",
                "All proctoring features",
                "Unlimited problem bank access",
                "Create custom problems",
                "Advanced plagiarism detection",
                "Detailed analytics & insights",
                "30-day data retention",
                "Code playback & session replay",
                "Priority email support (12-hour response)",
                "Export reports (PDF)"
            ]
        ),
        PlanInfo(
            tier="enterprise",
            price=500,
            interviews=-1,
            interviewers=-1,
            features=[
                "Unlimited interviews",
                "Unlimited interviewer accounts",
                "All Professional features",
                "Custom branding (white-label)",
                "API access for integration",
                "SSO (Single Sign-On)",
                "Unlimited data retention",
                "Advanced behavioral analytics",
                "Candidate pipeline management",
                "Team collaboration tools",
                "Webhook notifications",
                "Custom problem templates",
                "24/7 priority support",
                "Dedicated account manager"
            ]
        )
    ]
    
    return PlansResponse(plans=plans)


@router.post("/cancel", response_model=CancelSubscriptionResponse)
async def cancel_subscription(
    request: CancelSubscriptionRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Cancel the current subscription (remains active until period end)
    """
    # Get subscription
    result = await db.execute(
        select(Subscription).where(Subscription.user_id == current_user.id)
    )
    subscription = result.scalar_one_or_none()
    
    if not subscription or not subscription.razorpay_subscription_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active subscription found"
        )
    
    if subscription.tier == SubscriptionTier.FREE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot cancel free tier"
        )
    
    # Cancel in Razorpay (at period end)
    try:
        RazorpayService.cancel_subscription(
            subscription.razorpay_subscription_id,
            cancel_at_cycle_end=True
        )
        
        # Update local status
        subscription.status = SubscriptionStatus.CANCELED
        await db.commit()
        
        return CancelSubscriptionResponse(
            message="Subscription canceled. Access will continue until the end of your billing period.",
            access_until=subscription.current_period_end
        )
    except Exception as e:
        logger.error(f"Error canceling subscription: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to cancel subscription"
        )


@router.get("/invoices", response_model=List[InvoiceResponse])
async def get_invoices(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get payment history (invoices) for the current user
    """
    result = await db.execute(
        select(Invoice)
        .where(Invoice.user_id == current_user.id)
        .order_by(Invoice.created_at.desc())
        .limit(20)
    )
    invoices = result.scalars().all()
    
    return [
        InvoiceResponse(
            id=invoice.id,
            razorpay_invoice_id=invoice.razorpay_invoice_id,
            amount=invoice.amount,
            currency=invoice.currency,
            status=invoice.status,
            invoice_pdf=invoice.invoice_pdf,
            created_at=invoice.created_at
        )
        for invoice in invoices
    ]
