import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  Square, Clock, AlertTriangle, CheckCircle,
  Info, Send, Copy, Check, Play, Loader,
  ChevronDown, Activity, Wifi, WifiOff, Users,
} from 'lucide-react'
import { BarChart, Bar, ResponsiveContainer, XAxis } from 'recharts'
import CodeEditorPane from '../components/CodeEditorPane'
import NewSessionModal from '../components/NewSessionModal'
import { useInterviewSocket } from '../hooks/useInterviewSocket'
import { useWebRTC } from '../hooks/useWebRTC'
import { sessionsAPI, signalsAPI } from '../services/api'
import { loadSessionProblems } from '../services/problems'

const ACTIVITY_BUCKET_MS = 15000
const ACTIVITY_BUCKETS = 20
const MAX_SIGNALS = 30

const titleCase = (s = '') => s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
const RISK_TO_CARD = { critical: 'alert', high: 'alert', medium: 'info', low: 'info', info: 'info' }

function describeDetail(detail) {
  if (!detail) return null
  let d = detail
  if (typeof d === 'string') {
    try { d = JSON.parse(d) } catch { return d }
  }
  if (typeof d !== 'object') return String(d)
  if (d.length != null) return `${d.length} characters${d.preview ? `: “${d.preview}…”` : ''}`
  return Object.entries(d).map(([k, v]) => `${k}: ${v}`).join(', ')
}

const signalCard = ({ signal_type, risk_level, detail, timestamp }) => ({
  type: RISK_TO_CARD[risk_level] || 'info',
  title: titleCase(signal_type),
  time: (timestamp ? new Date(timestamp) : new Date()).toLocaleTimeString(),
  desc: describeDetail(detail) || `${titleCase(signal_type)} detected`,
})

function SignalCard({ type, title, time, desc }) {
  const styles = {
    alert:   'bg-red-50 border-red-100',
    info:    'bg-blue-50 border-blue-100',
    success: 'bg-green-50 border-green-100',
  }
  const icons = {
    alert:   <AlertTriangle size={13} className="text-red-500 flex-shrink-0 mt-0.5" />,
    info:    <Info         size={13} className="text-blue-500 flex-shrink-0 mt-0.5" />,
    success: <CheckCircle size={13} className="text-green-500 flex-shrink-0 mt-0.5" />,
  }
  return (
    <div className={`rounded-xl border p-3 ${styles[type]}`}>
      <div className="flex items-start gap-2">
        {icons[type]}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1">
            <p className="text-xs font-semibold text-gray-800 truncate">{title}</p>
            <span className="text-xs text-gray-400 flex-shrink-0">{time}</span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5 leading-relaxed line-clamp-2">{desc}</p>
        </div>
      </div>
    </div>
  )
}

// ─── No session selected ──────────────────────────────────────────────────────

