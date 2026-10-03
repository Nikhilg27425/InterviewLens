import React, { useState, useEffect } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import {
  Camera, Mic, Monitor, Wifi, CheckCircle, XCircle,
  Loader, AlertTriangle, ChevronRight, Shield,
  RefreshCw,
} from 'lucide-react'
import Logo from '../../components/Logo'
import { BASE_URL, candidateSession, sessionsAPI } from '../../services/api'

const CHECKS = [
  { id: 'camera', icon: Camera, label: 'Camera access', desc: 'Required for proctoring' },
  { id: 'mic', icon: Mic, label: 'Microphone access', desc: 'Required for session audio' },
  { id: 'screen', icon: Monitor, label: 'Screen resolution', desc: 'Minimum 1024×768 required' },
  { id: 'network', icon: Wifi, label: 'Network speed', desc: 'Stable connection needed' },
]

const CHECK_TIMEOUT_MS = 15000

const RULES = [
  'Do not open any other browser tabs or windows during the test.',
  'Do not copy code from external sources — similarity detection is active.',
  'Your screen, keystrokes, and webcam feed will be monitored throughout.',
  'You may not communicate with anyone during the session.',
  'Refreshing or navigating away will be logged as a risk signal.',
  'Submit your final answer before the timer expires.',
]

