import React from 'react'
import { Link } from 'react-router-dom'
import { Check, Zap, Building2, Crown, ArrowRight } from 'lucide-react'
import Logo from '../components/Logo'

function PricingNavbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-100 backdrop-blur-sm bg-white/95">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/">
          <Logo size="md" />
        </Link>
        <div className="flex items-center gap-3">
          <Link
            to="/candidate/login"
            className="text-sm font-semibold text-emerald-700 hover:text-emerald-900 border border-emerald-200 bg-emerald-50 px-4 py-2 rounded-lg hover:bg-emerald-100 transition-all duration-300 hover:scale-105 hover:shadow-md"
          >
            Candidate Login
          </Link>
          <Link
            to="/login"
            className="bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-blue-700 transition-all duration-300 hover:scale-105 hover:shadow-lg"
          >
            Interviewer Login
          </Link>
        </div>
      </div>
    </nav>
  )
}

function PricingCard({ tier, price, description, features, popular, icon: Icon, ctaText, ctaVariant, onCTAClick }) {
  return (
    <div className={`relative bg-white rounded-2xl border-2 p-8 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl ${
      popular ? 'border-blue-500 shadow-xl' : 'border-gray-200 hover:border-blue-200'
    }`}>
      {popular && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
          <span className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg">
            MOST POPULAR
          </span>
        </div>
      )}
      
      <div className="text-center mb-6">
        <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 ${
          tier === 'Free' ? 'bg-gray-100' : tier === 'Professional' ? 'bg-blue-100' : 'bg-purple-100'
        }`}>
          <Icon size={32} className={
            tier === 'Free' ? 'text-gray-600' : tier === 'Professional' ? 'text-blue-600' : 'text-purple-600'
          } />
        </div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">{tier}</h3>
        <p className="text-sm text-gray-500 mb-4">{description}</p>
        <div className="mb-6">
          {price === 0 ? (
            <div className="text-4xl font-extrabold text-gray-900">Free</div>
          ) : (
            <div>
              <span className="text-4xl font-extrabold text-gray-900">₹{price}</span>
              <span className="text-gray-500 text-lg">/month</span>
            </div>
          )}
        </div>
      </div>

      <button
        onClick={() => onCTAClick(tier.toLowerCase())}
        className={`w-full py-3 px-6 rounded-lg font-semibold transition-all duration-300 hover:scale-105 hover:shadow-lg flex items-center justify-center gap-2 ${
          ctaVariant === 'primary' 
            ? 'bg-blue-600 text-white hover:bg-blue-700' 
            : ctaVariant === 'secondary'
            ? 'bg-gray-900 text-white hover:bg-gray-800'
            : 'border-2 border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-gray-50'
        }`}
      >
        {ctaText}
        {ctaVariant !== 'outline' && <ArrowRight size={16} />}
      </button>

      <ul className="mt-8 space-y-4">
        {features.map((feature, index) => (
          <li key={index} className="flex items-start gap-3">
            <Check size={20} className={`flex-shrink-0 mt-0.5 ${
              tier === 'Free' ? 'text-gray-400' : tier === 'Professional' ? 'text-blue-600' : 'text-purple-600'
            }`} />
            <span className="text-sm text-gray-600">{feature}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function FAQ() {
  const faqs = [
    {
      question: "Can I upgrade or downgrade my plan at any time?",
      answer: "Yes! You can upgrade to a higher tier instantly. If you downgrade, the change will take effect at the end of your current billing period."
    },
    {
      question: "What happens when I reach my interview limit?",
      answer: "You'll receive a notification when you're approaching your limit. Once reached, you'll need to upgrade to continue creating interviews."
    },
    {
      question: "How does the free trial work?",
      answer: "All new accounts start with our Free tier, giving you 5 interviews per month to explore the platform. No credit card required."
    },
    {
      question: "Can I cancel my subscription?",
      answer: "Yes, you can cancel anytime from your settings. You'll continue to have access until the end of your billing period."
    },
    {
      question: "What payment methods do you accept?",
      answer: "We accept all major credit and debit cards through Razorpay, including Visa, Mastercard, American Express, UPI, net banking, and digital wallets."
    },
    {
      question: "Is my payment information secure?",
      answer: "Absolutely. We use Razorpay for payment processing, which is PCI-DSS compliant and trusted by millions of businesses across India for secure transactions."
    }
  ]

  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-4xl mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Frequently Asked Questions</h2>
          <p className="text-gray-600">Everything you need to know about our pricing and plans</p>
        </div>
        <div className="space-y-6">
          {faqs.map((faq, index) => (
            <div key={index} className="bg-white rounded-xl p-6 border border-gray-200 hover:border-blue-200 transition-colors">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{faq.question}</h3>
              <p className="text-gray-600 leading-relaxed">{faq.answer}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default function Pricing() {
  const handleCTAClick = async (tier) => {
    if (tier === 'free') {
      // Redirect to signup/login
      window.location.href = '/login'
    } else if (tier === 'professional' || tier === 'enterprise') {
      // Check if user is authenticated
      const token = localStorage.getItem('token')
      if (!token) {
        // Redirect to login with return URL
        window.location.href = `/login?redirect=/pricing&upgrade=${tier}`
        return
      }
      
      // Import checkout service dynamically
      try {
        const { initiateCheckout } = await import('../services/checkout')
        await initiateCheckout(tier)
      } catch (error) {
        console.error('Checkout error:', error)
        alert(error.message || 'Failed to start checkout. Please try again.')
      }
    }
  }

  const pricingTiers = [
    {
      tier: 'Free',
      price: 0,
      description: 'Perfect for trying out InterviewLens',
      icon: Zap,
      features: [
        '5 interviews per month',
        '1 interviewer account',
        'Basic proctoring (tab switching, camera)',
        '10 problems from problem bank',
        'Basic analytics dashboard',
        '7-day data retention',
        'Email support (48-hour response)'
      ],
      ctaText: 'Get Started',
      ctaVariant: 'outline',
      popular: false
    },
    {
      tier: 'Professional',
      price: 200,
      description: 'For growing teams conducting regular interviews',
      icon: Building2,
      features: [
        '50 interviews per month',
        '3 interviewer accounts',
        'All proctoring features (face detection, clipboard)',
        'Unlimited problem bank access',
        'Create custom problems',
        'Advanced plagiarism detection (AST-based)',
        'Detailed analytics & insights',
        '30-day data retention',
        'Code playback & session replay',
        'Priority email support (12-hour response)',
        'Export reports (PDF)'
      ],
      ctaText: 'Choose Professional',
      ctaVariant: 'primary',
      popular: true
    },
    {
      tier: 'Enterprise',
      price: 500,
      description: 'For large organizations with high-volume hiring',
      icon: Crown,
      features: [
        'Unlimited interviews',
        'Unlimited interviewer accounts',
        'All Professional features',
        'Custom branding (white-label)',
        'API access for integration',
        'SSO (Single Sign-On)',
        'Unlimited data retention',
        'Advanced behavioral analytics & AI insights',
        'Candidate pipeline management',
        'Team collaboration tools',
        'Webhook notifications',
        'Custom problem templates',
        '24/7 priority support',
        'Dedicated account manager'
      ],
      ctaText: 'Choose Enterprise',
      ctaVariant: 'secondary',
      popular: false
    }
  ]

  return (
    <div className="min-h-screen bg-white">
      <PricingNavbar />
      
      {/* Hero Section */}
      <section className="pt-32 pb-16 px-6 bg-gradient-to-b from-blue-50 to-white">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 text-sm font-semibold px-4 py-2 rounded-full mb-6">
            <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
            Simple, Transparent Pricing
          </div>
          <h1 className="text-5xl font-extrabold text-gray-900 mb-6 leading-tight">
            Choose the plan that fits<br />your hiring needs
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
            Start with our free tier and upgrade as you grow. All plans include our core features with no hidden fees.
          </p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-16 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8 mb-16">
            {pricingTiers.map((pricing, index) => (
              <PricingCard 
                key={index} 
                {...pricing}
                onCTAClick={handleCTAClick}
              />
            ))}
          </div>

          {/* Trust Section */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-8 text-white text-center">
            <div className="grid md:grid-cols-3 gap-8">
              <div>
                <p className="text-4xl font-extrabold mb-2">500+</p>
                <p className="text-blue-100">Companies Trust Us</p>
              </div>
              <div>
                <p className="text-4xl font-extrabold mb-2">10,000+</p>
                <p className="text-blue-100">Interviews Conducted</p>
              </div>
              <div>
                <p className="text-4xl font-extrabold mb-2">99.8%</p>
                <p className="text-blue-100">Customer Satisfaction</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <FAQ />

      {/* CTA Section */}
      <section className="py-20 px-6 bg-gray-900 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-extrabold mb-4">Ready to transform your hiring process?</h2>
          <p className="text-xl text-gray-300 mb-8">
            Join hundreds of companies using InterviewLens to make better hiring decisions.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link
              to="/login"
              className="bg-blue-600 text-white font-bold px-8 py-4 rounded-lg hover:bg-blue-700 transition-all duration-300 hover:scale-105 hover:shadow-xl"
            >
              Start Free Trial
            </Link>
            <a
              href="mailto:contact.interviewlens@gmail.com"
              className="border-2 border-white text-white font-bold px-8 py-4 rounded-lg hover:bg-white/10 transition-all duration-300 hover:scale-105"
            >
              Contact Sales
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-100 py-12 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <Logo size="md" />
          <p className="text-gray-500 text-sm mt-4">
            Elevating technical recruitment through precision monitoring and AI-driven insights.
          </p>
          <div className="mt-4">
            <a 
              href="mailto:contact.interviewlens@gmail.com" 
              className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
            >
              contact.interviewlens@gmail.com
            </a>
          </div>
          <div className="pt-8 mt-8 border-t border-gray-100">
            <p className="text-xs text-gray-400">© 2026 InterviewLens Inc. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
