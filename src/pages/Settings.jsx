import React, { useEffect, useState } from 'react'
import { CheckCircle, Loader, AlertTriangle, User, Lock, CreditCard, Crown, Calendar, FileText, X } from 'lucide-react'
import { authAPI, apiErrorMessage } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { getSubscriptionStatus, getUsageStats, getInvoices, cancelSubscription, initiateCheckout, getTierDisplayName, getTierColors, formatPrice } from '../services/checkout'
import { useSearchParams } from 'react-router-dom'

const card = 'bg-white rounded-2xl border border-gray-100 p-6'
const input = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

function Status({ state }) {
  if (!state) return null
  return state.ok ? (
    <span className="flex items-center gap-1.5 text-sm text-emerald-600"><CheckCircle size={14} /> {state.text}</span>
  ) : (
    <span className="flex items-center gap-1.5 text-sm text-red-600"><AlertTriangle size={14} /> {state.text}</span>
  )
}

export default function Settings() {
  const { user, login } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = searchParams.get('tab') || 'profile'
  
  const [profile, setProfile] = useState({ full_name: '', company: '' })
  const [profileState, setProfileState] = useState(null)
  const [savingProfile, setSavingProfile] = useState(false)

  const [pw, setPw] = useState({ current: '', next: '', confirm: '' })
  const [pwState, setPwState] = useState(null)
  const [savingPw, setSavingPw] = useState(false)

  // Billing state
  const [subscription, setSubscription] = useState(null)
  const [usage, setUsage] = useState(null)
  const [invoices, setInvoices] = useState([])
  const [billingLoading, setBillingLoading] = useState(true)
  const [cancelling, setCancelling] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [upgrading, setUpgrading] = useState(false)

  useEffect(() => {
    if (user) setProfile({ full_name: user.full_name || '', company: user.company || '' })
  }, [user])

  useEffect(() => {
    if (activeTab === 'billing') {
      loadBillingData()
    }
  }, [activeTab])

  const loadBillingData = async () => {
    setBillingLoading(true)
    try {
      const [subData, usageData, invoiceData] = await Promise.all([
        getSubscriptionStatus(),
        getUsageStats(),
        getInvoices()
      ])
      setSubscription(subData)
      setUsage(usageData)
      setInvoices(invoiceData)
    } catch (err) {
      console.error('Failed to load billing data:', err)
    } finally {
      setBillingLoading(false)
    }
  }

  const saveProfile = async (e) => {
    e.preventDefault()
    setSavingProfile(true)
    setProfileState(null)
    try {
      const { data } = await authAPI.updateMe({ full_name: profile.full_name, company: profile.company })
      login(localStorage.getItem('access_token'), data)
      setProfileState({ ok: true, text: 'Profile saved' })
    } catch (err) {
      setProfileState({ ok: false, text: apiErrorMessage(err, 'Could not save profile.') })
    } finally {
      setSavingProfile(false)
    }
  }

  const savePassword = async (e) => {
    e.preventDefault()
    if (pw.next !== pw.confirm) {
      setPwState({ ok: false, text: 'New passwords don’t match' })
      return
    }
    setSavingPw(true)
    setPwState(null)
    try {
      await authAPI.changePassword(pw.current, pw.next)
      setPw({ current: '', next: '', confirm: '' })
      setPwState({ ok: true, text: 'Password updated' })
    } catch (err) {
      setPwState({ ok: false, text: apiErrorMessage(err, 'Could not change password.') })
    } finally {
      setSavingPw(false)
    }
  }

  const oauthOnly = user?.oauth_provider && !user?.has_password

  const handleUpgrade = async (tier) => {
    setUpgrading(true)
    try {
      const checkoutUrl = await initiateCheckout(tier)
      window.location.href = checkoutUrl
    } catch (err) {
      alert('Failed to start checkout. Please try again.')
      setUpgrading(false)
    }
  }

  const handleCancelSubscription = async () => {
    setCancelling(true)
    try {
      await cancelSubscription()
      await loadBillingData()
      setShowCancelModal(false)
      alert('Your subscription has been cancelled. You can continue using your plan until the end of the billing period.')
    } catch (err) {
      alert('Failed to cancel subscription. Please try again.')
    } finally {
      setCancelling(false)
    }
  }

  const setTab = (tab) => {
    setSearchParams({ tab })
  }

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'security', label: 'Security', icon: Lock },
    { id: 'billing', label: 'Billing', icon: CreditCard },
  ]

  return (
    <div className="p-6 space-y-5 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 text-sm mt-0.5">Manage your account, security, and subscription</p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <form onSubmit={saveProfile} className={`${card} space-y-4`}>
          <div className="flex items-center gap-2">
            <User size={16} className="text-blue-600" />
            <h2 className="font-semibold text-gray-900">Profile</h2>
          </div>
          <p className="text-xs text-gray-500">Your name and company appear in the invitation emails candidates receive.</p>
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Full name</label>
              <input value={profile.full_name} onChange={(e) => setProfile({ ...profile, full_name: e.target.value })} required className={input} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Company</label>
              <input value={profile.company} onChange={(e) => setProfile({ ...profile, company: e.target.value })} placeholder="Acme Inc." className={input} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1">Email</label>
              <input value={user?.email || ''} disabled className={`${input} bg-gray-50 text-gray-500`} />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button type="submit" disabled={savingProfile} className="flex items-center gap-2 bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-semibold hover:bg-blue-700 disabled:opacity-60">
              {savingProfile && <Loader size={13} className="animate-spin" />} Save profile
            </button>
            <Status state={profileState} />
          </div>
        </form>
      )}

      {/* Security Tab */}
      {activeTab === 'security' && (
        <form onSubmit={savePassword} className={`${card} space-y-4`}>
          <div className="flex items-center gap-2">
            <Lock size={16} className="text-blue-600" />
            <h2 className="font-semibold text-gray-900">Password</h2>
          </div>
          {oauthOnly && <p className="text-xs text-gray-500">You sign in with {user.oauth_provider}. Set a password to also sign in with email.</p>}
          <div className="grid md:grid-cols-3 gap-3">
            {!oauthOnly && (
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Current password</label>
                <input type="password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} required className={input} />
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">New password</label>
              <input type="password" minLength={8} value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} required className={input} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Confirm new password</label>
              <input type="password" minLength={8} value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} required className={input} />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button type="submit" disabled={savingPw} className="flex items-center gap-2 bg-gray-900 text-white rounded-lg px-4 py-2 text-sm font-semibold hover:bg-gray-800 disabled:opacity-60">
              {savingPw && <Loader size={13} className="animate-spin" />} Update password
            </button>
            <Status state={pwState} />
          </div>
        </form>
      )}

      {/* Billing Tab */}
      {activeTab === 'billing' && (
        <div className="space-y-5">
          {billingLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader size={32} className="animate-spin text-blue-600" />
            </div>
          ) : (
            <>
              {/* Current Plan */}
              {subscription && (
                <div className={`${card} space-y-4`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CreditCard size={16} className="text-blue-600" />
                      <h2 className="font-semibold text-gray-900">Current Plan</h2>
                    </div>
                    {subscription.tier !== 'free' && subscription.status === 'active' && (
                      <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">Active</span>
                    )}
                  </div>

                  <div className={`${getTierColors(subscription.tier).bg} ${getTierColors(subscription.tier).border} border-2 rounded-xl p-5`}>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <Crown size={32} className={getTierColors(subscription.tier).text} />
                        <div>
                          <h3 className={`text-2xl font-bold ${getTierColors(subscription.tier).text}`}>
                            {getTierDisplayName(subscription.tier)}
                          </h3>
                          {subscription.tier !== 'free' && subscription.current_period_end && (
                            <p className="text-sm text-gray-600 mt-1">
                              Renews {new Date(subscription.current_period_end).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </p>
                          )}
                        </div>
                      </div>
                      {subscription.tier === 'free' && (
                        <button
                          onClick={() => handleUpgrade('professional')}
                          disabled={upgrading}
                          className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:from-blue-700 hover:to-indigo-700 disabled:opacity-60"
                        >
                          {upgrading ? <Loader size={14} className="animate-spin" /> : <Crown size={14} />}
                          Upgrade Now
                        </button>
                      )}
                      {subscription.tier === 'professional' && (
                        <button
                          onClick={() => handleUpgrade('enterprise')}
                          disabled={upgrading}
                          className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:from-purple-700 hover:to-pink-700 disabled:opacity-60"
                        >
                          {upgrading ? <Loader size={14} className="animate-spin" /> : <Crown size={14} />}
                          Upgrade to Enterprise
                        </button>
                      )}
                    </div>

                    {/* Usage Stats */}
                    {usage && (
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="bg-white/60 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-semibold text-gray-700">Interviews This Month</span>
                            <span className="text-xs text-gray-500">
                              {usage.interviews_limit === -1 ? 'Unlimited' : `${usage.interviews_used} / ${usage.interviews_limit}`}
                            </span>
                          </div>
                          {usage.interviews_limit > 0 && (
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                  usage.interviews_used >= usage.interviews_limit
                                    ? 'bg-red-500'
                                    : usage.interviews_used / usage.interviews_limit >= 0.8
                                    ? 'bg-orange-500'
                                    : 'bg-blue-600'
                                }`}
                                style={{ width: `${Math.min(100, (usage.interviews_used / usage.interviews_limit) * 100)}%` }}
                              />
                            </div>
                          )}
                        </div>
                        <div className="bg-white/60 rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold text-gray-700">Interviewers</span>
                            <span className="text-xs text-gray-500">
                              {usage.interviewers_limit === -1 ? 'Unlimited' : `Up to ${usage.interviewers_limit}`}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Cancel Subscription */}
                  {subscription.tier !== 'free' && subscription.status === 'active' && (
                    <button
                      onClick={() => setShowCancelModal(true)}
                      className="text-sm text-red-600 hover:text-red-700 font-semibold"
                    >
                      Cancel Subscription
                    </button>
                  )}
                </div>
              )}

              {/* Billing History */}
              <div className={`${card} space-y-4`}>
                <div className="flex items-center gap-2">
                  <FileText size={16} className="text-blue-600" />
                  <h2 className="font-semibold text-gray-900">Billing History</h2>
                </div>
                {invoices.length === 0 ? (
                  <p className="text-sm text-gray-500">No invoices yet.</p>
                ) : (
                  <div className="space-y-3">
                    {invoices.map((invoice) => (
                      <div key={invoice.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                        <div className="flex items-center gap-4">
                          <Calendar size={20} className="text-gray-400" />
                          <div>
                            <p className="text-sm font-semibold text-gray-900">
                              {new Date(invoice.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </p>
                            <p className="text-xs text-gray-500">Invoice #{invoice.razorpay_invoice_id?.slice(-8) || invoice.id}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-lg font-bold text-gray-900">{formatPrice(invoice.amount_paid)}</span>
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            invoice.status === 'paid'
                              ? 'bg-green-100 text-green-700'
                              : invoice.status === 'open'
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                          </span>
                          {invoice.invoice_pdf && (
                            <a
                              href={invoice.invoice_pdf}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-blue-600 hover:text-blue-700 font-semibold"
                            >
                              Download
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Cancel Subscription Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Cancel Subscription</h3>
              <button onClick={() => setShowCancelModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to cancel your subscription? You'll continue to have access until the end of your current billing period.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={handleCancelSubscription}
                disabled={cancelling}
                className="flex-1 flex items-center justify-center gap-2 bg-red-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-red-700 disabled:opacity-60"
              >
                {cancelling && <Loader size={14} className="animate-spin" />}
                Yes, Cancel
              </button>
              <button
                onClick={() => setShowCancelModal(false)}
                disabled={cancelling}
                className="flex-1 bg-gray-100 text-gray-700 px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-gray-200 disabled:opacity-60"
              >
                Keep Plan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
