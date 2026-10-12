import React, { useState } from 'react'
import { X, Check, Zap, Building2, Star } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useSubscription } from '../contexts/SubscriptionContext'
import { subscriptionAPI } from '../services/subscriptionAPI'

const PLANS = [
  {
    key: 'free',
    name: 'Free',
    price: '₹0',
    period: 'forever',
    limit: '5 interviews/month',
    features: ['5 interviews per month', 'Live code monitoring', 'Basic proctoring'],
    color: 'gray',
    icon: Star,
  },
  {
    key: 'premium',
    name: 'Premium',
    price: '₹200',
    period: '/month',
    limit: '50 interviews/month',
    features: ['50 interviews per month', 'Plagiarism detection', 'Analytics dashboard', 'Priority support'],
    color: 'blue',
    icon: Zap,
    popular: true,
  },
  {
    key: 'enterprise',
    name: 'Enterprise',
    price: '₹500',
    period: '/month',
    limit: 'Unlimited interviews',
    features: ['Unlimited interviews', 'Advanced AI insights', 'All Premium features', 'Dedicated support'],
    color: 'indigo',
    icon: Building2,
  },
]

function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) { resolve(true); return }
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

export default function UpgradeModal({ open, onClose }) {
  const { user } = useAuth()
  const { tier: currentTier, used, limit, refresh } = useSubscription()
  const [loadingTier, setLoadingTier] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  if (!open) return null

  const handlePlanClick = async (planKey) => {
    if (planKey === 'free') return
    setError('')
    setSuccess('')
    setLoadingTier(planKey)

    try {
      // Step 1: Create order (server-side)
      const order = await subscriptionAPI.createOrder(planKey)

      // Step 2: Load Razorpay checkout script
      const loaded = await loadRazorpayScript()
      if (!loaded) {
        setError('Could not load payment gateway. Please try again.')
        setLoadingTier(null)
        return
      }

      // Step 3: Open Razorpay checkout
      const rzp = new window.Razorpay({
        key: order.key_id,
        order_id: order.order_id,
        amount: order.amount,
        currency: order.currency,
        name: 'InterviewLens',
        description: `${planKey.charAt(0).toUpperCase() + planKey.slice(1)} Plan`,
        prefill: {
          email: user?.email || '',
          name: user?.full_name || '',
        },
        theme: { color: '#2563EB' },
        handler: async (response) => {
          // Step 4: Verify payment on backend BEFORE showing success
          try {
            await subscriptionAPI.verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            })
            await refresh()
            setSuccess(`${planKey.charAt(0).toUpperCase() + planKey.slice(1)} plan activated! Your interviews have been reset.`)
            setLoadingTier(null)
            setTimeout(() => { setSuccess(''); onClose() }, 2500)
          } catch {
            setError('Payment verified by Razorpay but activation failed. Please contact support with your payment ID: ' + response.razorpay_payment_id)
            setLoadingTier(null)
          }
        },
        modal: {
          ondismiss: () => setLoadingTier(null),
        },
      })

      rzp.on('payment.failed', (resp) => {
        setError(`Payment failed: ${resp.error?.description || 'Unknown error'}`)
        setLoadingTier(null)
      })

      rzp.open()
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to create payment order. Please try again.')
      setLoadingTier(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Choose your plan</h2>
            <p className="text-sm text-gray-500 mt-0.5">Upgrade to create more interviews this month</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        {/* Alerts */}
        <div className="px-6">
          {error && (
            <div className="mt-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}
          {success && (
            <div className="mt-4 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700 font-medium">
              ✓ {success}
            </div>
          )}
        </div>

        {/* Plan cards */}
        <div className="p-6 grid sm:grid-cols-3 gap-4">
          {PLANS.map((plan) => {
            const isCurrent = plan.key === currentTier
            const isExhausted = isCurrent && used >= limit && limit !== -1
            const isLoading = loadingTier === plan.key

            let ctaLabel = plan.key === 'free' ? 'Current' : `Upgrade to ${plan.name}`
            if (isCurrent && plan.key !== 'free') {
              ctaLabel = isExhausted ? `Renew ${plan.name}` : 'Current Plan'
            }

            const canClick = plan.key !== 'free' && (!isCurrent || isExhausted)

            return (
              <div
                key={plan.key}
                className={`relative flex flex-col rounded-xl border p-5 transition-all duration-200 ${
                  isCurrent && !isExhausted
                    ? 'border-blue-400 bg-blue-50 ring-1 ring-blue-400'
                    : plan.popular
                    ? 'border-blue-200 hover:border-blue-400 hover:shadow-md'
                    : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                }`}
              >
                {plan.popular && !isCurrent && (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs font-semibold px-3 py-0.5 rounded-full">
                    Most Popular
                  </span>
                )}
                {isCurrent && !isExhausted && (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-xs font-semibold px-3 py-0.5 rounded-full">
                    Current Plan
                  </span>
                )}

                <div className="mb-3">
                  <p className="font-bold text-gray-900 text-lg">{plan.name}</p>
                  <p className="text-2xl font-extrabold text-gray-900 mt-1">
                    {plan.price}
                    <span className="text-sm font-normal text-gray-400">{plan.period}</span>
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{plan.limit}</p>
                </div>

                <ul className="space-y-1.5 mb-5 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-xs text-gray-600">
                      <Check size={13} className="text-emerald-500 mt-0.5 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => canClick && handlePlanClick(plan.key)}
                  disabled={!canClick || isLoading}
                  className={`w-full py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                    !canClick
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : isLoading
                      ? 'bg-blue-400 text-white cursor-wait'
                      : 'bg-blue-600 text-white hover:bg-blue-700 hover:scale-[1.02]'
                  }`}
                >
                  {isLoading ? 'Processing…' : ctaLabel}
                </button>
              </div>
            )
          })}
        </div>

        <p className="text-center text-xs text-gray-400 pb-5">
          One-time payment · 30 days from payment date · No auto-renewal
        </p>
      </div>
    </div>
  )
}
