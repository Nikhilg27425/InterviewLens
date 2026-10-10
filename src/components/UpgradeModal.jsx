import React, { useState } from 'react'
import { X, Crown, Check, Zap, Loader } from 'lucide-react'
import { initiateCheckout, formatPrice } from '../services/checkout'

/**
 * UpgradeModal - Reusable modal for prompting subscription upgrades
 * 
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether modal is visible
 * @param {Function} props.onClose - Callback to close modal
 * @param {string} props.currentTier - Current subscription tier ('free' or 'professional')
 * @param {string} props.reason - Why user is seeing this modal (optional)
 * @param {string} props.feature - Specific feature being limited (optional)
 */
export default function UpgradeModal({ 
  isOpen, 
  onClose, 
  currentTier = 'free',
  reason = null,
  feature = null 
}) {
  const [upgrading, setUpgrading] = useState(false)
  const [selectedTier, setSelectedTier] = useState(null)

  if (!isOpen) return null

  const handleUpgrade = async (tier) => {
    setUpgrading(true)
    setSelectedTier(tier)
    try {
      const checkoutUrl = await initiateCheckout(tier)
      window.location.href = checkoutUrl
    } catch (err) {
      console.error('Upgrade error:', err)
      alert('Failed to start checkout. Please try again.')
      setUpgrading(false)
      setSelectedTier(null)
    }
  }

  const plans = {
    professional: {
      name: 'Professional',
      price: 200,
      period: 'month',
      icon: Zap,
      gradient: 'from-blue-600 to-indigo-600',
      features: [
        '50 interviews per month',
        'Up to 3 interviewers',
        'Advanced analytics',
        'Email support',
        'Custom problem bank',
        'Priority processing'
      ]
    },
    enterprise: {
      name: 'Enterprise',
      price: 500,
      period: 'month',
      icon: Crown,
      gradient: 'from-purple-600 to-pink-600',
      features: [
        'Unlimited interviews',
        'Unlimited interviewers',
        'Advanced analytics',
        'Priority support',
        'Custom problem bank',
        'API access',
        'Custom branding',
        'Dedicated account manager'
      ]
    }
  }

  const showProfessional = currentTier === 'free'
  const showEnterprise = true // Always show Enterprise

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto animate-slideUp">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 p-6 flex items-center justify-between z-10">
          <div>
            <h2 className="text-2xl font-extrabold text-gray-900">Upgrade Your Plan</h2>
            {reason && (
              <p className="text-sm text-gray-600 mt-1">{reason}</p>
            )}
            {feature && !reason && (
              <p className="text-sm text-gray-600 mt-1">
                Unlock <span className="font-semibold">{feature}</span> with a premium plan
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            disabled={upgrading}
            className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors disabled:opacity-50"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Plans */}
        <div className="p-6 space-y-4">
          <div className={`grid ${showProfessional ? 'md:grid-cols-2' : 'md:grid-cols-1'} gap-6`}>
            {/* Professional Plan */}
            {showProfessional && (
              <div className="border-2 border-blue-200 rounded-2xl p-6 bg-gradient-to-br from-blue-50 to-indigo-50 hover:shadow-xl transition-all duration-300 hover:scale-105">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
                    <Zap size={24} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{plans.professional.name}</h3>
                    <p className="text-sm text-gray-600">Perfect for growing teams</p>
                  </div>
                </div>

                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-extrabold text-gray-900">
                      {formatPrice(plans.professional.price)}
                    </span>
                    <span className="text-gray-600 font-medium">/{plans.professional.period}</span>
                  </div>
                </div>

                <ul className="space-y-3 mb-6">
                  {plans.professional.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <Check size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleUpgrade('professional')}
                  disabled={upgrading}
                  className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all duration-300 ${
                    upgrading && selectedTier === 'professional'
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 hover:shadow-lg hover:scale-105'
                  }`}
                >
                  {upgrading && selectedTier === 'professional' ? (
                    <>
                      <Loader size={18} className="animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Zap size={18} />
                      Upgrade to Professional
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Enterprise Plan */}
            {showEnterprise && (
              <div className="border-2 border-purple-200 rounded-2xl p-6 bg-gradient-to-br from-purple-50 to-pink-50 hover:shadow-xl transition-all duration-300 hover:scale-105 relative overflow-hidden">
                {/* Popular Badge */}
                <div className="absolute top-4 right-4">
                  <span className="px-3 py-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-bold rounded-full">
                    POPULAR
                  </span>
                </div>

                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center">
                    <Crown size={24} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{plans.enterprise.name}</h3>
                    <p className="text-sm text-gray-600">For serious hiring teams</p>
                  </div>
                </div>

                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-extrabold text-gray-900">
                      {formatPrice(plans.enterprise.price)}
                    </span>
                    <span className="text-gray-600 font-medium">/{plans.enterprise.period}</span>
                  </div>
                </div>

                <ul className="space-y-3 mb-6">
                  {plans.enterprise.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <Check size={16} className="text-purple-600 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleUpgrade('enterprise')}
                  disabled={upgrading}
                  className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all duration-300 ${
                    upgrading && selectedTier === 'enterprise'
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700 hover:shadow-lg hover:scale-105'
                  }`}
                >
                  {upgrading && selectedTier === 'enterprise' ? (
                    <>
                      <Loader size={18} className="animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Crown size={18} />
                      Upgrade to Enterprise
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Trust Indicators */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="grid md:grid-cols-3 gap-4 text-center text-sm text-gray-600">
              <div>
                <div className="font-semibold text-gray-900 mb-1">🔒 Secure Payment</div>
                <div>Powered by Stripe</div>
              </div>
              <div>
                <div className="font-semibold text-gray-900 mb-1">💳 Cancel Anytime</div>
                <div>No long-term commitment</div>
              </div>
              <div>
                <div className="font-semibold text-gray-900 mb-1">⚡ Instant Access</div>
                <div>Upgrade takes effect immediately</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
