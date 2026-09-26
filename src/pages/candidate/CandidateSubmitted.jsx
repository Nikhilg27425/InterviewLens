import React, { useEffect, useMemo, useState } from 'react'
import { CheckCircle, Clock, Shield, BarChart3, ArrowRight } from 'lucide-react'
import Logo from '../../components/Logo'
import { candidateSession } from '../../services/api'

const DIFF_COLORS = {
  Easy: 'bg-emerald-100 text-emerald-700',
  Medium: 'bg-amber-100 text-amber-700',
  Hard: 'bg-red-100 text-red-600',
}

const fmtDuration = (s) => `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s`

function readSummary() {
  try { return JSON.parse(sessionStorage.getItem('submission_summary')) } catch { return null }
}

export default function CandidateSubmitted() {
  const [progress, setProgress] = useState(0)
  const summary = useMemo(readSummary, [])

  // The assessment is over — drop this tab's candidate credentials
  useEffect(() => { candidateSession.clear() }, [])

  // Animate progress bar on mount
  useEffect(() => {
    const t = setTimeout(() => setProgress(80), 200)
    return () => clearTimeout(t)
  }, [])

  const PROBLEMS_SUMMARY = (summary?.problems || []).map((p) => ({
    title: p.title,
    difficulty: p.difficulty,
    status: p.total > 0 && p.passed === p.total ? 'Solved' : p.attempted ? 'Attempted' : 'Not attempted',
    score: p.passed,
    max: p.total,
  }))
  const solvedCount = PROBLEMS_SUMMARY.filter((p) => p.status === 'Solved').length
  const attemptedCount = PROBLEMS_SUMMARY.filter((p) => p.status !== 'Not attempted').length
  const SUMMARY = [
    { label: 'Problems Attempted', value: `${attemptedCount} / ${PROBLEMS_SUMMARY.length}` },
    { label: 'Problems Solved', value: `${solvedCount} / ${PROBLEMS_SUMMARY.length}` },
    { label: 'Time Used', value: summary ? fmtDuration(summary.elapsed || 0) : '—' },
  ]

  const totalScore = PROBLEMS_SUMMARY.reduce((a, p) => a + p.score, 0)
  const maxScore = PROBLEMS_SUMMARY.reduce((a, p) => a + p.max, 0)
  const pct = maxScore ? Math.round((totalScore / maxScore) * 100) : 0

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 h-14 flex items-center px-6 flex-shrink-0">
        <Logo size="sm" />
      </header>

      <div className="flex-1 flex items-start justify-center py-12 px-4">
        <div className="w-full max-w-2xl space-y-5">

          {/* ── Hero card ── */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Green top stripe */}
            <div className="h-2 bg-gradient-to-r from-emerald-400 via-teal-500 to-blue-500" />
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={34} className="text-emerald-600" strokeWidth={2} />
              </div>
              <h1 className="text-3xl font-extrabold text-gray-900 mb-2">
                Assessment Submitted!
              </h1>
              <p className="text-gray-500 text-base max-w-md mx-auto leading-relaxed">
                Your responses have been securely recorded and sent to the hiring team
                {summary?.title && <> for <span className="font-semibold text-gray-800">{summary.title}</span></>}.
              </p>

              {/* Score ring */}
              <div className="flex justify-center mt-7 mb-5">
                <div className="relative w-32 h-32">
                  <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                    <circle
                      cx="18" cy="18" r="15.9155"
                      fill="none" stroke="#e5e7eb" strokeWidth="3"
                    />
                    <circle
                      cx="18" cy="18" r="15.9155"
                      fill="none"
                      stroke={pct >= 70 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444'}
                      strokeWidth="3"
                      strokeDasharray={`${pct} ${100 - pct}`}
                      strokeLinecap="round"
                      style={{ transition: 'stroke-dasharray 1.2s ease' }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-extrabold text-gray-900">{totalScore}</span>
                    <span className="text-xs text-gray-400 font-medium">/ {maxScore} tests</span>
                  </div>
                </div>
              </div>
              <p className="text-gray-500 text-sm">
                You passed <span className="font-bold text-gray-800">{pct}%</span> of all test cases
              </p>
            </div>
          </div>

          {/* ── Problem breakdown ── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="font-bold text-gray-900 mb-4">Problem Breakdown</h2>
            <div className="space-y-3">
              {PROBLEMS_SUMMARY.map(({ title, difficulty, status, score, max }) => (
                <div key={title} className="flex items-center gap-4 p-3.5 bg-gray-50 rounded-xl">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-xs ${
                    status === 'Solved'
                      ? 'bg-emerald-500 text-white font-bold'
                      : 'bg-amber-400 text-white font-bold'
                  }`}>
                    {status === 'Solved' ? '✓' : '~'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800">{title}</p>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${DIFF_COLORS[difficulty]}`}>
                      {difficulty}
                    </span>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-gray-900">
                      {score}
                      <span className="text-gray-400 font-normal">/{max}</span>
                    </p>
                    <p className={`text-xs font-medium ${status === 'Solved' ? 'text-emerald-600' : 'text-amber-500'}`}>
                      {status}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Session summary ── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="font-bold text-gray-900 mb-4">Session Summary</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {SUMMARY.map(({ label, value, highlight }) => (
                <div key={label} className="bg-gray-50 rounded-xl p-3.5">
                  <p className="text-xs text-gray-400 font-medium mb-1">{label}</p>
                  <p className={`text-base font-bold ${
                    highlight === 'green' ? 'text-emerald-600' : 'text-gray-900'
                  }`}>
                    {value}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* ── What happens next ── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="font-bold text-gray-900 mb-4">What happens next?</h2>
            <div className="space-y-4">
              {[
                {
                  icon: BarChart3,
                  color: 'bg-blue-50 text-blue-600',
                  title: 'AI analysis running',
                  desc: 'InterviewLens is generating your behavioral and code quality report for the hiring team.',
                },
                {
                  icon: Clock,
                  color: 'bg-amber-50 text-amber-600',
                  title: 'Expect a response within 3–5 business days',
                  desc: 'The hiring team will review your results and reach out with next steps.',
                },
                {
                  icon: Shield,
                  color: 'bg-emerald-50 text-emerald-600',
                  title: 'Your data is secure',
                  desc: 'Your session recording and code are encrypted and only accessible to the hiring team.',
                },
              ].map(({ icon: Icon, color, title, desc }) => (
                <div key={title} className="flex items-start gap-4">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
                    <Icon size={17} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{title}</p>
                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Close CTA ── */}
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 text-center">
            <p className="text-white font-bold text-lg mb-1">You're all done 🎉</p>
            <p className="text-gray-400 text-sm mb-5">
              You can safely close this window. Good luck with the rest of your process!
            </p>
            <a
              href="/"
              className="inline-flex items-center gap-2 bg-white text-gray-900 font-semibold text-sm px-5 py-2.5 rounded-xl hover:bg-gray-100 transition-colors"
            >
              Learn about InterviewLens <ArrowRight size={15} />
            </a>
          </div>

          <p className="text-center text-xs text-gray-400 pb-6">
            © 2024 InterviewLens Inc. · <a href="#" className="hover:text-gray-600">Privacy Policy</a> · <a href="#" className="hover:text-gray-600">Candidate Rights</a>
          </p>
        </div>
      </div>
    </div>
  )
}