function NoSession() {
  const [showNew, setShowNew] = useState(false)
  return (
    <div className="flex items-center justify-center h-[calc(100vh-3.5rem)] bg-gray-50">
      <div className="text-center max-w-sm">
        <Users size={44} className="text-gray-300 mx-auto mb-4" />
        <h2 className="text-lg font-bold text-gray-900 mb-1">No session selected</h2>
        <p className="text-sm text-gray-500 mb-5">
          Create a new interview, or open one from the Interviews list to monitor it live.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link to="/interviews" className="border border-gray-200 rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-white">
            View interviews
          </Link>
          <button
            onClick={() => setShowNew(true)}
            className="flex items-center gap-2 bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-semibold hover:bg-blue-700"
          >
            <Play size={13} fill="white" /> New session
          </button>
        </div>
      </div>
      {showNew && <NewSessionModal onClose={() => setShowNew(false)} />}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function LiveSession() {
  const [searchParams] = useSearchParams()
  const sessionId = searchParams.get('session')
  if (!sessionId) return <NoSession />
  return <LiveSessionView key={sessionId} sessionId={sessionId} />
}

function LiveSessionView({ sessionId }) {
  const navigate = useNavigate()

  const [session, setSession]       = useState(null)
  const [problems, setProblems]     = useState([])
  const [loadError, setLoadError]   = useState('')
  const [now, setNow]               = useState(Date.now())
  const [messages, setMessages]     = useState([])
  const [inputMsg, setInputMsg]     = useState('')
  const [problemIdx, setProblemIdx] = useState(0)
  const [lang, setLang]             = useState('JavaScript')
  const [codes, setCodes]           = useState({})
  const [showProblemPicker, setShowProblemPicker] = useState(false)
  const [liveSignals, setLiveSignals] = useState([])
  const [candidateOnline, setCandidateOnline] = useState(false)
  const [notes, setNotes]           = useState('')
  const [notesSaved, setNotesSaved] = useState(true)
  const [busy, setBusy]             = useState(false)
  const [copied, setCopied]         = useState(false)
  const [activity, setActivity]     = useState(() =>
    Array.from({ length: ACTIVITY_BUCKETS }, (_, i) => ({ t: String(i), v: 0 })))
  const activityCount = useRef(0)

  const problem = problems[problemIdx]

  // ── Load session + problems + signal history ──
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { data } = await sessionsAPI.get(sessionId)
        const probs = await loadSessionProblems(data)
        if (cancelled) return
        setSession(data)
        setNotes(data.notes || '')
        setProblems(probs)
        setCodes(Object.fromEntries(probs.map((p) => [p.id, { ...p.starterCode }])))
      } catch (err) {
        if (!cancelled) setLoadError(err.response?.data?.detail || 'Could not load this session.')
      }
    })()
    signalsAPI.forSession(sessionId)
      .then(({ data }) => {
        if (!cancelled) setLiveSignals(data.slice(-MAX_SIGNALS).reverse().map(signalCard))
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [sessionId])

  // ── WebSocket + WebRTC ──
  const { connected, send, subscribe } = useInterviewSocket(sessionId)
  const { remoteStream, connectionState } = useWebRTC({
    role: 'interviewer', send, subscribe, connected,
  })
  const remoteVideoRef = useRef(null)
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream
    }
  }, [remoteStream])

  const addCard = useCallback((card) => {
    setLiveSignals((prev) => [card, ...prev].slice(0, MAX_SIGNALS))
  }, [])

  const problemsRef = useRef(problems)
  problemsRef.current = problems

  useEffect(() => subscribe((msg) => {
    switch (msg.type) {
      case 'code_update': {
        setCandidateOnline(true)
        activityCount.current++
        const idx = problemsRef.current.findIndex((p) => String(p.id) === String(msg.problem_id))
        if (idx < 0 || msg.code == null) return
        const pid = problemsRef.current[idx].id
        setCodes((prev) => ({ ...prev, [pid]: { ...prev[pid], [msg.language]: msg.code } }))
        setProblemIdx(idx)
        if (msg.language) setLang(msg.language)
        return
      }
      case 'signal':
        addCard(signalCard(msg))
        return
      case 'code_run': {
        const title = problemsRef.current.find((p) => String(p.id) === String(msg.problem_id))?.title || 'Problem'
        addCard({
          type: msg.is_accepted ? 'success' : 'alert',
          title: `${msg.is_final ? 'Final submission' : 'Code run'}: ${msg.passed}/${msg.total} passed`,
          time: new Date().toLocaleTimeString(),
          desc: `${title} · ${msg.language}`,
        })
        return
      }
      case 'similarity_alert':
        addCard({
          type: 'alert',
          title: 'Code Similarity Alert',
          time: new Date().toLocaleTimeString(),
          desc: `${Math.round(msg.overall_score)}% similar to reference code (${msg.language}).`,
        })
        return
      case 'candidate_submitted':
        addCard({ type: 'success', title: 'Candidate submitted', time: new Date().toLocaleTimeString(), desc: 'The candidate submitted their final answers.' })
        return
      case 'chat':
        if (msg.role === 'candidate') {
          setMessages((prev) => [...prev, {
            id: Date.now(), sender: 'candidate', text: msg.text,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          }])
        }
        return
      case 'user_joined':
      case 'user_left':
        if (msg.role === 'candidate') {
          setCandidateOnline(msg.type === 'user_joined')
          addCard({
            type: 'info',
            title: msg.type === 'user_joined' ? 'Candidate connected' : 'Candidate disconnected',
            time: new Date().toLocaleTimeString(),
            desc: msg.type === 'user_joined' ? 'The candidate joined the session.' : 'The candidate left or lost connection.',
          })
          // Session goes active when the candidate begins — pick up the new status/start time
          if (msg.type === 'user_joined') {
            sessionsAPI.get(sessionId).then(({ data }) => setSession(data)).catch(() => {})
          }
        }
        return
      default:
    }
  }), [subscribe, addCard, sessionId])

  useEffect(() => {
    if (connectionState === 'connected') setCandidateOnline(true)
  }, [connectionState])

  // ── Clock + activity buckets ──
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])
  useEffect(() => {
    const t = setInterval(() => {
      const v = activityCount.current
      activityCount.current = 0
      setActivity((prev) => [...prev.slice(1), { t: String(Date.now()), v }])
    }, ACTIVITY_BUCKET_MS)
    return () => clearInterval(t)
  }, [])

  const totalSeconds = (session?.duration_minutes || 60) * 60
  const startedAt = session?.started_at ? new Date(session.started_at).getTime() : null
  const timeLeft = startedAt ? Math.max(0, Math.round(totalSeconds - (now - startedAt) / 1000)) : totalSeconds
  const isLive = session?.status === 'active'
  const isOver = session?.status === 'completed' || session?.status === 'cancelled'

  const fmt = (s) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0')
    const sec = (s % 60).toString().padStart(2, '0')
    return `${m}:${sec}`
  }

  const startSession = async () => {
    setBusy(true)
    try {
      const { data } = await sessionsAPI.start(sessionId)
      setSession(data)
    } finally {
      setBusy(false)
    }
  }

  const endSession = async () => {
    if (!window.confirm('End this interview for the candidate? This cannot be undone.')) return
    setBusy(true)
    try {
      await saveNotes()
      await sessionsAPI.end(sessionId)
      send({ type: 'end_session' })
      navigate(`/interviews/${sessionId}`)
    } catch {
      setBusy(false)
    }
  }

  const saveNotes = async () => {
    if (notesSaved) return
    await sessionsAPI.update(sessionId, { notes })
    setNotesSaved(true)
  }

  const copyToken = () => {
    navigator.clipboard.writeText(session.access_token).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const sendMessage = () => {
    const text = inputMsg.trim()
    if (!text) return
    const delivered = send({ type: 'chat', text })
    setMessages((prev) => [...prev, {
      id: Date.now(), sender: 'interviewer', text, failed: !delivered,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }])
    setInputMsg('')
  }

  if (loadError) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-3.5rem)] bg-gray-50">
        <div className="bg-white border border-red-200 rounded-2xl p-6 max-w-md text-center">
          <AlertTriangle className="mx-auto text-red-500 mb-3" />
          <p className="font-semibold text-gray-900 mb-1">Unable to open session</p>
          <p className="text-sm text-gray-500 mb-4">{loadError}</p>
          <Link to="/interviews" className="text-sm font-semibold text-blue-600 hover:underline">Back to interviews</Link>
        </div>
      </div>
    )
  }

  if (!session || !problem) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-3.5rem)]">
        <Loader className="animate-spin text-blue-600" />
      </div>
    )
  }

  const toolbarSlot = (
    <Link
      to={`/interviews/${sessionId}`}
      className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
    >
      Complete Evaluation
    </Link>
  )

  return (
    <div className="flex flex-col bg-gray-50" style={{ height: 'calc(100vh - 3.5rem)' }}>

      {/* ── Top bar ── */}
      <div className="bg-white border-b border-gray-200 px-5 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <h1 className="text-lg font-bold text-gray-900 truncate">{session.title}</h1>
          <div className="flex items-center gap-1.5 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm font-medium border border-blue-100 flex-shrink-0">
            <Clock size={13} />
            {isOver ? 'Ended' : startedAt ? `${fmt(timeLeft)} remaining` : `${session.duration_minutes} min · not started`}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Problem switcher */}
          <div className="relative">
            <button
              onClick={() => setShowProblemPicker(!showProblemPicker)}
              className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              Problem: {problem.title}
              <ChevronDown size={13} />
            </button>
            {showProblemPicker && (
              <div className="absolute right-0 mt-1 w-56 bg-white border border-gray-200 rounded-xl shadow-lg z-50 py-1">
                {problems.map((p, i) => (
                  <button
                    key={p.id}
                    onClick={() => { setProblemIdx(i); setShowProblemPicker(false) }}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50 ${
                      i === problemIdx ? 'text-blue-600 font-semibold' : 'text-gray-700'
                    }`}
                  >
                    <span className="w-5 h-5 rounded-full bg-gray-100 text-gray-500 text-xs font-bold flex items-center justify-center flex-shrink-0">
                      {i + 1}
                    </span>
                    {p.title}
                  </button>
                ))}
              </div>
            )}
          </div>
          {!isLive && !isOver && (
            <button
              onClick={startSession}
              disabled={busy}
              className="flex items-center gap-2 bg-blue-600 text-white rounded-lg px-3 py-1.5 text-sm font-semibold hover:bg-blue-700 disabled:opacity-60"
            >
              <Play size={11} fill="white" /> Start Session
            </button>
          )}
          {!isOver && (
            <button
              onClick={endSession}
              disabled={busy}
              className="flex items-center gap-2 border border-red-200 text-red-500 rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-red-50 disabled:opacity-60"
            >
              <Square size={11} fill="currentColor" /> End Session
            </button>
          )}
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left: candidate card + video */}
        <div className="w-56 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col overflow-y-auto">
          {/* Candidate info */}
          <div className="p-4 text-center border-b border-gray-100">
            <div className="relative inline-block mb-3">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-white text-lg font-bold mx-auto">
                {session.candidate_name?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || 'CA'}
              </div>
              <span className={`absolute bottom-0 right-0 w-3.5 h-3.5 border-2 border-white rounded-full ${
                candidateOnline ? 'bg-green-500' : 'bg-gray-400'
              }`} />
            </div>
            <p className="font-bold text-gray-900 text-sm">{session.candidate_name || 'Candidate'}</p>
            <p className="text-xs text-gray-500 mt-0.5">{session.candidate_role || 'Role not specified'}</p>
            <div className="flex items-center justify-center gap-1.5 mt-2">
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                isLive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
              }`}>
                {session.status.toUpperCase()}
              </span>
            </div>
            <button
              onClick={copyToken}
              title="Copy candidate access token"
              className="mt-2 inline-flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-mono px-2 py-1 rounded-lg"
            >
              {session.access_token}
              {copied ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
            </button>
            <div className="grid grid-cols-2 gap-1.5 mt-3 text-left">
              <div className="min-w-0">
                <p className="text-[10px] text-gray-400 font-semibold">EMAIL</p>
                <p className="text-xs font-semibold text-gray-800 truncate" title={session.candidate_email || ''}>
                  {session.candidate_email || '—'}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 font-semibold">DURATION</p>
                <p className="text-xs font-semibold text-gray-800">{session.duration_minutes} min</p>
              </div>
            </div>
          </div>

          {/* Live video */}
          <div className="relative bg-gray-800">
            {remoteStream ? (
              <>
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full aspect-video object-cover"
                />
                <div className="absolute top-2 left-2 bg-black/60 text-white text-[10px] font-semibold px-2 py-0.5 rounded flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                  LIVE
                </div>
                <div className="absolute top-2 right-2 bg-black/60 text-white text-[10px] font-semibold px-2 py-0.5 rounded">
                  {connectionState}
                </div>
              </>
            ) : (
              <div className="w-full aspect-video flex items-center justify-center bg-gray-700">
                <div className="text-center px-2">
                  {!isOver && <div className="w-8 h-8 border-4 border-gray-500 border-t-gray-300 rounded-full animate-spin mx-auto mb-2" />}
                  <p className="text-white text-xs">
                    {isOver ? 'Session ended' : candidateOnline ? 'Connecting video…' : 'Waiting for candidate…'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Engagement */}
          <div className="p-3 border-t border-gray-100">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs font-semibold text-gray-700 flex items-center gap-1">
                <Activity size={11} className="text-blue-500" /> Typing activity
              </p>
              <span className="text-[10px] text-gray-400">Last 5 min</span>
            </div>
            <div className="h-10">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={activity} barSize={5}>
                  <Bar dataKey="v" fill="#2563EB" radius={[2, 2, 0, 0]} isAnimationActive={false} />
                  <XAxis dataKey="t" hide />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Notes */}
          <div className="p-3 border-t border-gray-100 mt-auto">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs font-semibold text-gray-600">Interviewer notes</p>
              <span className="text-[10px] text-gray-400">{notesSaved ? 'Saved' : 'Unsaved'}</span>
            </div>
            <textarea
              value={notes}
              onChange={(e) => { setNotes(e.target.value); setNotesSaved(false) }}
              onBlur={() => saveNotes().catch(() => {})}
              rows={4}
              placeholder="Private notes, saved to the session…"
              className="w-full text-xs border border-gray-200 rounded-lg p-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Center: candidate's code (mirrored live, read-only) */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <CodeEditorPane
            key={`${problem.id}-${lang}`}
            code={codes[problem.id]?.[lang] ?? ''}
            onCodeChange={() => {}}
            language={lang}
            onLanguageChange={setLang}
            problem={problem}
            starterCode={problem.starterCode[lang] ?? ''}
            readOnly
            showLanguageSwitcher
            toolbarSlot={toolbarSlot}
          />
        </div>

        {/* Right: signals + chat */}
        <div className="flex-shrink-0 bg-white border-l border-gray-200 flex flex-col" style={{ width: 272 }}>
          {/* Live signals */}
          <div className="p-4 border-b border-gray-100 flex-shrink-0">
            <div className="flex items-center justify-between mb-0.5">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                <span className="text-blue-500">⚡</span> Live Signals
                <span className="bg-blue-600 text-white text-[10px] font-bold min-w-4 h-4 px-1 rounded-full flex items-center justify-center ml-0.5">
                  {liveSignals.length}
                </span>
              </h3>
              <div className={`flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${connected ? 'text-emerald-600 bg-emerald-50' : 'text-gray-400 bg-gray-100'}`}>
                {connected ? <Wifi size={10} /> : <WifiOff size={10} />}
                {connected ? 'Live' : 'Offline'}
              </div>
            </div>
            <p className="text-xs text-gray-400">Neutral monitoring of interview events.</p>
          </div>

          <div className="p-3 space-y-2 overflow-y-auto flex-shrink-0 max-h-72 border-b border-gray-100">
            {liveSignals.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">No events yet.</p>
            ) : (
              liveSignals.map((s, i) => <SignalCard key={i} {...s} />)
            )}
          </div>

          {/* Chat */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {messages.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-4">
                  Messages you send appear on the candidate’s screen.
                </p>
              )}
              {messages.map((msg) => (
                <div key={msg.id}>
                  <div className={`rounded-xl px-3 py-2 text-xs leading-relaxed ${
                    msg.sender === 'interviewer'
                      ? 'bg-blue-600 text-white ml-6'
                      : 'bg-gray-100 text-gray-700 mr-6'
                  }`}>
                    {msg.text}
                  </div>
                  <p className={`text-[10px] mt-0.5 ${msg.failed ? 'text-red-500' : 'text-gray-400'} ${msg.sender === 'interviewer' ? 'text-right mr-1' : 'ml-1'}`}>
                    {msg.failed ? 'Not delivered — offline' : msg.time}
                  </p>
                </div>
              ))}
            </div>

            {/* Input */}
            <div className="p-3 border-t border-gray-100 flex-shrink-0">
              <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
                <input
                  type="text"
                  placeholder="Message the candidate…"
                  value={inputMsg}
                  onChange={(e) => setInputMsg(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                  className="flex-1 bg-transparent text-xs text-gray-700 placeholder-gray-400 outline-none"
                />
                <button
                  onClick={sendMessage}
                  className="w-5 h-5 bg-blue-600 rounded-md flex items-center justify-center hover:bg-blue-700 transition-colors"
                >
                  <Send size={10} className="text-white" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