function CheckRow({ icon: Icon, label, desc, status }) {
  return (
    <div className="flex items-center gap-4 py-3.5">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
        status === 'pass' ? 'bg-emerald-50 text-emerald-600' :
        status === 'fail' ? 'bg-red-50 text-red-500' :
        'bg-gray-100 text-gray-400'
      }`}>
        <Icon size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800">{label}</p>
        <p className="text-xs text-gray-400">{desc}</p>
      </div>
      <div className="flex-shrink-0">
        {status === 'checking' && (
          <Loader size={18} className="text-blue-500 animate-spin" />
        )}
        {status === 'pass' && (
          <CheckCircle size={18} className="text-emerald-500" />
        )}
        {status === 'fail' && (
          <XCircle size={18} className="text-red-500" />
        )}
        {status === 'idle' && (
          <div className="w-4 h-4 rounded-full border-2 border-gray-200" />
        )}
      </div>
    </div>
  )
}

export default function CandidateWaitingRoom() {
  const navigate = useNavigate()
  const sessionId = candidateSession.sessionId
  const [checkStates, setCheckStates] = useState({
    camera: 'idle', mic: 'idle', screen: 'idle', network: 'idle',
  })
  const [rulesRead, setRulesRead] = useState(false)
  const [runningChecks, setRunningChecks] = useState(false)
  const [allPassed, setAllPassed] = useState(false)
  const [checksDone, setChecksDone] = useState(false)
  const [session, setSession] = useState(null)
  const [error, setError] = useState('')
  const [joining, setJoining] = useState(false)

  useEffect(() => {
    if (!sessionId) return
    sessionsAPI.get(sessionId)
      .then(({ data }) => {
        if (data.status === 'completed' || data.status === 'cancelled') {
          setError('This interview session has already ended.')
        }
        setSession(data)
      })
      .catch((err) => setError(err.response?.data?.detail || 'Could not load your interview session.'))
  }, [sessionId])

  if (!sessionId) return <Navigate to="/candidate/login" replace />

  const problemCount = session?.problem_ids ? session.problem_ids.split(',').filter(Boolean).length : null

  const beginInterview = async () => {
    setJoining(true)
    setError('')
    try {
      await sessionsAPI.join(sessionId)
      navigate('/candidate/interview')
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not start the interview. Please try again.')
      setJoining(false)
    }
  }

  const runChecks = async () => {
    setRunningChecks(true)
    setChecksDone(false)
    setAllPassed(false)
    setCheckStates({ camera: 'idle', mic: 'idle', screen: 'idle', network: 'idle' })

    const sequence = ['camera', 'mic', 'screen', 'network']
    const results = {}

    for (let i = 0; i < sequence.length; i++) {
      const id = sequence[i]
      
      // Set to checking
      setCheckStates((prev) => ({ ...prev, [id]: 'checking' }))
      
      // Wait a bit for visual effect
      await new Promise(resolve => setTimeout(resolve, 300))
      
      // Actually perform the checks
      let passed = false
      const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`${id} check timed out`)), CHECK_TIMEOUT_MS))

      try {
        await Promise.race([timeout, (async () => {
          if (id === 'camera') {
            try {
              const stream = await navigator.mediaDevices.getUserMedia({ video: true })
              const track = stream.getVideoTracks()[0]
              passed = !!track && track.readyState === 'live' && track.enabled
              stream.getTracks().forEach((t) => t.stop())
            } catch (error) {
              console.error('Camera check failed:', error)
              passed = false
            }

          } else if (id === 'mic') {
            try {
              const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
              const track = stream.getAudioTracks()[0]
              passed = !!track && track.readyState === 'live' && track.enabled
              stream.getTracks().forEach((t) => t.stop())
            } catch (error) {
              console.error('Microphone check failed:', error)
              passed = false
            }

          } else if (id === 'screen') {
            // Check screen resolution (minimum 1024x768)
            passed = window.screen.width >= 1024 && window.screen.height >= 768
          
          } else if (id === 'network') {
            // Round-trip to the interview server
            if (navigator.onLine) {
              const t0 = performance.now()
              const res = await fetch(`${BASE_URL}/health`, { cache: 'no-store' })
              passed = res.ok && performance.now() - t0 < 3000
            }
          }
        })()])
      } catch (error) {
        console.error(`${id} check failed:`, error)
        passed = false
      }
      
      results[id] = passed
      setCheckStates((prev) => ({ ...prev, [id]: passed ? 'pass' : 'fail' }))
      
      // Small delay before next check
      await new Promise(resolve => setTimeout(resolve, 200))
    }

    // All checks done
    const allChecksPassed = Object.values(results).every(v => v === true)
    setRunningChecks(false)
    setChecksDone(true)
    setAllPassed(allChecksPassed)
  }

  const canBegin = allPassed && rulesRead

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top bar */}
      <header className="bg-white border-b border-gray-200 px-6 h-14 flex items-center justify-between flex-shrink-0">
        <Logo size="sm" />
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 text-xs font-semibold px-3 py-1.5 rounded-full border border-emerald-200">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
            Candidate Portal
          </div>
        </div>
      </header>

      <div className="flex-1 flex items-start justify-center py-10 px-4">
        <div className="w-full max-w-5xl">
          {/* Page heading */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-extrabold text-gray-900 mb-2">
              Almost there — let's get you ready
            </h1>
            <p className="text-gray-500 text-base max-w-lg mx-auto">
              Complete the system check and read the rules below. The timer won't start until you click{' '}
              <strong className="text-gray-700">Begin Interview</strong>.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-5">
            {/* ── Col 1+2: checks + rules ── */}
            <div className="lg:col-span-2 space-y-5">

              {/* System check card */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h2 className="font-bold text-gray-900">System Check</h2>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Run the check to verify your environment before starting.
                    </p>
                  </div>
                  {checksDone && (
                    <button
                      onClick={runChecks}
                      className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg px-3 py-1.5"
                    >
                      <RefreshCw size={12} /> Re-run
                    </button>
                  )}
                </div>

                <div className="divide-y divide-gray-50 mb-5">
                  {CHECKS.map(({ id, icon, label, desc }) => (
                    <CheckRow
                      key={id}
                      icon={icon}
                      label={label}
                      desc={desc}
                      status={checkStates[id]}
                    />
                  ))}
                </div>

                {!checksDone ? (
                  <button
                    onClick={runChecks}
                    disabled={runningChecks}
                    className="w-full bg-blue-600 text-white font-semibold py-3 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2 text-sm"
                  >
                    {runningChecks ? (
                      <>
                        <Loader size={15} className="animate-spin" />
                        Running checks…
                      </>
                    ) : (
                      <>
                        <Shield size={15} />
                        Run System Check
                      </>
                    )}
                  </button>
                ) : allPassed ? (
                  <div className="flex items-center gap-2.5 bg-emerald-50 border border-emerald-200 rounded-xl p-3.5">
                    <CheckCircle size={16} className="text-emerald-600 flex-shrink-0" />
                    <p className="text-sm font-semibold text-emerald-700">
                      All checks passed — your environment is ready.
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center gap-2.5 bg-red-50 border border-red-200 rounded-xl p-3.5">
                    <AlertTriangle size={16} className="text-red-500 flex-shrink-0" />
                    <p className="text-sm font-semibold text-red-600">
                      Some checks failed. Fix the issues and re-run.
                    </p>
                  </div>
                )}
              </div>

              {/* Rules card */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h2 className="font-bold text-gray-900 mb-1">Assessment Rules</h2>
                <p className="text-xs text-gray-400 mb-4">
                  Read carefully — violations are logged as risk signals.
                </p>

                <ul className="space-y-3 mb-6">
                  {RULES.map((rule, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <div className="w-5 h-5 bg-orange-50 border border-orange-200 rounded-full flex items-center justify-center text-orange-600 text-xs font-bold flex-shrink-0 mt-0.5">
                        {i + 1}
                      </div>
                      <p className="text-sm text-gray-600 leading-relaxed">{rule}</p>
                    </li>
                  ))}
                </ul>

                <label className="flex items-start gap-3 cursor-pointer group">
                  <div
                    onClick={() => setRulesRead(!rulesRead)}
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors cursor-pointer ${
                      rulesRead
                        ? 'bg-emerald-600 border-emerald-600'
                        : 'border-gray-300 bg-white group-hover:border-emerald-400'
                    }`}
                  >
                    {rulesRead && <CheckCircle size={13} className="text-white" strokeWidth={3} />}
                  </div>
                  <span className="text-sm text-gray-700 leading-relaxed">
                    I have read and understood the assessment rules and agree to comply throughout my session.
                  </span>
                </label>
              </div>
            </div>

            {/* ── Col 3: assessment brief + begin ── */}
            <div className="space-y-4">
              {/* Brief card */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center mb-4">
                  <span className="text-white text-xl">📋</span>
                </div>
                <h2 className="font-bold text-gray-900 text-base mb-0.5">{session?.title || 'Loading…'}</h2>
                <p className="text-xs text-gray-400 mb-4">
                  {session?.candidate_role || 'Technical assessment'}
                </p>

                <div className="space-y-2.5">
                  {[
                    ['Candidate', session?.candidate_name || candidateSession.user?.full_name || '—'],
                    ['Duration', session ? `${session.duration_minutes} minutes` : '—'],
                    ['Problems', problemCount ? `${problemCount} questions` : 'All available'],
                    ['Timer starts', 'When you click Begin'],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between items-center text-sm">
                      <span className="text-gray-400 font-medium">{k}</span>
                      <span className="font-semibold text-gray-800">{v}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <Shield size={12} className="text-blue-500" />
                    AI-proctored · Encrypted · Auto-saved
                  </div>
                </div>
              </div>

              {/* Tips card */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-100 p-5">
                <p className="text-sm font-bold text-blue-800 mb-3">💡 Quick tips</p>
                <ul className="space-y-2">
                  {[
                    'Think out loud — it helps the AI understand your approach',
                    'Start with brute force, then optimise',
                    'Your code auto-saves every 30 seconds',
                  ].map((tip) => (
                    <li key={tip} className="flex items-start gap-2 text-xs text-blue-700/80">
                      <span className="mt-0.5 text-blue-400">›</span>
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>

              {error && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
                  <AlertTriangle size={14} className="text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-600">{error}</p>
                </div>
              )}

              {/* Begin button */}
              <button
                disabled={!canBegin || joining || !session}
                onClick={beginInterview}
                className={`w-full flex items-center justify-center gap-2.5 font-bold text-sm py-4 rounded-2xl transition-all ${
                  canBegin
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-200'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                {joining ? 'Starting…' : 'Begin Interview'}
                <ChevronRight size={18} />
              </button>

              {!canBegin && (
                <p className="text-center text-xs text-gray-400">
                  {!checksDone && !rulesRead
                    ? 'Run the system check and read the rules to continue'
                    : !checksDone
                    ? 'Complete the system check to continue'
                    : 'Read and acknowledge the rules to continue'}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
