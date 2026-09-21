import React, { useState, useEffect, useRef } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import {
  Maximize2, Square, Clock, AlertTriangle, CheckCircle,
  Info, Send, MessageSquare, Copy, Eye, MoreVertical,
  ChevronDown, Activity, Wifi, WifiOff, ShieldAlert,
} from 'lucide-react'
import { BarChart, Bar, ResponsiveContainer, XAxis } from 'recharts'
import CodeEditorPane from '../components/CodeEditorPane'
import { PROBLEMS } from '../data/problems'
import { useInterviewSocket } from '../hooks/useInterviewSocket'
import { sessionsAPI, signalsAPI } from '../services/api'

// ─── Static seed data ─────────────────────────────────────────────────────────

const SIGNALS = [
  {
    type: 'alert',
    title: 'Multiple Faces Detected',
    time: '14:22:10',
    desc: 'The camera detected more than one person in the frame for 3 seconds.',
  },
  {
    type: 'info',
    title: 'Tab Switch Detected',
    time: '14:18:45',
    desc: 'Candidate switched focus to another browser tab.',
  },
  {
    type: 'success',
    title: 'Passes Test Case #4',
    time: '14:15:30',
    desc: 'Solution correctly handles empty array input.',
  },
  {
    type: 'alert',
    title: 'Code Similarity Alert',
    time: '14:12:05',
    desc: 'Significant code block matches a known online resource (GitHub/StackOverflow).',
  },
]

const SEED_CHAT = [
  {
    id: 1, sender: 'ai', name: 'InterviewLens AI',
    text: 'The candidate is struggling with the space complexity of the current approach. Would you like me to hint about using a Hash Map?',
    time: '14:20',
  },
  {
    id: 2, sender: 'interviewer',
    text: "Let's wait another minute to see if they optimize it on their own.",
    time: '14:21',
  },
  {
    id: 3, sender: 'ai', name: 'InterviewLens AI',
    text: 'Detected a risk signal: Candidate switched tabs. Monitoring for external clipboard activity.',
    time: '14:22',
  },
]

const ENG_DATA = [
  { t:'1',v:3},{t:'2',v:5},{t:'3',v:4},{t:'4',v:6},
  {t:'5',v:8},{t:'6',v:7},{t:'7',v:9},{t:'8',v:8},
  {t:'9',v:10},{t:'10',v:9},
]

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

// ─── Main component ───────────────────────────────────────────────────────────

