import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import {
  Clock, ChevronLeft, ChevronRight, CheckCircle,
  AlertTriangle, Send, Maximize2, Minimize2,
  List, X, HelpCircle, AlertCircle, Wifi, WifiOff, Loader, MessageSquare,
} from 'lucide-react'
import Logo from '../../components/Logo'
import CodeEditorPane from '../../components/CodeEditorPane'
import { useProctoring } from '../../hooks/useProctoring'
import { useInterviewSocket } from '../../hooks/useInterviewSocket'
import { useWebRTC } from '../../hooks/useWebRTC'
import { analyticsAPI, candidateSession, sessionsAPI, submissionsAPI } from '../../services/api'
import { loadSessionProblems } from '../../services/problems'

const SNAPSHOT_INTERVAL_MS = 30000
const TIME_WARNINGS = [60, 300, 600]  // seconds remaining, tightest first
const draftKey = (sessionId) => `interviewlens:draft:${sessionId}`

function loadDraft(sessionId) {
  try { return JSON.parse(localStorage.getItem(draftKey(sessionId))) || null } catch { return null }
}
const CODE_SYNC_DEBOUNCE_MS = 300

// Map a /submissions/run test result onto the editor's result shape
const toEditorResult = (r) => ({
  id:           r.id,
  input:        r.input,
  expected:     r.expected,
  stdout:       r.stdout,
  passed:       r.passed,
  statusLabel:  r.status_label,
  statusType:   r.status_type,
  statusId:     r.passed ? 3 : 4,
  error:        r.stderr || r.compile_error || (r.status_type === 'error' ? r.status_label : ''),
  time:         r.time,
  memory:       r.memory,
})

// ─── Difficulty badge colours ─────────────────────────────────────────────────
const DIFF = {
  Easy:   'bg-emerald-100 text-emerald-700',
  Medium: 'bg-amber-100 text-amber-700',
  Hard:   'bg-red-100 text-red-600',
}

