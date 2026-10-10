from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional
from uuid import UUID


class SubscriptionBase(BaseModel):
    tier: str = Field(..., description="Subscription tier: free, professional, enterprise")
    status: str = Field(..., description="Subscription status: active, canceled, past_due, trialing")


class CheckoutSessionRequest(BaseModel):
    tier: str = Field(..., description="Tier to subscribe to: professional or enterprise")
    
    class Config:
        json_schema_extra = {
            "example": {
                "tier": "professional"
            }
        }


class CheckoutSessionResponse(BaseModel):
    checkout_url: str = Field(..., description="Stripe checkout session URL")
    session_id: str = Field(..., description="Stripe checkout session ID")


class UsageResponse(BaseModel):
    interviews_used: int = Field(..., description="Number of interviews used this month")
    interviews_limit: int = Field(..., description="Monthly interview limit (-1 for unlimited)")
    usage_percentage: float = Field(..., description="Usage percentage (0-100)")
    interviewers_limit: int = Field(..., description="Maximum number of interviewer accounts")
    
    class Config:
        json_schema_extra = {
            "example": {
                "interviews_used": 3,
                "interviews_limit": 50,
                "usage_percentage": 6.0,
                "interviewers_limit": 3
            }
        }


class SubscriptionStatusResponse(BaseModel):
    tier: str = Field(..., description="Current subscription tier")
    status: str = Field(..., description="Subscription status")
    current_period_start: Optional[datetime] = Field(None, description="Current billing period start")
    current_period_end: Optional[datetime] = Field(None, description="Current billing period end")
    interviews_used: int = Field(..., description="Interviews used this month")
    interviews_limit: int = Field(..., description="Monthly interview limit")
    usage_percentage: float = Field(..., description="Usage as percentage")
    is_active: bool = Field(..., description="Whether subscription is active")
    stripe_customer_id: Optional[str] = Field(None, description="Stripe customer ID")
    
    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "tier": "professional",
                "status": "active",
                "current_period_start": "2026-10-01T00:00:00Z",
                "current_period_end": "2026-11-01T00:00:00Z",
                "interviews_used": 15,
                "interviews_limit": 50,
                "usage_percentage": 30.0,
                "is_active": True,
                "stripe_customer_id": "cus_abc123"
            }
        }


class SubscriptionResponse(BaseModel):
    id: UUID
    user_id: UUID
    tier: str
    status: str
    stripe_customer_id: Optional[str]
    stripe_subscription_id: Optional[str]
    current_period_start: Optional[datetime]
    current_period_end: Optional[datetime]
    monthly_interview_limit: int
    interviews_used_this_month: int
    monthly_interviewer_limit: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class PlanInfo(BaseModel):
    tier: str = Field(..., description="Plan tier name")
    price: int = Field(..., description="Price in INR")
    interviews: int = Field(..., description="Monthly interview limit (-1 for unlimited)")
    interviewers: int = Field(..., description="Interviewer account limit (-1 for unlimited)")
    features: list[str] = Field(..., description="List of features")


class PlansResponse(BaseModel):
    plans: list[PlanInfo] = Field(..., description="Available subscription plans")
    
    class Config:
        json_schema_extra = {
            "example": {
                "plans": [
                    {
                        "tier": "free",
                        "price": 0,
                        "interviews": 5,
                        "interviewers": 1,
                        "features": ["5 interviews/month", "1 interviewer", "Basic proctoring"]
                    },
                    {
                        "tier": "professional",
                        "price": 200,
                        "interviews": 50,
                        "interviewers": 3,
                        "features": ["50 interviews/month", "3 interviewers", "Advanced features"]
                    },
                    {
                        "tier": "enterprise",
                        "price": 500,
                        "interviews": -1,
                        "interviewers": -1,
                        "features": ["Unlimited interviews", "Unlimited interviewers", "All features"]
                    }
                ]
            }
        }


class InvoiceResponse(BaseModel):
    id: UUID
    stripe_invoice_id: str
    amount: int = Field(..., description="Amount in paise")
    currency: str
    status: str
    invoice_pdf: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True


class CancelSubscriptionRequest(BaseModel):
    reason: Optional[str] = Field(None, description="Reason for cancellation")
    
    class Config:
        json_schema_extra = {
            "example": {
                "reason": "Too expensive for our needs"
            }
        }


class CancelSubscriptionResponse(BaseModel):
    message: str
    access_until: Optional[datetime] = Field(None, description="Access available until this date")
