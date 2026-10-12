import React, { useEffect, useState } from 'react'
import { CreditCard, Calendar, Zap, Building2, Star, RefreshCw } from 'lucide-react'
import { useSubscription } from '../contexts/SubscriptionContext'
import { subscriptionAPI } from '../services/subscriptionAPI'
import UpgradeModal from '../components/UpgradeModal'

const TIER_LABELS = {
  free: 'Free',
  premium: 'Premium',
  enterprise: 'Enterprise',
  expired: 'Expired',
}

const TIER_COLORS = {
  free: 'bg-gray-100 text-gray-600',
  premium: 'bg-blue-100 text-blue-700',
  enterprise: 'bg-indigo-100 text-indigo-700',
  expired: 'bg-red-100 text-red-600',
}

function formatDate(iso) {
  if (!iso) return 'No expiry'
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

function formatAmount(paise) {
  return `₹${(paise / 100).toFixed(0)}`
}

export default function Billing() {
  const { tier, used, limit, isUnlimited, isExpired, periodEnd, loading, refresh } = useSubscription()
  const [history, setHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(true)
  const [upgradeOpen, setUpgradeOpen] = useState(false)

  useEffect(() => {
    subscriptionAPI.getPaymentHistory()
      .then(setHistory)
      .catch(() => setHistory([]))
      .finally(() => setHistoryLoading(false))
  }, [])

  const usageText = isUnlimited
    ? 'Unlimited'
    : `${used} / ${limit} interviews used`

  const renewalText = periodEnd
    ? (isExpired ? `Expired on ${formatDate(periodEnd)}` : `Renews ${formatDate(periodEnd)}`)
    : 'No expiry date'

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Billing & Plan</h1>
        <p className="text-gray-500 text-sm mt-0.5">Manage your subscription and view payment history.</p>
      </div>

      {/* Current Plan Card */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-400 tracking-widest uppercase mb-2">Current Plan</p>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-extrabold text-gray-900">{TIER_LABELS[tier] ?? tier}</h2>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${TIER_COLORS[tier] ?? 'bg-gray-100 text-gray-600'}`}>
                {isExpired ? 'Expired' : 'Active'}
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-2">{usageText}</p>
          </div>
          {!isUnlimited && !loading && (
            <div className="text-right">
              <p className="text-xs text-gray-400 flex items-center gap-1 justify-end">
                <Calendar size={12} /> {renewalText}
              </p>
            </div>
          )}
        </div>

        {/* Usage bar */}
        {!isUnlimited && !isExpired && (
          <div className="mt-4">
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  used / limit >= 1 ? 'bg-red-500' :
                  used / limit >= 0.8 ? 'bg-amber-400' : 'bg-blue-500'
                }`}
                style={{ width: `${Math.min((used / Math.max(limit, 1)) * 100, 100)}%` }}
              />
            </div>
            <p className="text-xs text-gray-400 mt-1 text-right">{used} of {limit} interviews used</p>
          </div>
        )}
      </div>

      {/* Upgrade / Renew */}
      {tier !== 'enterprise' && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <p className="text-xs font-semibold text-gray-400 tracking-widest uppercase mb-4">
            {isExpired ? 'Reactivate Your Plan' : 'Upgrade Plan'}
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            {tier !== 'premium' && (
              <div className="border border-blue-200 rounded-xl p-4 flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <Zap size={18} className="text-blue-600" />
                  <span className="font-semibold text-gray-900">Premium</span>
                </div>
                <p className="text-sm text-gray-500">50 interviews/month · ₹200/month</p>
                <button
                  onClick={() => setUpgradeOpen(true)}
                  className="mt-auto py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
                >
                  {isExpired && tier === 'premium' ? 'Renew Premium' : 'Upgrade to Premium'}
                </button>
              </div>
            )}
            <div className="border border-indigo-200 rounded-xl p-4 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <Building2 size={18} className="text-indigo-600" />
                <span className="font-semibold text-gray-900">Enterprise</span>
              </div>
              <p className="text-sm text-gray-500">Unlimited interviews · ₹500/month</p>
              <button
                onClick={() => setUpgradeOpen(true)}
                className="mt-auto py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors"
              >
                {isExpired && tier === 'enterprise' ? 'Renew Enterprise' : 'Upgrade to Enterprise'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment History */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <p className="text-xs font-semibold text-gray-400 tracking-widest uppercase mb-4">
          Payment History
        </p>
        {historyLoading ? (
          <p className="text-sm text-gray-400">Loading…</p>
        ) : history.length === 0 ? (
          <div className="text-center py-8">
            <CreditCard size={32} className="text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-400">No payments yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-400 border-b border-gray-100">
                  <th className="text-left pb-3 font-medium">Date</th>
                  <th className="text-left pb-3 font-medium">Plan</th>
                  <th className="text-left pb-3 font-medium">Amount</th>
                  <th className="text-left pb-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {history.map((rec) => (
                  <tr key={rec.order_id}>
                    <td className="py-3 text-gray-600">{formatDate(rec.created_at)}</td>
                    <td className="py-3 text-gray-800 font-medium capitalize">{rec.tier_purchased}</td>
                    <td className="py-3 text-gray-800">{formatAmount(rec.amount_paise)}</td>
                    <td className="py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        rec.fulfillment_status === 'fulfilled'
                          ? 'bg-emerald-100 text-emerald-700'
                          : rec.payment_status === 'failed'
                          ? 'bg-red-100 text-red-600'
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {rec.fulfillment_status === 'fulfilled' ? 'Paid' :
                         rec.payment_status === 'failed' ? 'Failed' : 'Pending'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-xs text-gray-400 text-center">
        All payments are one-time. Access is granted for 30 days from payment date. No automatic renewals.
        Questions? <a href="mailto:contact.interviewlens@gmail.com" className="text-blue-500 hover:underline">contact.interviewlens@gmail.com</a>
      </p>

      <UpgradeModal open={upgradeOpen} onClose={() => { setUpgradeOpen(false); refresh() }} />
    </div>
  )
}
