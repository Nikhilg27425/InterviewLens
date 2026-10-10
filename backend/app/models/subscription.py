import enum
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid

from app.db.base import Base


class SubscriptionTier(str, enum.Enum):
    FREE = "free"
    PROFESSIONAL = "professional"
    ENTERPRISE = "enterprise"


class SubscriptionStatus(str, enum.Enum):
    ACTIVE = "active"
    CANCELED = "canceled"
    PAST_DUE = "past_due"
    TRIALING = "trialing"


class Subscription(Base):
    __tablename__ = "subscriptions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)
    tier = Column(SQLEnum(SubscriptionTier), nullable=False, default=SubscriptionTier.FREE)
    status = Column(SQLEnum(SubscriptionStatus), nullable=False, default=SubscriptionStatus.ACTIVE)
    
    # Razorpay IDs
    razorpay_customer_id = Column(String, nullable=True)
    razorpay_subscription_id = Column(String, nullable=True)
    razorpay_plan_id = Column(String, nullable=True)
    
    # Billing period
    current_period_start = Column(DateTime(timezone=True), nullable=True)
    current_period_end = Column(DateTime(timezone=True), nullable=True)
    
    # Usage limits and tracking
    monthly_interview_limit = Column(Integer, nullable=False, default=5)
    interviews_used_this_month = Column(Integer, nullable=False, default=0)
    monthly_interviewer_limit = Column(Integer, nullable=False, default=1)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    # Relationships
    user = relationship("User", back_populates="subscription")
    
    def can_create_interview(self) -> bool:
        """Check if user can create a new interview based on their tier and usage"""
        if self.tier == SubscriptionTier.ENTERPRISE:
            return True  # Unlimited
        
        return self.interviews_used_this_month < self.monthly_interview_limit
    
    def increment_usage(self):
        """Increment the interview usage counter"""
        self.interviews_used_this_month += 1
        self.updated_at = datetime.now(timezone.utc)
    
    def reset_monthly_usage(self):
        """Reset usage counter (called on billing period renewal)"""
        self.interviews_used_this_month = 0
        self.updated_at = datetime.now(timezone.utc)
    
    def is_active(self) -> bool:
        """Check if subscription is active"""
        return self.status == SubscriptionStatus.ACTIVE
    
    def get_usage_percentage(self) -> float:
        """Get usage as percentage (0-100)"""
        if self.tier == SubscriptionTier.ENTERPRISE:
            return 0.0  # Unlimited, so always 0%
        
        if self.monthly_interview_limit == 0:
            return 0.0
        
        return (self.interviews_used_this_month / self.monthly_interview_limit) * 100
    
    @staticmethod
    def get_limits_for_tier(tier: SubscriptionTier) -> dict:
        """Get usage limits for a given tier"""
        limits = {
            SubscriptionTier.FREE: {
                "interviews": 5,
                "interviewers": 1,
                "price": 0,
                "currency": "INR"
            },
            SubscriptionTier.PROFESSIONAL: {
                "interviews": 50,
                "interviewers": 3,
                "price": 20000,  # ₹200 in paise
                "currency": "INR"
            },
            SubscriptionTier.ENTERPRISE: {
                "interviews": -1,  # Unlimited
                "interviewers": -1,  # Unlimited
                "price": 50000,  # ₹500 in paise
                "currency": "INR"
            }
        }
        return limits.get(tier, limits[SubscriptionTier.FREE])


class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    # Razorpay details
    razorpay_invoice_id = Column(String, nullable=False, unique=True)
    amount = Column(Integer, nullable=False)  # Amount in rupees
    currency = Column(String(3), nullable=False, default="INR")
    status = Column(String, nullable=False)  # paid, open, void, uncollectible
    invoice_pdf = Column(String, nullable=True)
    
    # Timestamp
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    
    # Relationships
    user = relationship("User", back_populates="invoices")