// ─── Problem-list dropdown ────────────────────────────────────────────────────
function ProblemNav({ problems, currentIdx, solved, onSelect, onClose }) {
  return (
    <div className="absolute top-full left-0 mt-1 w-72 bg-white border border-gray-200 rounded-2xl shadow-xl z-50 p-2">
      <div className="flex items-center justify-between px-2 py-1.5 mb-1">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">All Problems</p>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-0.5">
          <X size={13} />
        </button>
      </div>
      {problems.map((p, i) => (
        <button
          key={p.id}
          onClick={() => { onSelect(i); onClose() }}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${
            i === currentIdx ? 'bg-blue-50' : 'hover:bg-gray-50'
          }`}
        >
          <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
            solved[p.id] ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-500'
          }`}>
            {solved[p.id] ? '✓' : i + 1}
          </div>
          <span className={`flex-1 text-sm font-semibold truncate ${
            i === currentIdx ? 'text-blue-700' : 'text-gray-800'
          }`}>
            {p.title}
          </span>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${DIFF[p.difficulty]}`}>
            {p.difficulty}
          </span>
        </button>
      ))}
    </div>
  )
}

// ─── Left panel: problem statement ───────────────────────────────────────────
function ProblemPanel({ problem, index }) {
  return (
    <div className="h-full overflow-y-auto bg-white">
      <div className="p-6 space-y-5">
        {/* Tags */}
        <div className="flex items-center gap-2">
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${DIFF[problem.difficulty]}`}>
            {problem.difficulty}
          </span>
          <span className="text-gray-400 text-sm font-medium">{problem.points} pts</span>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 leading-tight">
          {index + 1}. {problem.title}
        </h1>

        <p
          className="text-gray-700 text-sm leading-relaxed"
          dangerouslySetInnerHTML={{ __html: problem.description }}
        />

        {/* Examples */}
        {problem.examples.map((ex, i) => (
          <div key={i}>
            <p className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
              <span className="text-blue-500 text-xs">ℹ</span> Example {i + 1}:
            </p>
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 font-mono text-xs space-y-1 text-gray-700">
              <div><span className="text-gray-400">Input:  </span>{ex.input}</div>
              <div><span className="text-gray-400">Output: </span>{ex.output}</div>
              {ex.explanation && (
                <div className="text-gray-500 pt-1">
                  <span className="text-gray-400">Explanation: </span>{ex.explanation}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Constraints */}
        {problem.constraints.length > 0 && <div>
          <p className="text-sm font-semibold text-gray-900 mb-2">Constraints:</p>
          <ul className="space-y-1.5">
            {problem.constraints.map((c, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                <span className="text-gray-300 mt-0.5 flex-shrink-0">•</span>
                <code className="font-mono text-xs bg-gray-50 px-1.5 py-0.5 rounded">{c}</code>
              </li>
            ))}
          </ul>
        </div>}
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function CandidateInterviewPage() {
  const sessionId = candidateSession.sessionId
  if (!sessionId) return <Navigate to="/candidate/login" replace />
  return <InterviewWorkspace sessionId={sessionId} />
}

function InterviewWorkspace({ sessionId }) {
  const navigate = useNavigate()
  const [session, setSession]       = useState(null)
  const [problems, setProblems]     = useState([])
  const [loadError, setLoadError]   = useState('')
  const [timeLeft, setTimeLeft]     = useState(null)
  const [currentIdx, setCurrentIdx] = useState(0)
  const [lang, setLang]             = useState('JavaScript')
  // Per-problem, per-language code state
  const [codes, setCodes]           = useState({})
  const [solved, setSolved]             = useState({})
  const [showNav, setShowNav]           = useState(false)
  const [fullscreen, setFullscreen]     = useState(false)
  const [showSubmitModal, setShowSubmitModal] = useState(false)
  const [submitting, setSubmitting]     = useState(false)
  const [submitError, setSubmitError]   = useState('')
  const [showHelp, setShowHelp]         = useState(false)
  const [messages, setMessages]         = useState([])
  const [chatOpen, setChatOpen]         = useState(false)
  const [unread, setUnread]             = useState(0)
  const [chatInput, setChatInput]       = useState('')
  const [timeWarning, setTimeWarning]   = useState(null)

  const problem = problems[currentIdx]
  const TOTAL = (session?.duration_minutes || 60) * 60
  const elapsed = timeLeft == null ? 0 : TOTAL - timeLeft

  // ── Load session + problems ──
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { data: sess } = await sessionsAPI.get(sessionId)
        if (sess.status === 'completed' || sess.status === 'cancelled') {
          navigate('/candidate/submitted', { replace: true })
          return
        }
        const probs = await loadSessionProblems(sess)
        if (cancelled) return
        setSession(sess)
        setProblems(probs)
        // Restore unsaved work from this browser (refresh / accidental close)
        const draft = loadDraft(sessionId)
        setCodes(Object.fromEntries(probs.map((p) => [
          p.id, { ...p.starterCode, ...(draft?.codes?.[p.id] || {}) },
        ])))
        if (draft?.lang) setLang(draft.lang)
        if (draft?.currentIdx != null && draft.currentIdx < probs.length) setCurrentIdx(draft.currentIdx)
        if (draft?.solved) setSolved(draft.solved)
      } catch (err) {
        if (!cancelled) setLoadError(err.response?.data?.detail || 'Could not load your interview.')
      }
    })()
    return () => { cancelled = true }
  }, [sessionId, navigate])

  // ── Countdown from the server-side start time ──
  useEffect(() => {
    if (!session) return
    const startedAt = session.started_at ? new Date(session.started_at).getTime() : Date.now()
    const tick = () => {
      const left = Math.max(0, Math.round(TOTAL - (Date.now() - startedAt) / 1000))
      setTimeLeft(left)
    }
    tick()
    const t = setInterval(tick, 1000)
    return () => clearInterval(t)
  }, [session, TOTAL])

  // ── WebSocket connection ──
  const { connected, send, subscribe } = useInterviewSocket(sessionId)

  // ── WebRTC video streaming ──
  const { localStream, startVideo, stopVideo, connectionState } = useWebRTC({
    role: 'candidate', send, subscribe, connected,
  })
  const videoRef = useRef(null)

  // ── Proctoring ──
  useProctoring({
    sessionId,
    elapsedSeconds: elapsed,
    ws: null,   // signals go via REST batch (persisted + broadcast by the server)
    enabled: !!session,
  })

  // Latest values for timers/handlers without re-arming them every render
  const latest = useRef({})
  latest.current = { problem, problems, lang, codes, elapsed, chatOpen }

  // ── Persist work locally so a refresh never loses code ──
  useEffect(() => {
    if (!problems.length) return
    try {
      localStorage.setItem(draftKey(sessionId), JSON.stringify({ codes, lang, currentIdx, solved }))
    } catch { /* storage full or disabled */ }
  }, [codes, lang, currentIdx, solved, problems.length, sessionId])

  const pushMessage = useCallback((from, text) => {
    setMessages((prev) => [...prev, {
      id: `${Date.now()}-${Math.random()}`, from, text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }])
  }, [])

  // Bring an interviewer who joins late fully up to date: every problem's code,
  // ending on the one the candidate is looking at
  const resyncInterviewer = useCallback(() => {
    const { problem: current, problems: all, lang: l, codes: c } = latest.current
    if (!current) return
    for (const p of all) {
      if (p.id !== current.id && c[p.id]?.[l] !== p.starterCode[l]) {
        send({ type: 'code_update', problem_id: p.id, language: l, code: c[p.id]?.[l] ?? '' })
      }
    }
    send({ type: 'code_update', problem_id: current.id, language: l, code: c[current.id]?.[l] ?? '' })
  }, [send])

  // ── Messages from the interviewer ──
  useEffect(() => subscribe((msg) => {
    if (msg.type === 'chat' && msg.role !== 'candidate') {
      pushMessage('interviewer', msg.text)
      if (!latest.current.chatOpen) setUnread((n) => n + 1)
      setChatOpen(true)
    }
    if ((msg.type === 'user_joined' && msg.role === 'interviewer') || msg.type === 'webrtc_request') {
      resyncInterviewer()
    }
    if (msg.type === 'session_ended') {
      navigate('/candidate/submitted', { replace: true })
    }
  }), [subscribe, navigate, pushMessage, resyncInterviewer])

  const sendChat = (e) => {
    e?.preventDefault()
    const text = chatInput.trim()
    if (!text) return
    if (send({ type: 'chat', text })) {
      pushMessage('candidate', text)
      setChatInput('')
    }
  }

  useEffect(() => { if (chatOpen) setUnread(0) }, [chatOpen])

  // ── Time warnings ──
  const warned = useRef(new Set())
  useEffect(() => {
    if (timeLeft == null) return
    for (const t of TIME_WARNINGS) {
      if (timeLeft <= t && timeLeft > 0 && !warned.current.has(t)) {
        TIME_WARNINGS.filter((x) => x >= t).forEach((x) => warned.current.add(x))
        setTimeWarning(t >= 60 ? `${t / 60} minute${t === 60 ? '' : 's'} remaining` : `${t} seconds remaining`)
        setTimeout(() => setTimeWarning(null), 8000)
        break
      }
    }
  }, [timeLeft])

  // ── Auto-save snapshot every 30s ──
  const keystrokes = useRef(0)
  useEffect(() => {
    if (!session) return
    const t = setInterval(() => {
      const { problem: p, lang: l, codes: c, elapsed: e } = latest.current
      if (!p) return
      const rate = keystrokes.current / (SNAPSHOT_INTERVAL_MS / 60000)
      keystrokes.current = 0
      analyticsAPI.saveSnapshot({
        session_id:      sessionId,
        problem_id:      p.id,
        language:        l,
        source_code:     c[p.id]?.[l] || '',
        elapsed_seconds: e,
        keystroke_rate:  rate,
      }).catch(() => { /* retried next tick */ })
    }, SNAPSHOT_INTERVAL_MS)
    return () => clearInterval(t)
  }, [session, sessionId])

  // ── Send code updates over WebSocket (debounced) ──
  const syncTimer = useRef(null)
  const sendCodeUpdate = useCallback((problemId, language, code) => {
    clearTimeout(syncTimer.current)
    syncTimer.current = setTimeout(() => {
      send({ type: 'code_update', problem_id: problemId, language, code })
    }, CODE_SYNC_DEBOUNCE_MS)
  }, [send])

  // Keep the interviewer on the same problem/language as the candidate
  useEffect(() => {
    if (!connected || !problem) return
    sendCodeUpdate(problem.id, lang, codes[problem.id]?.[lang] ?? '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, problem?.id, lang, sendCodeUpdate])

  // ── Start camera once the session is loaded ──
  useEffect(() => {
    if (!session) return undefined
    startVideo().catch((err) => console.error('Failed to start camera:', err))
    return () => stopVideo()
  }, [session, startVideo, stopVideo])

  // ── Display local video stream ──
  useEffect(() => {
    if (videoRef.current && localStream) {
      videoRef.current.srcObject = localStream
    }
  }, [localStream])

  // ── Time's up → submit automatically ──
  const autoSubmitted = useRef(false)
  useEffect(() => {
    if (timeLeft === 0 && session && !autoSubmitted.current) {
      autoSubmitted.current = true
      handleFinalSubmit()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, session])

  const fmt = (s) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0')
    const sec = (s % 60).toString().padStart(2, '0')
    return `${m}:${sec}`
  }

  const timerColor = timeLeft < 300
    ? 'text-red-500'
    : timeLeft < 600
    ? 'text-amber-500'
    : 'text-gray-700'

  const handleCodeChange = (val) => {
    keystrokes.current++
    setCodes((prev) => ({
      ...prev,
      [problem.id]: { ...prev[problem.id], [lang]: val },
    }))
    sendCodeUpdate(problem.id, lang, val)
  }

  const handleLangChange = (l) => setLang(l)

  // Runs go through /submissions so they're stored and the interviewer sees results live
  const runOnServer = useCallback(async ({ code, language }) => {
    const { data } = await submissionsAPI.run({
      session_id: sessionId,
      problem_id: problem.id,
      language,
      source_code: code,
    })
    if (data.is_accepted) setSolved((prev) => ({ ...prev, [problem.id]: true }))
    return data.results.map(toEditorResult)
  }, [sessionId, problem?.id])

  const handleMarkSolved = () => setSolved((p) => ({ ...p, [problem.id]: true }))

  async function handleFinalSubmit() {
    setSubmitting(true)
    setSubmitError('')
    const { lang: l, codes: c } = latest.current
    const results = await Promise.allSettled(problems.map((p) => {
      const code = c[p.id]?.[l]
      if (!code || code === p.starterCode[l]) return Promise.resolve(null)
      return submissionsAPI.run({
        session_id: sessionId, problem_id: p.id, language: l, source_code: code, is_final: true,
      })
    }))
    const summary = problems.map((p, i) => {
      const r = results[i]
      const data = r.status === 'fulfilled' ? r.value?.data : null
      return {
        title: p.title,
        difficulty: p.difficulty,
        passed: data?.passed_cases ?? 0,
        total: data?.total_cases ?? p.testCases.length,
        attempted: !!data,
      }
    })
    sessionStorage.setItem('submission_summary', JSON.stringify({
      title: session?.title, elapsed: latest.current.elapsed, problems: summary,
    }))
    send({ type: 'candidate_submitted' })
    try { localStorage.removeItem(draftKey(sessionId)) } catch { /* ignore */ }
    stopVideo()
    navigate('/candidate/submitted')
  }

  if (loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="bg-white border border-red-200 rounded-2xl p-6 max-w-md text-center">
          <AlertTriangle className="mx-auto text-red-500 mb-3" />
          <p className="font-semibold text-gray-900 mb-1">Unable to open your interview</p>
          <p className="text-sm text-gray-500 mb-4">{loadError}</p>
          <button
            onClick={() => { candidateSession.clear(); navigate('/candidate/login') }}
            className="text-sm font-semibold text-blue-600 hover:underline"
          >
            Back to candidate login
          </button>
        </div>
      </div>
    )
  }

  if (!problem || timeLeft == null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader className="animate-spin text-blue-600" />
      </div>
    )
  }

  const solvedCount = Object.keys(solved).length
  const allSolved   = problems.every((p) => solved[p.id])

  // Toolbar slot rendered inside CodeEditorPane's toolbar
  const toolbarSlot = (
    <>
      {solved[problem.id] && (
        <span className="flex items-center gap-1 text-xs text-emerald-600 font-semibold bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
          <CheckCircle size={11} /> Solved
        </span>
      )}
      <button
        onClick={handleMarkSolved}
        disabled={!!solved[problem.id]}
        className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
      >
        <CheckCircle size={11} /> Mark Solved
      </button>
    </>
  )

  return (
    <div
      className={`flex flex-col bg-white ${fullscreen ? 'fixed inset-0 z-50' : ''}`}
      style={{ height: '100vh' }}
    >
      {/* ── Top bar ── */}
      <header className="h-14 border-b border-gray-200 flex items-center justify-between px-4 flex-shrink-0 bg-white z-30">
        {/* Left */}
        <div className="flex items-center gap-2 min-w-0">
          <Logo size="sm" />
          <div className="h-5 w-px bg-gray-200 mx-1" />

          {/* Problem picker */}
          <div className="relative">
            <button
              onClick={() => setShowNav(!showNav)}
              className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors"
            >
              <List size={13} />
              <span className="hidden sm:inline truncate max-w-[180px]">
                {currentIdx + 1}. {problem.title}
              </span>
              <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${DIFF[problem.difficulty]}`}>
                {problem.difficulty}
              </span>
            </button>
            {showNav && (
              <ProblemNav
                problems={problems}
                currentIdx={currentIdx}
                solved={solved}
                onSelect={setCurrentIdx}
                onClose={() => setShowNav(false)}
              />
            )}
          </div>

          {/* Prev / Next */}
          <button
            disabled={currentIdx === 0}
            onClick={() => setCurrentIdx((i) => i - 1)}
            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 disabled:opacity-30 transition-colors"
          >
            <ChevronLeft size={15} />
          </button>
          <button
            disabled={currentIdx === problems.length - 1}
            onClick={() => setCurrentIdx((i) => i + 1)}
            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 disabled:opacity-30 transition-colors"
          >
            <ChevronRight size={15} />
          </button>

          {/* Progress pills */}
          <div className="hidden sm:flex items-center gap-1.5 ml-1">
            {problems.map((p, i) => (
              <button
                key={p.id}
                onClick={() => setCurrentIdx(i)}
                title={p.title}
                className={`w-6 h-6 rounded-full text-[10px] font-bold transition-all ${
                  solved[p.id]
                    ? 'bg-emerald-500 text-white'
                    : i === currentIdx
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-500 hover:bg-gray-300'
                }`}
              >
                {solved[p.id] ? '✓' : i + 1}
              </button>
            ))}
          </div>
        </div>

        {/* Center — timer */}
        <div className={`flex items-center gap-1.5 font-mono font-bold text-base ${timerColor}`}>
          <Clock size={15} className={timerColor} />
          {fmt(timeLeft)}
          {timeLeft < 300 && (
            <span className="text-xs font-semibold text-red-500 animate-pulse ml-1">Low time!</span>
          )}
        </div>

        {/* Right */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowHelp(!showHelp)}
            className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors"
          >
            <HelpCircle size={16} />
          </button>
          <button
            onClick={() => setChatOpen((o) => !o)}
            className="relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <MessageSquare size={15} /> Chat
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold min-w-4 h-4 px-1 rounded-full flex items-center justify-center">
                {unread}
              </span>
            )}
          </button>
          {/* WS connectivity indicator */}
          {(
            <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${connected ? 'text-emerald-600 bg-emerald-50' : 'text-gray-400 bg-gray-100'}`}>
              {connected ? <Wifi size={12} /> : <WifiOff size={12} />}
              {connected ? 'Live' : 'Offline'}
            </div>
          )}
          <button
            onClick={() => setFullscreen(!fullscreen)}
            className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors"
          >
            {fullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
          <button
            onClick={() => setShowSubmitModal(true)}
            className="flex items-center gap-1.5 bg-blue-600 text-white font-semibold text-sm px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Send size={13} /> Submit All
          </button>
        </div>
      </header>

      {/* ── Body: problem | editor ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Problem panel */}
        <div className="w-[42%] border-r border-gray-200 flex flex-col overflow-hidden">
          <ProblemPanel problem={problem} index={currentIdx} />
        </div>

        {/* Editor */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <CodeEditorPane
            key={`${problem.id}-${lang}`}
            code={codes[problem.id]?.[lang] ?? ''}
            onCodeChange={handleCodeChange}
            language={lang}
            onLanguageChange={handleLangChange}
            problem={problem}
            starterCode={problem.starterCode[lang] ?? ''}
            readOnly={false}
            showLanguageSwitcher
            toolbarSlot={toolbarSlot}
            onRunAll={runOnServer}
          />
        </div>
      </div>

      {/* ── Status bar ── */}
      <div className="h-7 bg-white border-t border-gray-100 flex items-center justify-between px-5 flex-shrink-0">
        <div className="flex items-center gap-4 text-xs text-gray-400">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            Proctoring Active
          </span>
          <span className="hidden sm:inline text-gray-200">|</span>
          <span className="hidden sm:inline">Auto-saved</span>
          <span className="hidden sm:inline text-gray-200">|</span>
          <span className="text-emerald-600 font-medium">{solvedCount}/{problems.length} solved</span>
        </div>
        <div className="flex items-center gap-4 text-xs text-gray-400">
          <button onClick={() => setChatOpen(true)} className="flex items-center gap-1 hover:text-gray-600">
            <AlertCircle size={11} /> Report an issue to your interviewer
          </button>
          <span>v2.4.0</span>
        </div>
      </div>

      {/* ── Submit modal ── */}
      {showSubmitModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <Send size={18} className="text-blue-600" />
              </div>
              <div>
                <h2 className="font-bold text-gray-900 text-lg">Submit Assessment</h2>
                <p className="text-gray-400 text-xs">This action cannot be undone.</p>
              </div>
            </div>

            <div className="space-y-2 mb-5">
              {problems.map((p, i) => (
                <div key={p.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                      solved[p.id] ? 'bg-emerald-500 text-white' : 'bg-gray-300 text-gray-600'
                    }`}>
                      {solved[p.id] ? '✓' : i + 1}
                    </div>
                    <span className="text-sm font-medium text-gray-800">{p.title}</span>
                    <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${DIFF[p.difficulty]}`}>
                      {p.difficulty}
                    </span>
                  </div>
                  <span className={`text-xs font-semibold ${solved[p.id] ? 'text-emerald-600' : 'text-gray-400'}`}>
                    {solved[p.id] ? 'Solved' : 'Unsolved'}
                  </span>
                </div>
              ))}
            </div>

            {!allSolved && (
              <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
                <AlertTriangle size={13} className="text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700">
                  <strong>{problems.length - solvedCount}</strong> problem(s) unsolved. Your current code for each will still be submitted.
                </p>
              </div>
            )}

            {submitError && (
              <p className="text-xs text-red-600 mb-3">{submitError}</p>
            )}

            <div className="flex gap-3">
              <button
                disabled={submitting}
                onClick={() => setShowSubmitModal(false)}
                className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Go Back
              </button>
              <button
                onClick={handleFinalSubmit}
                disabled={submitting}
                className="flex-1 bg-blue-600 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {submitting ? <><Loader size={13} className="animate-spin" /> Submitting…</> : <>Confirm &amp; Submit</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Help panel ── */}
      {showHelp && (
        <div className="fixed bottom-10 right-4 w-60 bg-white border border-gray-200 rounded-2xl shadow-xl p-4 z-50">
          <div className="flex items-center justify-between mb-3">
            <p className="font-semibold text-gray-900 text-sm">Shortcuts</p>
            <button onClick={() => setShowHelp(false)} className="text-gray-400 hover:text-gray-600">
              <X size={13} />
            </button>
          </div>
          <ul className="space-y-2 text-xs text-gray-600">
            {[
              ['Tab',     'Indent 2 spaces'],
              ['⬅ ➡',    'Switch problem'],
            ].map(([key, desc]) => (
              <li key={key} className="flex items-center justify-between gap-2">
                <span>{desc}</span>
                <kbd className="bg-gray-100 border border-gray-200 rounded px-1.5 py-0.5 font-mono text-xs">
                  {key}
                </kbd>
              </li>
            ))}
          </ul>
          <p className="text-xs text-gray-400 mt-3 leading-relaxed">
            Code is executed on Judge0 CE. Results reflect actual runtime output.
          </p>
        </div>
      )}

      {/* ── Time warning ── */}
      {timeWarning && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-amber-500 text-white text-sm font-semibold px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
          <Clock size={14} /> {timeWarning}
        </div>
      )}

      {/* ── Chat with the interviewer ── */}
      {chatOpen && (
        <div className="fixed bottom-40 right-4 w-80 bg-white border border-gray-200 rounded-2xl shadow-2xl z-50 flex flex-col" style={{ height: 360 }}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <div>
              <p className="text-sm font-semibold text-gray-900">Chat with your interviewer</p>
              <p className="text-[11px] text-gray-400">{connected ? 'Connected' : 'Reconnecting…'}</p>
            </div>
            <button onClick={() => setChatOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={14} /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {messages.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-6">Ask a clarifying question or report a problem.</p>
            )}
            {messages.map((m) => (
              <div key={m.id} className={m.from === 'candidate' ? 'text-right' : ''}>
                <div className={`inline-block max-w-[85%] text-left rounded-xl px-3 py-2 text-sm break-words ${
                  m.from === 'candidate' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'
                }`}>
                  {m.text}
                </div>
                <p className="text-[10px] text-gray-400 mt-0.5">{m.from === 'candidate' ? 'You' : 'Interviewer'} · {m.time}</p>
              </div>
            ))}
          </div>
          <form onSubmit={sendChat} className="p-3 border-t border-gray-100 flex gap-2">
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Type a message…"
              className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button type="submit" disabled={!connected} className="bg-blue-600 text-white rounded-lg px-3 disabled:opacity-50">
              <Send size={13} />
            </button>
          </form>
        </div>
      )}

      {/* ── Camera preview (small pip in corner) ── */}
      {localStream && (
        <div className="fixed bottom-4 right-4 z-50">
          <div className="relative w-40 h-[120px] bg-black rounded-xl overflow-hidden shadow-lg border-2 border-gray-300">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            <div className="absolute top-2 left-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
              REC
            </div>
            <div className="absolute bottom-2 left-2 text-white text-[10px] bg-black/50 px-2 py-0.5 rounded">
              {connectionState === 'connected' ? '● Live' : connectionState}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
