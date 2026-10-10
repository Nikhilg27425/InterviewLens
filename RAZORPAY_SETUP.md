# Razorpay Subscription Setup Guide

This guide walks you through setting up Razorpay payments for InterviewLens subscriptions.

## Prerequisites

- Razorpay account (create at [razorpay.com](https://razorpay.com))
- Access to your backend `.env` file
- KYC verification (required for live mode)

## Step 1: Create Razorpay Account

1. Go to https://razorpay.com/
2. Click **Sign Up** (much easier than Stripe for India!)
3. Complete registration with:
   - Business email
   - Business name
   - Phone number
4. Verify email and phone

**Note**: Test mode is available immediately. For live payments, complete KYC (takes 1-2 business days).

## Step 2: Get Your API Keys

1. Log in to [Razorpay Dashboard](https://dashboard.razorpay.com)
2. Click **Settings** (⚙️) in left sidebar
3. Click **API Keys**
4. You'll see two keys:
   - **Key ID** (starts with `rzp_test_` or `rzp_live_`) - can be exposed in frontend
   - **Key Secret** (click "Generate Test Key" or "Generate Live Key") - keep confidential
5. Copy both values

## Step 3: Create Subscription Plans

Razorpay plans are created in the dashboard (not via API).

### Professional Plan (₹200/month)

1. Go to **Subscriptions** → **Plans** in left sidebar
2. Click **Create New Plan**
3. Fill in:
   - **Plan Name**: Professional Plan
   - **Plan ID**: Leave auto-generated or set `plan_professional` (copy this!)
   - **Description**: 50 interviews/month, 3 interviewers
   - **Billing Amount**: 20000 (in paise, = ₹200)
   - **Billing Interval**: Every 1 Month
   - **Currency**: INR
   - **Setup Fee**: 0 (leave blank)
   - **Total Count**: Leave blank (unlimited billing cycles)
4. Click **Create Plan**
5. **Copy the Plan ID** (starts with `plan_`)

### Enterprise Plan (₹500/month)

1. Click **Create New Plan** again
2. Fill in:
   - **Plan Name**: Enterprise Plan
   - **Plan ID**: Leave auto or set `plan_enterprise` (copy this!)
   - **Description**: Unlimited interviews, unlimited interviewers
   - **Billing Amount**: 50000 (in paise, = ₹500)
   - **Billing Interval**: Every 1 Month
   - **Currency**: INR
   - **Setup Fee**: 0
   - **Total Count**: Leave blank
3. Click **Create Plan**
4. **Copy the Plan ID**

## Step 4: Configure Webhook

1. Go to **Settings** → **Webhooks**
2. Click **Add New Webhook**
3. Fill in:
   - **Webhook URL**: 
     - Development: `http://localhost:8000/api/subscriptions/webhook`
     - Production: `https://yourdomain.com/api/subscriptions/webhook`
   - **Alert Email**: Your email
   - **Secret**: Will be auto-generated
   - **Active Events** (select these):
     ✓ subscription.activated
     ✓ subscription.charged
     ✓ subscription.cancelled
     ✓ subscription.paused
     ✓ subscription.resumed
     ✓ payment.failed
4. Click **Create Webhook**
5. **Copy the Webhook Secret** (starts with `whsec_`)

**For Local Development**: You'll need to expose localhost. Options:
- Use ngrok: `ngrok http 8000`
- Use Razorpay CLI (coming soon)
- Deploy to a test server

## Step 5: Update Backend Configuration

Open `backend/.env` and update:

```env
# Razorpay Configuration
RAZORPAY_KEY_ID=rzp_test_YOUR_ACTUAL_KEY_ID
RAZORPAY_KEY_SECRET=YOUR_ACTUAL_KEY_SECRET
RAZORPAY_WEBHOOK_SECRET=whsec_YOUR_ACTUAL_WEBHOOK_SECRET
RAZORPAY_PLAN_PROFESSIONAL=plan_YOUR_PROFESSIONAL_PLAN_ID
RAZORPAY_PLAN_ENTERPRISE=plan_YOUR_ENTERPRISE_PLAN_ID

# Frontend URL (important for redirects)
FRONTEND_URL=http://localhost:5173
```

## Step 6: Install Dependencies

```bash
cd backend
pip install razorpay==1.4.2
```

## Step 7: Run Database Migration

```bash
cd backend
alembic upgrade head
```

This will:
- Rename `stripe_*` columns to `razorpay_*`
- Add `razorpay_plan_id` column
- Update indexes

## Step 8: Test the Integration

### Using Razorpay Test Cards

For test mode, Razorpay provides test card numbers:

**Successful Payment**:
- Card Number: `4111 1111 1111 1111`
- CVV: Any 3 digits (e.g., `123`)
- Expiry: Any future date (e.g., `12/28`)
- Name: Any name
- OTP (if asked): `1234`

**Payment Failure**:
- Card Number: `4000 0000 0000 0002`
- CVV: Any 3 digits
- Expiry: Any future date
- OTP: `1234`

**Card Requires 3D Secure**:
- Card Number: `5104 0600 0000 0008`
- CVV: Any 3 digits
- Expiry: Any future date
- OTP: `1234` (success) or anything else (failure)

### Testing Workflow

1. **Start Backend**:
   ```bash
   cd backend
   uvicorn app.main:app --reload
   ```

2. **Start Frontend**:
   ```bash
   cd ..
   npm run dev
   ```

3. **Test Flow**:
   - Navigate to http://localhost:5173
   - Log in to your account
   - Go to Pricing page
   - Click "Upgrade to Professional"
   - You'll be redirected to Razorpay payment page
   - Enter test card: `4111 1111 1111 1111`
   - Complete payment with OTP: `1234`
   - You'll be redirected to success page
   - Check Dashboard - your plan should be upgraded!

4. **Verify in Dashboard**:
   - Check Razorpay Dashboard → **Subscriptions**
   - You should see a new active subscription
   - Check **Payments** to see the payment record

5. **Verify Webhook**:
   - Go to **Settings** → **Webhooks**
   - Click on your webhook
   - Check **Recent Deliveries**
   - You should see:
     - `subscription.activated` (status 200)
     - `subscription.charged` (status 200)

## Step 9: Production Deployment

When moving to production:

### 1. Complete KYC

1. Go to **Settings** → **Profile** → **Business**
2. Submit required documents:
   - PAN card
   - Business registration proof
   - Bank account details
   - ID proof of authorized signatory
3. Wait for approval (1-2 business days)

### 2. Switch to Live Mode

1. Toggle to **Live Mode** (top right in dashboard)
2. Generate **Live API Keys**:
   - Go to **Settings** → **API Keys**
   - Click **Generate Live Key**
   - Copy Key ID and Key Secret

### 3. Recreate Plans in Live Mode

**Important**: Plans from test mode don't carry over!

1. In Live Mode, go to **Subscriptions** → **Plans**
2. Create Professional and Enterprise plans again (same as Step 3)
3. Copy new live plan IDs

### 4. Update Webhook for Production

1. Go to **Settings** → **Webhooks** (in Live Mode)
2. Create new webhook with production URL:
   - URL: `https://yourdomain.com/api/subscriptions/webhook`
   - Same events as before
3. Copy new webhook secret

### 5. Update Production Environment

Update your production `.env` with live keys:

```env
# Razorpay Live Keys
RAZORPAY_KEY_ID=rzp_live_YOUR_LIVE_KEY_ID
RAZORPAY_KEY_SECRET=YOUR_LIVE_KEY_SECRET
RAZORPAY_WEBHOOK_SECRET=whsec_YOUR_LIVE_WEBHOOK_SECRET
RAZORPAY_PLAN_PROFESSIONAL=plan_YOUR_LIVE_PROFESSIONAL_ID
RAZORPAY_PLAN_ENTERPRISE=plan_YOUR_LIVE_ENTERPRISE_ID

FRONTEND_URL=https://yourdomain.com
```

### 6. Test with Real Payment

**Test carefully!**
- Use a real card
- Subscribe to Professional (₹200)
- Verify it works end-to-end
- **Immediately cancel the subscription** from Settings
- Verify cancellation works

## Troubleshooting

### "Invalid API key provided"
- Double-check your `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` in `.env`
- Make sure you're using the correct mode keys (test vs live)
- Restart your backend after updating `.env`

### "No such plan"
- Verify `RAZORPAY_PLAN_PROFESSIONAL` and `RAZORPAY_PLAN_ENTERPRISE` are correct
- Plans must exist in the same mode (test/live) as your API keys
- Check for typos in plan IDs

### Webhook not receiving events
- Verify webhook URL is publicly accessible
- Check webhook secret is correct
- For localhost:
  - Use ngrok: `ngrok http 8000`
  - Update webhook URL in Razorpay dashboard with ngrok URL
- Check Razorpay Dashboard → Webhooks → Recent Deliveries for errors

### "Invalid signature" on webhook
- Your `RAZORPAY_WEBHOOK_SECRET` is incorrect
- Make sure you're using the secret from the correct webhook endpoint
- Check for extra spaces or newlines in the secret

### Payment succeeds but subscription not activated
- Check backend logs for errors
- Verify webhook is being called
- Check Razorpay Dashboard → Webhooks → Recent Deliveries
- Make sure `subscription.activated` event is successfully delivered (status 200)

### Migration fails
- Make sure PostgreSQL is running
- Check database connection in `.env`
- If migration already ran partially, check which version you're on:
  ```bash
  alembic current
  ```
- If stuck, you can downgrade and try again:
  ```bash
  alembic downgrade 0005
  alembic upgrade head
  ```

## Features Comparison: Razorpay vs Stripe

| Feature | Razorpay | Stripe |
|---------|----------|--------|
| **India Support** | ✅ Native, no invitation | ⚠️ Invite-only |
| **Pricing** | ₹2 + 2% per transaction | 2.9% + ₹2 per transaction |
| **Setup Time** | < 1 hour | Days (invitation wait) |
| **KYC** | Required for live mode | Required for payouts |
| **Payment Methods** | Cards, UPI, Netbanking, Wallets | Primarily cards |
| **Dashboard** | Comprehensive, India-focused | Global, feature-rich |
| **Webhooks** | HMAC SHA256 | Stripe signature lib |
| **Plans** | Created in dashboard | Can create via API |
| **Customer Management** | Optional | Required |
| **INR Support** | Native | Yes, but USD-first |

## Security Best Practices

⚠️ **Never commit your `.env` file to git**
⚠️ **Keep your Key Secret confidential - it's like a password**
⚠️ **Use test keys for development, live keys only in production**
⚠️ **Rotate your keys if they're exposed**
⚠️ **Validate webhook signatures on every webhook request**

## Support Resources

- **Razorpay Documentation**: https://razorpay.com/docs/
- **Razorpay Dashboard**: https://dashboard.razorpay.com
- **Razorpay Support**: support@razorpay.com
- **API Reference**: https://razorpay.com/docs/api/
- **Subscriptions Guide**: https://razorpay.com/docs/payments/subscriptions/

## Quick Reference

### Test Mode
- Key ID: `rzp_test_*`
- Test card: `4111 1111 1111 1111`
- OTP: `1234`

### Live Mode
- Key ID: `rzp_live_*`
- Real cards only
- KYC required

### Plan Pricing
- Professional: ₹200/month (20000 paise)
- Enterprise: ₹500/month (50000 paise)

### Webhook Events
- `subscription.activated` - First payment success
- `subscription.charged` - Recurring payment success
- `subscription.cancelled` - User cancelled
- `payment.failed` - Payment failed

---

**Need Help?** Check InterviewLens issues on GitHub or contact support.