export default function LiveSession() {
  const [searchParams] = useSearchParams()
  const sessionId = searchParams.get('session') || null

  const [timeLeft,   setTimeLeft]   = useState(40 * 60 + 49)
  const [messages,   setMessages]   = useState(SEED_CHAT)
  const [inputMsg,   setInputMsg]   = useState('')
  const [problemIdx, setProblemIdx] = useState(0)
  const [lang,       setLang]       = useState('JavaScript')
  const [codes,      setCodes]      = useState(() =>
    Object.fromEntries(PROBLEMS.map((p) => [p.id, { ...p.starterCode }]))
  )
  const [showProblemPicker, setShowProblemPicker] = useState(false)
  const [liveSignals, setLiveSignals] = useState(SIGNALS)

  const problem = PROBLEMS[problemIdx]

  // ── WebSocket — receive live updates from candidate ──
  const { connected, lastMessage, send } = useInterviewSocket(sessionId)

  useEffect(() => {
    if (!lastMessage) return
    const msg = lastMessage

    // Live code sync from candidate
    if (msg.type === 'code_update' && msg.code !== undefined) {
      const matchIdx = PROBLEMS.findIndex(p => String(p.id) === String(msg.problem_id))
      if (matchIdx >= 0) {
        const p = PROBLEMS[matchIdx]
        setCodes(prev => ({
          ...prev,
          [p.id]: { ...prev[p.id], [msg.language || lang]: msg.code }
        }))
        if (matchIdx !== problemIdx) setProblemIdx(matchIdx)
        if (msg.language && msg.language !== lang) setLang(msg.language)
      }
    }

    // Incoming proctoring signal
    if (msg.type === 'signal') {
      const riskColors = { critical:'alert', high:'alert', medium:'info', low:'info', info:'info' }
      setLiveSignals(prev => [{
        type: riskColors[msg.risk_level] || 'info',
        title: msg.signal_type.replace(/_/g,' ').replace(/\b\w/g, c => c.toUpperCase()),
        time: new Date().toLocaleTimeString(),
        desc: msg.detail ? (typeof msg.detail === 'string' ? msg.detail : JSON.stringify(msg.detail)) : `${msg.signal_type} detected`,
      }, ...prev.slice(0, 9)])
    }

    // Incoming chat
    if (msg.type === 'chat' && msg.role === 'candidate') {
      setMessages(prev => [...prev, {
        id: Date.now(), sender: 'candidate',
        text: msg.text, time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      }])
    }
  }, [lastMessage])

  // Load session signals from DB on mount
  useEffect(() => {
    if (!sessionId) return
    signalsAPI.forSession(sessionId)
      .then(({ data }) => {
        if (data?.length) {
          setLiveSignals(data.slice(0,10).map(s => ({
            type: ['critical','high'].includes(s.risk_level) ? 'alert' : 'info',
            title: s.signal_type.replace(/_/g,' ').replace(/\b\w/g, c => c.toUpperCase()),
            time: new Date(s.timestamp).toLocaleTimeString(),
            desc: s.detail || s.signal_type,
          })))
        }
      })
      .catch(() => {})
  }, [sessionId])

  useEffect(() => {
    const t = setInterval(() => setTimeLeft((s) => (s > 0 ? s - 1 : 0)), 1000)
    return () => clearInterval(t)
  }, [])

  const fmt = (s) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0')
    const sec = (s % 60).toString().padStart(2, '0')
    return `${m}:${sec}`
  }

  const handleCodeChange = (val) => {
    setCodes((prev) => ({
      ...prev,
      [problem.id]: { ...prev[problem.id], [lang]: val },
    }))
  }

  const sendMessage = () => {
    if (!inputMsg.trim()) return
    // Send over WS if connected
    if (sessionId) send({ type: 'chat', text: inputMsg })
    setMessages([...messages, {
      id: Date.now(), sender: 'interviewer',
      text: inputMsg, time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    }])
    setInputMsg('')
  }

  // Toolbar slot for the editor — "Complete Evaluation" button
  const toolbarSlot = (
    <Link
      to={`/interviews/1`}
      className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
    >
      Complete Evaluation
    </Link>
  )

  return (
    <div className="flex flex-col bg-gray-50" style={{ height: 'calc(100vh - 3.5rem)' }}>

      {/* ── Top bar ── */}
      <div className="bg-white border-b border-gray-200 px-5 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold text-gray-900">Live Interview Session</h1>
          <div className="flex items-center gap-1.5 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm font-medium border border-blue-100">
            <Clock size={13} />
            {fmt(timeLeft)} remaining
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
                {PROBLEMS.map((p, i) => (
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
          <button className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
            <Maximize2 size={13} /> Full Screen
          </button>
          <button className="flex items-center gap-2 border border-red-200 text-red-500 rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-red-50">
            <Square size={11} fill="currentColor" /> End Session
          </button>
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
                MR
              </div>
              <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full" />
            </div>
            <p className="font-bold text-gray-900 text-sm">Marcus Richardson</p>
            <p className="text-xs text-gray-500 mt-0.5">Senior Backend Engineer</p>
            <div className="flex items-center justify-center gap-1.5 mt-2">
              <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full">ACTIVE</span>
              <span className="bg-gray-100 text-gray-600 text-xs font-mono px-2 py-0.5 rounded-full">9842-X</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5 mt-3 text-left">
              {[['STACK','Go, Node.js'],['SESSION','Algorithmic']].map(([k,v]) => (
                <div key={k}>
                  <p className="text-[10px] text-gray-400 font-semibold">{k}</p>
                  <p className="text-xs font-semibold text-gray-800">{v}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Live video */}
          <div className="relative bg-gray-800">
            <img
              src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&q=80"
              alt="Candidate feed"
              className="w-full aspect-video object-cover opacity-80"
            />
            <div className="absolute top-2 left-2 bg-black/60 text-white text-[10px] font-semibold px-2 py-0.5 rounded flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
              LIVE
            </div>
            <div className="absolute bottom-1.5 left-2">
              <p className="text-white text-xs font-semibold">Marcus Richardson</p>
              <p className="text-gray-300 text-[10px]">Latency: 42ms</p>
            </div>
          </div>

          {/* Engagement */}
          <div className="p-3 border-t border-gray-100">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs font-semibold text-gray-700 flex items-center gap-1">
                <Activity size={11} className="text-blue-500" /> Engagement
              </p>
              <span className="text-[10px] text-gray-400">Live</span>
            </div>
            <div className="h-10">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ENG_DATA} barSize={5}>
                  <Bar dataKey="v" fill="#2563EB" radius={[2,2,0,0]} />
                  <XAxis dataKey="t" hide />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
              <span>Low</span><span>Peak</span>
            </div>
          </div>

          {/* Quick actions */}
          <div className="p-3 border-t border-gray-100 mt-auto">
            <p className="text-xs font-semibold text-gray-600 mb-2">Quick Actions</p>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { Icon: MessageSquare, label: 'Note' },
                { Icon: Copy,          label: 'Copy' },
                { Icon: Eye,           label: 'View CV' },
                { Icon: MoreVertical,  label: 'More' },
              ].map(({ Icon, label }) => (
                <button key={label} className="flex items-center gap-1 border border-gray-200 rounded-lg px-2 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50">
                  <Icon size={11} /> {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Center: code editor — real, editable, connected to Judge0 */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <CodeEditorPane
            key={`${problem.id}-${lang}`}
            code={codes[problem.id][lang]}
            onCodeChange={handleCodeChange}
            language={lang}
            onLanguageChange={setLang}
            problem={problem}
            starterCode={problem.starterCode[lang]}
            readOnly={false}
            showLanguageSwitcher
            toolbarSlot={toolbarSlot}
          />
        </div>

        {/* Right: signals + chat */}
        <div className="w-68 flex-shrink-0 bg-white border-l border-gray-200 flex flex-col" style={{ width: 272 }}>
          {/* Live signals */}
          <div className="p-4 border-b border-gray-100 flex-shrink-0">
            <div className="flex items-center justify-between mb-0.5">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                <span className="text-blue-500">⚡</span> Live Signals
                <span className="bg-blue-600 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center ml-0.5">
                  {liveSignals.length}
                </span>
              </h3>
              {sessionId && (
                <div className={`flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${connected ? 'text-emerald-600 bg-emerald-50' : 'text-gray-400 bg-gray-100'}`}>
                  {connected ? <Wifi size={10} /> : <WifiOff size={10} />}
                  {connected ? 'Live' : 'Demo'}
                </div>
              )}
            </div>
            <p className="text-xs text-gray-400">Neutral monitoring of interview events.</p>
          </div>

          <div className="p-3 space-y-2 overflow-y-auto flex-shrink-0 max-h-56 border-b border-gray-100">
            {liveSignals.map((s, i) => <SignalCard key={i} {...s} />)}
          </div>

          {/* Chat */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {messages.map((msg) => (
                <div key={msg.id}>
                  {msg.sender === 'ai' && (
                    <div className="flex items-center gap-1.5 mb-1">
                      <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center text-[10px]">🤖</div>
                      <p className="text-xs font-semibold text-blue-700">{msg.name}</p>
                    </div>
                  )}
                  <div className={`rounded-xl px-3 py-2 text-xs leading-relaxed ${
                    msg.sender === 'interviewer'
                      ? 'bg-blue-600 text-white ml-6'
                      : 'bg-gray-100 text-gray-700 mr-6'
                  }`}>
                    {msg.text}
                  </div>
                  <p className={`text-[10px] text-gray-400 mt-0.5 ${msg.sender === 'interviewer' ? 'text-right mr-1' : 'ml-1'}`}>
                    {msg.time}
                  </p>
                </div>
              ))}
            </div>

            {/* Input */}
            <div className="p-3 border-t border-gray-100 flex-shrink-0">
              <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
                <input
                  type="text"
                  placeholder="Ask AI for a hint…"
                  value={inputMsg}
                  onChange={(e) => setInputMsg(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                  className="flex-1 bg-transparent text-xs text-gray-700 placeholder-gray-400 outline-none"
                />
                <span className="text-[10px] text-gray-400 font-medium">AI</span>
                <button
                  onClick={sendMessage}
                  className="w-5 h-5 bg-blue-600 rounded-md flex items-center justify-center hover:bg-blue-700 transition-colors"
                >
                  <Send size={10} className="text-white" />
                </button>
              </div>
              <div className="flex gap-2 mt-1.5 flex-wrap">
                {['Analyze', 'Plagiarism', 'Hint'].map((a) => (
                  <button key={a} className="text-[10px] text-blue-600 font-medium hover:underline">
                    {a}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
