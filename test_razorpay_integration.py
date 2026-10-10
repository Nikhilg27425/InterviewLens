#!/usr/bin/env python3
"""
Test script for Razorpay integration
Tests all subscription endpoints without needing a browser
"""

import requests
import json
import sys
from datetime import datetime

BASE_URL = "http://localhost:8000"

def print_test(name, passed, details=""):
    """Print test result"""
    status = "✅ PASS" if passed else "❌ FAIL"
    print(f"{status} - {name}")
    if details:
        print(f"   {details}")
    print()

def test_health_check():
    """Test if backend is running"""
    try:
        response = requests.get(f"{BASE_URL}/", timeout=5)
        return response.status_code == 200
    except:
        return False

def test_get_plans():
    """Test getting subscription plans"""
    try:
        response = requests.get(f"{BASE_URL}/api/subscriptions/plans")
        if response.status_code == 200:
            data = response.json()
            plans = data.get('plans', [])
            
            # Verify all tiers exist
            tiers = {p['tier'] for p in plans}
            expected_tiers = {'free', 'professional', 'enterprise'}
            
            if tiers == expected_tiers:
                # Verify pricing
                prof = next(p for p in plans if p['tier'] == 'professional')
                ent = next(p for p in plans if p['tier'] == 'enterprise')
                
                if prof['price'] == 200 and ent['price'] == 500:
                    return True, f"Found all 3 tiers with correct pricing (₹200, ₹500)"
                else:
                    return False, f"Wrong pricing: Prof=₹{prof['price']}, Ent=₹{ent['price']}"
            else:
                return False, f"Missing tiers. Found: {tiers}"
        return False, f"Status: {response.status_code}"
    except Exception as e:
        return False, str(e)

def test_razorpay_service():
    """Test that Razorpay service is configured"""
    try:
        # Try importing the service
        import sys
        sys.path.insert(0, 'backend')
        from app.services.razorpay_service import RazorpayService
        from app.core.config import settings
        
        # Check if keys are configured
        if not settings.RAZORPAY_KEY_ID or settings.RAZORPAY_KEY_ID == "rzp_test_your_key_id_here":
            return False, "RAZORPAY_KEY_ID not configured in .env"
        
        if not settings.RAZORPAY_PLAN_PROFESSIONAL or settings.RAZORPAY_PLAN_PROFESSIONAL.startswith("plan_your"):
            return False, "RAZORPAY_PLAN_PROFESSIONAL not configured in .env"
        
        if not settings.RAZORPAY_PLAN_ENTERPRISE or settings.RAZORPAY_PLAN_ENTERPRISE.startswith("plan_your"):
            return False, "RAZORPAY_PLAN_ENTERPRISE not configured in .env"
        
        # Test plan ID retrieval
        prof_plan = RazorpayService.get_plan_id_for_tier('professional')
        ent_plan = RazorpayService.get_plan_id_for_tier('enterprise')
        
        if prof_plan and ent_plan:
            return True, f"Plans configured: {prof_plan[:20]}..., {ent_plan[:20]}..."
        else:
            return False, "Plan IDs not found"
    except Exception as e:
        return False, str(e)

def test_webhook_signature_verification():
    """Test webhook signature verification"""
    try:
        import sys
        sys.path.insert(0, 'backend')
        from app.services.razorpay_service import RazorpayService
        
        # Test data
        payload = b'{"event":"subscription.activated"}'
        secret = "test_secret_123"
        
        # Generate signature
        import hmac
        import hashlib
        expected_sig = hmac.new(
            secret.encode('utf-8'),
            payload,
            hashlib.sha256
        ).hexdigest()
        
        # Test verification
        is_valid = RazorpayService.verify_webhook_signature(payload, expected_sig, secret)
        
        if is_valid:
            # Also test invalid signature
            invalid = RazorpayService.verify_webhook_signature(payload, "wrong_signature", secret)
            if not invalid:
                return True, "Signature verification working correctly"
            else:
                return False, "Failed to reject invalid signature"
        else:
            return False, "Failed to verify valid signature"
    except Exception as e:
        return False, str(e)

def test_database_migration():
    """Test that Razorpay migration was applied"""
    try:
        import sys
        sys.path.insert(0, 'backend')
        from sqlalchemy import create_engine, inspect
        from app.core.config import settings
        
        # Create engine
        engine = create_engine(settings.DATABASE_URL.replace('asyncpg', 'psycopg2'))
        inspector = inspect(engine)
        
        # Check subscriptions table
        columns = [col['name'] for col in inspector.get_columns('subscriptions')]
        
        # Should have razorpay columns, not stripe
        has_razorpay = 'razorpay_customer_id' in columns and 'razorpay_subscription_id' in columns and 'razorpay_plan_id' in columns
        has_stripe = 'stripe_customer_id' in columns or 'stripe_subscription_id' in columns
        
        if has_razorpay and not has_stripe:
            return True, "Migration successful: razorpay_* columns present, stripe_* removed"
        elif has_razorpay and has_stripe:
            return False, "Migration incomplete: both stripe and razorpay columns present"
        elif not has_razorpay:
            return False, "Migration not applied: razorpay columns missing"
        else:
            return False, "Unknown state"
    except Exception as e:
        return False, str(e)

def main():
    """Run all tests"""
    print("=" * 60)
    print("RAZORPAY INTEGRATION TEST SUITE")
    print("=" * 60)
    print()
    
    tests = [
        ("Backend Health Check", test_health_check),
        ("Get Subscription Plans", test_get_plans),
        ("Razorpay Service Configuration", test_razorpay_service),
        ("Webhook Signature Verification", test_webhook_signature_verification),
        ("Database Migration (Razorpay columns)", test_database_migration),
    ]
    
    passed = 0
    failed = 0
    
    for name, test_func in tests:
        try:
            result = test_func()
            if isinstance(result, tuple):
                success, details = result
            else:
                success = result
                details = ""
            
            print_test(name, success, details)
            if success:
                passed += 1
            else:
                failed += 1
        except Exception as e:
            print_test(name, False, f"Exception: {str(e)}")
            failed += 1
    
    print("=" * 60)
    print(f"RESULTS: {passed} passed, {failed} failed")
    print("=" * 60)
    print()
    
    if failed == 0:
        print("✅ All tests passed! Razorpay integration is working.")
        print()
        print("Next steps:")
        print("1. Open browser: http://localhost:5173")
        print("2. Login to your account")
        print("3. Go to Pricing page")
        print("4. Click 'Upgrade to Professional'")
        print("5. Use test card: 4111 1111 1111 1111")
        print("6. OTP: 1234")
        print("7. Verify subscription in Dashboard")
        return 0
    else:
        print("❌ Some tests failed. Please fix the issues above.")
        return 1

if __name__ == "__main__":
    sys.exit(main())
