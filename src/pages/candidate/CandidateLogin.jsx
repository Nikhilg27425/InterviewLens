import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mail, Lock, Eye, EyeOff, Info, ArrowRight, CheckCircle } from 'lucide-react'
import Logo from '../../components/Logo'
import { authAPI, sessionsAPI } from '../../services/api'

const perks = [
  {
    icon: '🕐',
    title: 'Time-boxed assessments',
    desc: 'Each problem has a clear timer so you always know how long you have.',
  },
  {
    icon: '💡',
    title: 'Familiar environment',
    desc: 'Code in JavaScript, Python, TypeScript, Java, or C++ — your choice.',
  },
  {
    icon: '🔒',
    title: 'Secure & private',
    desc: 'Your session is encrypted end-to-end. Results go only to the hiring team.',
  },
]

export default function CandidateLogin() {
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [form, setForm] = useState({ email: '', token: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.email || !form.token) {
      setError('Please enter both your email and the access token from your invite.')
      return
    }
    setError('')
    setLoading(true)
    authAPI.loginCandidate(form.email, form.token)
      .then(({ data }) => {
        localStorage.setItem('access_token', data.access_token)
        localStorage.setItem('user_id', data.user_id)
        localStorage.setItem('user', JSON.stringify({ id: data.user_id, name: data.full_name, role: data.role }))
        return sessionsAPI.getByToken(form.token)
      })
      .then(({ data: sess }) => {
        localStorage.setItem('session_id', sess.id)
        setLoading(false)
        navigate('/candidate/waiting-room')
      })
      .catch(() => {
        setLoading(false)
        navigate('/candidate/waiting-room') // demo fallback
      })
  }

  return (
    <div className="min-h-screen flex">
      {/* ── Left hero panel ─────────────────────────────── */}
      <div
        className="hidden lg:flex lg:w-[52%] relative flex-col justify-between p-10 overflow-hidden"
        style={{
          background:
            'linear-gradient(140deg, #0f172a 0%, #1e3a5f 35%, #0e4d6e 65%, #065f46 100%)',
        }}
      >
        {/* Blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-24 -left-24 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-16 right-10 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl" />
          <div className="absolute top-1/2 right-1/3 w-56 h-56 bg-teal-400/10 rounded-full blur-2xl" />
        </div>

        {/* Logo */}
        <div className="relative z-10">
          <Logo size="md" white />
        </div>

        {/* Hero copy */}
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/15 rounded-full px-3 py-1.5 mb-6">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
            <span className="text-emerald-300 text-xs font-semibold">Candidate Portal</span>
          </div>
          <h2 className="text-4xl font-extrabold text-white leading-tight mb-4">
            Your interview,<br />your stage.
          </h2>
          <p className="text-cyan-100/80 text-base leading-relaxed mb-10 max-w-sm">
            Sign in with your invite token to access your technical assessment. The environment is fair, timed, and built for engineers.
          </p>

          {/* Perk cards */}
          <div className="space-y-3">
            {perks.map(({ icon, title, desc }) => (
              <div
                key={title}
                className="flex items-start gap-4 bg-white/8 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/10"
              >
                <div className="w-9 h-9 bg-white/10 rounded-lg flex items-center justify-center text-lg flex-shrink-0">
                  {icon}
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">{title}</p>
                  <p className="text-cyan-200/70 text-xs mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 flex items-center gap-5 text-cyan-300/60 text-xs">
          <span>© 2024 InterviewLens Inc.</span>
          <a href="#" className="hover:text-white transition-colors">Privacy</a>
          <a href="#" className="hover:text-white transition-colors">Terms</a>
          <a href="#" className="hover:text-white transition-colors">Support</a>
        </div>
      </div>

      {/* ── Right form panel ─────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center bg-gray-50 px-6 py-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden mb-8 flex justify-center">
            <Logo size="lg" />
          </div>

          {/* Candidate badge */}
          <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-5">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
            Candidate Access
          </div>

          <h1 className="text-3xl font-bold text-gray-900 mb-1">Sign In</h1>
          <p className="text-gray-500 text-sm mb-8">
            Enter the email you applied with and the access token from your interview invite.
          </p>

          {error && (
            <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-xl p-3.5 mb-5">
              <Info size={15} className="text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Your Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white placeholder-gray-400"
                />
              </div>
            </div>

            {/* Access token */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-gray-700">
                  Interview Access Token
                </label>
                <a href="#" className="text-xs text-emerald-600 font-medium hover:underline">
                  Lost your token?
                </a>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="ABCD-1234-EFGH-5678"
                  value={form.token}
                  onChange={(e) => setForm({ ...form, token: e.target.value })}
                  className="w-full pl-10 pr-11 py-3 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white placeholder-gray-400"
                />
                <button
                  type="button"
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-1.5">
                Your token was emailed to you by the hiring team. Format: XXXX-XXXX-XXXX-XXXX
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 text-white font-semibold py-3.5 rounded-xl hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 text-sm mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Verifying...
                </>
              ) : (
                <>
                  Enter My Assessment <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* What to expect */}
          <div className="mt-7 bg-gray-100 rounded-2xl p-4 space-y-2">
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">What happens next</p>
            {[
              'System check — camera, mic & browser compatibility',
              'Read your assessment brief and rules',
              'Timer starts only when you click "Begin Interview"',
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                  {i + 1}
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">{step}</p>
              </div>
            ))}
          </div>

          {/* Compliance */}
          <div className="mt-5 flex items-start gap-3 bg-amber-50 border border-amber-100 rounded-xl p-3.5">
            <Info size={14} className="text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-gray-500 leading-relaxed">
              This session will be monitored for integrity. Your screen activity and code submissions are logged. By continuing you agree to the candidate assessment terms.
            </p>
          </div>

          {/* Interviewer link */}
          <p className="text-center text-xs text-gray-400 mt-6">
            Are you an interviewer?{' '}
            <a href="/login" className="text-blue-600 font-semibold hover:underline">
              Sign in to the Interviewer Portal
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
