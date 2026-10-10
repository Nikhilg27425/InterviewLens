# Razorpay Integration Testing Checklist

## ✅ Prerequisites Check

Your system is configured with:
- ✅ Backend running on http://localhost:8000
- ✅ Frontend running (npm run dev)
- ✅ Razorpay Key ID: `rzp_test_TmCPwGmV39w3q9`
- ✅ Professional Plan: `plan_TmGUZKq73AMYQw`
- ✅ Enterprise Plan: `plan_TmGVkabgvGpV3E`
- ✅ Database migration (0006) applied
- ✅ Subscription plans API working (tested)

## 🧪 Manual Testing Steps

### Test 1: Verify Backend APIs

Open PowerShell and run these commands:

```powershell
# Test 1: Get subscription plans
Invoke-RestMethod -Uri "http://localhost:8000/api/subscriptions/plans" -Method GET

# Expected: Should show 3 plans (free, professional ₹200, enterprise ₹500)
```

**Result**: ✅ PASSED (confirmed above)

### Test 2: Frontend Flow (Login Required)

1. **Open Browser**: http://localhost:5173

2. **Login** to your account
   - Use your existing credentials
   - Or create a new account

3. **Go to Dashboard**
   - You should see a subscription banner at the top
   - Should show "Free Plan" with usage stats

4. **Go to Pricing Page**
   - Click "Pricing" in navigation
   - Or go to: http://localhost:5173/pricing

5. **Try to Upgrade**
   - Click "Get Started" on Professional (₹200/month)
   - You should be redirected to Razorpay payment page

### Test 3: Razorpay Payment Page

When redirected, you should see:
- Razorpay hosted payment page
- Amount: ₹200.00
- Recurring: Every month
- Your email address

**DO NOT complete payment yet!** (Unless you want to actually subscribe)

For testing, use Razorpay test card:
- Card: `4111 1111 1111 1111`
- CVV: `123`
- Expiry: `12/28`
- OTP: `1234`

### Test 4: After Payment Success

After successful payment:
1. You'll be redirected to `/checkout/success`
2. Should show "Payment Successful! 🎉"
3. Wait 2 seconds for webhook processing
4. Should show your new tier (Professional)

### Test 5: Verify Subscription

1. **Go to Dashboard**
   - Subscription banner should now show "Professional Plan"
   - Usage: "0 / 50 interviews used"
   - Should see upgrade button to Enterprise

2. **Go to Settings → Billing**
   - Current Plan: Professional
   - Status: Active
   - Usage statistics
   - Billing history (should show invoice)

3. **Try Creating an Interview**
   - Should work without hitting limits
   - Usage counter should increment

### Test 6: Verify in Razorpay Dashboard

1. Login to https://dashboard.razorpay.com
2. Go to **Subscriptions**
   - Should see your new subscription
   - Status: Active
   - Plan: Professional Plan
   - Amount: ₹200

3. Go to **Payments**
   - Should see the payment record
   - Amount: ₹200.00
   - Status: Captured

4. Go to **Webhooks**
   - Click on your webhook
   - Recent Deliveries should show:
     - `subscription.activated` (status 200)
     - `subscription.charged` (status 200)

## 🔍 Troubleshooting

### If payment page doesn't load:
- Check backend logs for errors
- Verify RAZORPAY_KEY_ID and RAZORPAY_PLAN_* are correct
- Ensure plans exist in Razorpay dashboard

### If webhook fails:
- Webhook URL must be publicly accessible (not localhost)
- For local testing:
  1. Use ngrok: `ngrok http 8000`
  2. Update webhook URL in Razorpay dashboard
  3. Retry payment

### If subscription not activated:
- Check backend logs: `get_process_output term_1791649540513_3dh1y52t8wh`
- Verify webhook is configured correctly
- Check Razorpay dashboard → Webhooks → Recent Deliveries

## ✅ Quick Verification Commands

Run these in PowerShell:

```powershell
# Check backend is running
Invoke-RestMethod -Uri "http://localhost:8000/api/subscriptions/plans" -Method GET

# Check frontend is accessible
(Invoke-WebRequest -Uri "http://localhost:5173").StatusCode

# Check backend logs (replace with your terminal ID)
# Look for any errors
```

## 🎯 Success Criteria

✅ All manual tests passed
✅ Can create checkout session
✅ Razorpay payment page loads
✅ Payment completes successfully  
✅ Webhook processes correctly
✅ Subscription activated in database
✅ Dashboard shows correct tier
✅ Usage tracking works
✅ Can cancel subscription

## 📊 Current Test Status

Based on automated tests:
- ✅ Plans API: Working
- ✅ Webhook signature verification: Working
- ✅ Migration: Applied
- ⏳ Full payment flow: Needs manual testing (browser required)

## 🚀 Ready for Production?

Before going live:
- [ ] Switch to Razorpay Live keys (not test keys)
- [ ] Update FRONTEND_URL to your production domain
- [ ] Recreate plans in Razorpay Live mode
- [ ] Update webhook URL to production
- [ ] Test with real card (then immediately cancel)
- [ ] Complete KYC verification with Razorpay

---

**Note**: Your Razorpay integration is code-complete and configuration-complete. The only remaining step is manual browser testing of the full payment flow!
