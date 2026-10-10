# Stripe Subscription Setup Guide

This guide walks you through setting up Stripe payments for InterviewLens subscriptions.

## Prerequisites

- Stripe account (create at [stripe.com](https://stripe.com))
- Access to your backend `.env` file

## Step 1: Get Your Stripe API Keys

1. Log in to [Stripe Dashboard](https://dashboard.stripe.com)
2. Click **Developers** in the left sidebar
3. Click **API keys**
4. You'll see two keys:
   - **Publishable key** (starts with `pk_test_`) - safe to expose in frontend
   - **Secret key** (starts with `sk_test_`) - keep confidential, server-side only
5. Copy these values

## Step 2: Create Products and Prices

### Professional Plan (₹200/month)

1. Go to **Products** → **Add product**
2. Fill in:
   - **Name**: Professional Plan
   - **Description**: 50 interviews/month, up to 3 interviewers
   - **Pricing**: Recurring
   - **Price**: 200
   - **Currency**: INR (Indian Rupee)
   - **Billing period**: Monthly
3. Click **Save product**
4. Copy the **Price ID** (starts with `price_`)

### Enterprise Plan (₹500/month)

1. Go to **Products** → **Add product**
2. Fill in:
   - **Name**: Enterprise Plan
   - **Description**: Unlimited interviews, unlimited interviewers
   - **Pricing**: Recurring
   - **Price**: 500
   - **Currency**: INR (Indian Rupee)
   - **Billing period**: Monthly
3. Click **Save product**
4. Copy the **Price ID** (starts with `price_`)

## Step 3: Set Up Webhook Endpoint

1. Go to **Developers** → **Webhooks**
2. Click **Add endpoint**
3. Fill in:
   - **Endpoint URL**: `http://localhost:8000/api/subscriptions/webhook` (for development)
     - For production, use your actual domain: `https://yourdomain.com/api/subscriptions/webhook`
   - **Description**: InterviewLens subscription events
   - **Events to send**: Select these events:
     - `checkout.session.completed`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`
4. Click **Add endpoint**
5. Copy the **Signing secret** (starts with `whsec_`)

## Step 4: Update Backend Configuration

Open `backend/.env` and add/update these values:

```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_actual_secret_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_your_actual_publishable_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_actual_webhook_secret_here
STRIPE_PRICE_PROFESSIONAL=price_your_professional_price_id_here
STRIPE_PRICE_ENTERPRISE=price_your_enterprise_price_id_here

# Frontend URL (important for redirects)
FRONTEND_URL=http://localhost:5173
```

## Step 5: Test the Integration

### Using Stripe Test Cards

Stripe provides test card numbers for development:

- **Successful payment**: `4242 4242 4242 4242`
- **Payment declined**: `4000 0000 0000 0002`
- **Card requires authentication**: `4000 0025 0000 3155`

Use any:
- Future expiry date (e.g., 12/34)
- Any 3-digit CVC
- Any billing postal code

### Testing Workflow

1. Start your backend: `cd backend && uvicorn app.main:app --reload`
2. Start your frontend: `cd .. && npm run dev`
3. Log in to InterviewLens
4. Click **Upgrade** from Dashboard or Pricing page
5. You'll be redirected to Stripe Checkout
6. Use test card: `4242 4242 4242 4242`
7. Complete the payment
8. You'll be redirected back to success page
9. Check your Stripe Dashboard → **Payments** to see the test payment

### Verify Webhook Events

1. Go to **Developers** → **Webhooks** in Stripe Dashboard
2. Click on your webhook endpoint
3. Check the **Recent deliveries** section
4. You should see successful `checkout.session.completed` events

## Step 6: Testing Webhook Locally (Optional)

Stripe CLI allows you to test webhooks on localhost:

```bash
# Install Stripe CLI
# macOS: brew install stripe/stripe-cli/stripe
# Windows: scoop install stripe
# Linux: see https://stripe.com/docs/stripe-cli

# Login to your Stripe account
stripe login

# Forward webhook events to your local server
stripe listen --forward-to localhost:8000/api/subscriptions/webhook

# This will give you a webhook signing secret starting with whsec_
# Update your .env with this secret for local testing
```

## Production Deployment

When deploying to production:

1. **Switch to Live Mode** in Stripe Dashboard (toggle in top right)
2. Get your **Live API keys** (start with `pk_live_` and `sk_live_`)
3. Create the same Products/Prices in Live mode
4. Create a new webhook endpoint with your production URL
5. Update your production `.env` with live keys
6. Test with a real card (but immediately cancel/refund to avoid charges)

## Troubleshooting

### "Invalid API key provided"
- Double-check your `STRIPE_SECRET_KEY` in `.env`
- Make sure you're using the correct test/live key for your environment

### "No such price"
- Verify `STRIPE_PRICE_PROFESSIONAL` and `STRIPE_PRICE_ENTERPRISE` are correct
- Make sure the prices exist in the same mode (test/live) as your API keys

### Webhook not receiving events
- Check webhook signing secret is correct
- Verify webhook endpoint URL is accessible
- Use Stripe CLI for local testing: `stripe listen --forward-to localhost:8000/api/subscriptions/webhook`

### "Invalid signature"
- Your `STRIPE_WEBHOOK_SECRET` is incorrect
- Make sure you're using the signing secret from the correct webhook endpoint

## Security Notes

⚠️ **Never commit your `.env` file to git**
⚠️ **Keep your Secret Key confidential**
⚠️ **Use test keys for development**
⚠️ **Rotate your keys if they're exposed**

## Support

- Stripe Documentation: https://stripe.com/docs
- Stripe Dashboard: https://dashboard.stripe.com
- InterviewLens Issues: (your GitHub repo)
