# Render Deployment Guide - Razorpay Migration

## Issue
The deployment is failing because Razorpay environment variables are missing from the Render configuration.

## Fix Steps

### 1. Add Razorpay Environment Variables in Render Dashboard

1. Go to your Render dashboard: https://dashboard.render.com/
2. Select your `interviewlens` web service
3. Click **Environment** in the left sidebar
4. Add the following environment variables:

| Key | Value | Note |
|-----|-------|------|
| `RAZORPAY_KEY_ID` | `rzp_test_TmCPwGmV39w3q9` | Your test key (from backend/.env) |
| `RAZORPAY_KEY_SECRET` | Your secret key | Get from Razorpay dashboard |
| `RAZORPAY_WEBHOOK_SECRET` | Your webhook secret | Get from Razorpay webhook settings |
| `RAZORPAY_PLAN_PROFESSIONAL` | `plan_TmGUZKq73AMYQw` | From backend/.env |
| `RAZORPAY_PLAN_ENTERPRISE` | `plan_TmGVkabgvGpV3E` | From backend/.env |

**Important**: Replace test keys with **live keys** when you're ready for production!

### 2. Verify Database Migration

The deployment script automatically runs migrations, but you can verify:

1. In Render dashboard, go to your service's **Logs** tab
2. Look for the line: `✓ Database schema is up to date.`
3. You should also see: `INFO:alembic.runtime.migration:Running upgrade 0005 -> 0006, switch_to_razorpay`

### 3. Manual Deployment Trigger (if needed)

If auto-deploy didn't trigger:
1. Go to your service in Render dashboard
2. Click **Manual Deploy** → **Deploy latest commit**
3. Select the `main` branch

### 4. Test the Deployment

Once deployed successfully:

1. Visit your production URL (e.g., https://interviewlens.onrender.com)
2. Login to an interviewer account
3. Go to Settings → Billing tab
4. Click "Upgrade to Professional"
5. You should be redirected to Razorpay's payment page

## Troubleshooting

### Error: "RAZORPAY_KEY_ID is not set"
- Add the missing environment variable in Render dashboard
- Restart the service

### Error: "ModuleNotFoundError: No module named 'razorpay'"
- This shouldn't happen as `razorpay==1.4.2` is in requirements.txt
- If it does, check the build logs to ensure `pip install` succeeded

### Database Migration Failed
- Check logs for the specific Alembic error
- May need to manually run: `alembic upgrade head` via Render shell
- Connect to shell: Render dashboard → Service → Shell

### Frontend Still Shows Stripe References
- Clear browser cache
- Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
- Check that the build stage completed successfully in logs

## Production Checklist

Before going live with real customers:

- [ ] Replace Razorpay test keys with live keys
- [ ] Set up Razorpay webhook in production
- [ ] Update webhook URL in Razorpay dashboard to your production URL + `/api/subscriptions/webhook`
- [ ] Create production Razorpay plans (Professional ₹200, Enterprise ₹500)
- [ ] Update `RAZORPAY_PLAN_PROFESSIONAL` and `RAZORPAY_PLAN_ENTERPRISE` with live plan IDs
- [ ] Test a real payment flow end-to-end
- [ ] Verify webhook delivers events correctly
- [ ] Check subscription activates after payment
- [ ] Upgrade Render database from free to Basic-256MB (free expires after 30 days)
- [ ] Upgrade Render service from free to Starter (free instances sleep after 15 min)

## Razorpay Dashboard Setup

### Create Production Plans

1. Login to Razorpay Dashboard: https://dashboard.razorpay.com/
2. Go to **Subscriptions** → **Plans**
3. Create two plans:
   - **Professional**: ₹200/month, 50 interviews
   - **Enterprise**: ₹500/month, unlimited interviews
4. Copy the plan IDs (format: `plan_xxxxxxxxxxxxx`)
5. Update environment variables in Render

### Set Up Webhook

1. In Razorpay Dashboard, go to **Settings** → **Webhooks**
2. Click **Add Webhook**
3. URL: `https://your-app.onrender.com/api/subscriptions/webhook`
4. Active Events:
   - `subscription.activated`
   - `subscription.charged`
   - `subscription.cancelled`
   - `subscription.paused`
   - `subscription.resumed`
   - `payment.failed`
5. Copy the **Webhook Secret**
6. Add it to Render as `RAZORPAY_WEBHOOK_SECRET`

## Monitoring

After deployment:
- Monitor the Render logs for errors
- Check Razorpay dashboard for payment events
- Verify webhook deliveries in Razorpay dashboard
- Test subscription upgrades with test cards before going live

## Support

If you encounter issues:
1. Check Render logs for error details
2. Verify all environment variables are set correctly
3. Ensure database migration completed successfully
4. Test locally first with the same configuration
