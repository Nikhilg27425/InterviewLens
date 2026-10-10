import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { CheckCircle, ArrowRight, Loader } from 'lucide-react'
import { getSubscriptionStatus } from '../services/checkout'

export default function CheckoutSuccess() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const sessionId = searchParams.get('session_id')
  const [loading, setLoading] = useState(true)
  const [subscription, setSubscription] = useState(null)

  useEffect(() => {
    // Give Razorpay webhook a moment to process
    const timer = setTimeout(async () => {
      try {
        const subData = await getSubscriptionStatus()
        setSubscription(subData)
      } catch (err) {
        console.error('Failed to load subscription:', err)
      } finally {
        setLoading(false)
      }
    }, 2000)

    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-6">
      <div className="max-w-2xl w-full">
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 md:p-12 text-center">
          {loading ? (
            <>
              <Loader size={64} className="mx-auto text-blue-600 animate-spin mb-6" />
              <h1 className="text-2xl font-bold text-gray-900 mb-3">Processing Your Subscription...</h1>
              <p className="text-gray-600">Please wait while we confirm your payment.</p>
            </>
          ) : (
            <>
              <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
                <CheckCircle size={48} className="text-white" />
              </div>
              <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4">
                Payment Successful! 🎉
              </h1>
              <p className="text-lg text-gray-600 mb-8">
                Welcome to {subscription?.tier === 'enterprise' ? 'Enterprise' : 'Professional'}! Your subscription is now active.
              </p>

              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 mb-8 border border-blue-100">
                <h2 className="font-semibold text-gray-900 mb-3">What's Next?</h2>
                <ul className="text-left space-y-2 text-sm text-gray-700">
                  <li className="flex items-start gap-2">
                    <CheckCircle size={16} className="text-green-600 flex-shrink-0 mt-0.5" />
                    <span>Your increased limits are now active</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle size={16} className="text-green-600 flex-shrink-0 mt-0.5" />
                    <span>You can create {subscription?.tier === 'enterprise' ? 'unlimited' : '50'} interviews this month</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle size={16} className="text-green-600 flex-shrink-0 mt-0.5" />
                    <span>Manage your subscription anytime from Settings</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle size={16} className="text-green-600 flex-shrink-0 mt-0.5" />
                    <span>Your receipt has been emailed to you</span>
                  </li>
                </ul>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={() => navigate('/dashboard')}
                  className="flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 hover:shadow-lg hover:scale-105"
                >
                  Go to Dashboard
                  <ArrowRight size={18} />
                </button>
                <button
                  onClick={() => navigate('/settings?tab=billing')}
                  className="px-6 py-3 rounded-lg font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
                >
                  View Billing
                </button>
              </div>

              {sessionId && (
                <p className="text-xs text-gray-400 mt-6">
                  Session ID: {sessionId.slice(0, 20)}...
                </p>
              )}
            </>
          )}
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          Need help? Contact us at support@interviewlens.com
        </p>
      </div>
    </div>
  )
}
