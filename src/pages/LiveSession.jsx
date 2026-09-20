import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Maximize2, Square, Play, RotateCcw, Clock,
  AlertTriangle, CheckCircle, Info, Send,
  MessageSquare, Copy, Eye, MoreVertical,
} from 'lucide-react'
import { BarChart, Bar, ResponsiveContainer, XAxis } from 'recharts'

const CODE = `/**
 * Problem: Find the first non-repeating character in a string.
 * Constraints: s consists of only lowercase English letters.
 */

function firstNonRepeatingChar(s: string): number {
  const charMap = new Map<string, number>();

  // First pass: count frequencies
  for (let i = 0; i < s.length; i++) {
    const char = s[i];
    charMap.set(char, (charMap.get(char) || 0) + 1);
  }

  // Second pass: find first with count 1
  for (let i = 0; i < s.length; i++) {
    if (charMap.get(s[i]) === 1) {
      return i;
    }
  }

  return -1;
}`

const signals = [
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

const chatMessages = [
  {
    id: 1,
    sender: 'ai',
    name: 'InterviewLens AI',
    text: 'The candidate is struggling with the space complexity of the current approach. Would you like me to hint about using a Hash Map?',
    time: '14:20',
  },
  {
    id: 2,
    sender: 'interviewer',
    text: "Let's wait another minute to see if they optimize it on their own.",
    time: '14:21',
  },
  {
    id: 3,
    sender: 'ai',
    name: 'InterviewLens AI',
    text: 'Detected a risk signal: Candidate switched tabs. Monitoring for external clipboard activity.',
    time: '14:22',
  },
]

const engagementData = [
  { t: '1', v: 3 }, { t: '2', v: 5 }, { t: '3', v: 4 }, { t: '4', v: 6 },
  { t: '5', v: 8 }, { t: '6', v: 7 }, { t: '7', v: 9 }, { t: '8', v: 8 },
  { t: '9', v: 10 }, { t: '10', v: 9 },
]

function SignalIcon({ type }) {
  if (type === 'alert') return <AlertTriangle size={14} className="text-red-500 flex-shrink-0" />
  if (type === 'success') return <CheckCircle size={14} className="text-green-500 flex-shrink-0" />
  return <Info size={14} className="text-blue-500 flex-shrink-0" />
}

function SignalBg({ type }) {
  if (type === 'alert') return 'bg-red-50 border-red-100'
  if (type === 'success') return 'bg-green-50 border-green-100'
  return 'bg-blue-50 border-blue-100'
}

export default function LiveSession() {
  const [timeLeft, setTimeLeft] = useState(40 * 60 + 49)
  const [inputMsg, setInputMsg] = useState('')
  const [messages, setMessages] = useState(chatMessages)

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((t) => (t > 0 ? t - 1 : 0))
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0')
    const s = (secs % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  const sendMessage = () => {
    if (!inputMsg.trim()) return
    setMessages([...messages, { id: Date.now(), sender: 'interviewer', text: inputMsg, time: '14:23' }])
    setInputMsg('')
  }

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] bg-gray-50">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-bold text-gray-900">Live Interview Session</h1>
          <div className="flex items-center gap-1.5 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm font-medium">
            <Clock size={13} />
            {formatTime(timeLeft)} remaining
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
            <Maximize2 size={14} />
            Full Screen
          </button>
          <button className="flex items-center gap-2 border border-red-200 text-red-500 rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-red-50">
            <Square size={12} fill="currentColor" />
            End Session
          </button>
          <button className="flex items-center gap-2 bg-blue-600 text-white rounded-lg px-3 py-1.5 text-sm font-semibold hover:bg-blue-700">
            Complete Evaluation
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left: candidate info + video */}
        <div className="w-64 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col overflow-y-auto">
          {/* Candidate info */}
          <div className="p-4 text-center border-b border-gray-100">
            <div className="relative inline-block mb-3">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 mx-auto flex items-center justify-center text-white text-xl font-bold">
                MR
              </div>
              <span className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-2 border-white rounded-full" />
            </div>
            <p className="font-bold text-gray-900">Marcus Richardson</p>
            <p className="text-xs text-gray-500">Senior Backend Engineer Candidate</p>
            <div className="flex items-center justify-center gap-2 mt-2">
              <span className="bg-green-100 text-green-700 text-xs font-semibold px-2 py-0.5 rounded-full">ACTIVE</span>
              <span className="bg-gray-100 text-gray-600 text-xs font-mono px-2 py-0.5 rounded-full">ID: 9842-X</span>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-4 text-left">
              {[
                ['EXPERIENCE', '6.5 Years'],
                ['LOCATION', 'Berlin, GER'],
                ['PRIMARY STACK', 'Go, Node.js'],
                ['SESSION TYPE', 'Algorithmic'],
              ].map(([label, val]) => (
                <div key={label}>
                  <p className="text-xs text-gray-400 font-medium">{label}</p>
                  <p className="text-xs font-semibold text-gray-800">{val}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Live video */}
          <div className="relative flex-1">
            <div className="bg-gray-800 aspect-video relative overflow-hidden">
              <img
                src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&q=80"
                alt="Candidate"
                className="w-full h-full object-cover opacity-80"
              />
              <div className="absolute top-2 left-2 bg-black/60 text-white text-xs font-semibold px-2 py-0.5 rounded flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                LIVE VIDEO
              </div>
              <div className="absolute bottom-2 left-2 right-2">
                <p className="text-white text-xs font-semibold">Marcus Richardson</p>
                <p className="text-gray-300 text-xs">Latency: 42ms</p>
              </div>
            </div>
          </div>

          {/* Engagement + Quick Actions */}
          <div className="p-4 border-t border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-gray-700 flex items-center gap-1">
                <span className="text-blue-500">⚡</span> Engagement Graph
              </p>
              <span className="text-xs text-gray-400">Real-time</span>
            </div>
            <div className="h-14">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={engagementData} barSize={6}>
                  <Bar dataKey="v" fill="#2563EB" radius={[2, 2, 0, 0]} />
                  <XAxis dataKey="t" hide />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>LOW FOCUS</span>
              <span>PEAK ACTIVITY</span>
            </div>
          </div>

          <div className="p-4 border-t border-gray-100">
            <p className="text-xs font-semibold text-gray-700 mb-2">⚡ Quick Actions</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { icon: MessageSquare, label: 'Add Note' },
                { icon: Copy, label: 'Duplicate' },
                { icon: Eye, label: 'View CV' },
                { icon: MoreVertical, label: 'More' },
              ].map(({ icon: Icon, label }) => (
                <button key={label} className="flex items-center gap-1.5 border border-gray-200 rounded-lg px-2 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                  <Icon size={12} />
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Center: code editor */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Editor toolbar */}
          <div className="bg-gray-800 px-4 py-2 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <span className="text-gray-400 text-xs flex items-center gap-1.5">
                <span>&lt;/&gt;</span> solution.ts
              </span>
              <span className="text-gray-500 text-xs flex items-center gap-1">
                🔒 READ-ONLY MODE
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button className="flex items-center gap-1.5 text-gray-400 hover:text-white text-xs">
                <RotateCcw size={12} /> Reset
              </button>
              <button className="flex items-center gap-1.5 bg-blue-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-blue-700">
                <Play size={11} fill="white" /> Run Code
              </button>
            </div>
          </div>

          {/* Code */}
          <div className="flex-1 bg-gray-900 overflow-auto scrollbar-thin">
            <div className="p-4 font-mono text-sm">
              {CODE.split('\n').map((line, i) => (
                <div key={i} className="flex gap-4 leading-6">
                  <span className="text-gray-600 text-xs w-5 text-right flex-shrink-0 select-none pt-0.5">
                    {i + 1}
                  </span>
                  <span className="text-gray-300 whitespace-pre">{line}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Output */}
          <div className="bg-gray-800 border-t border-gray-700 flex-shrink-0">
            <div className="px-4 py-2 border-b border-gray-700">
              <span className="text-gray-400 text-xs font-mono">&gt;_ OUTPUT</span>
            </div>
            <div className="p-4 font-mono text-xs text-gray-300 space-y-0.5">
              <p>[14:15:30] Test Case #1: <span className="text-green-400">Passed</span> (2ms)</p>
              <p>[14:15:31] Test Case #2: <span className="text-green-400">Passed</span> (1ms)</p>
              <p>[14:15:32] Test Case #3: <span className="text-green-400">Passed</span> (4ms)</p>
            </div>
          </div>
        </div>

        {/* Right: signals + chat */}
        <div className="w-72 flex-shrink-0 bg-white border-l border-gray-200 flex flex-col">
          {/* Live Signals */}
          <div className="p-4 border-b border-gray-100 flex-shrink-0">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                <span className="text-blue-500">⚡</span> Live Signals
                <span className="bg-blue-600 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center ml-1">
                  4
                </span>
              </h3>
            </div>
            <p className="text-xs text-gray-400">Neutral monitoring of interview events.</p>
          </div>

          <div className="flex-shrink-0 overflow-y-auto max-h-72 p-4 space-y-2.5">
            {signals.map((s, i) => (
              <div key={i} className={`rounded-xl border p-3 ${SignalBg({ type: s.type })}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2">
                    <SignalIcon type={s.type} />
                    <div>
                      <p className="text-xs font-semibold text-gray-800">{s.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{s.desc}</p>
                    </div>
                  </div>
                  <span className="text-xs text-gray-400 flex-shrink-0">{s.time}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Chat */}
          <div className="flex-1 flex flex-col overflow-hidden border-t border-gray-100">
            <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
              {messages.map((msg) => (
                <div key={msg.id}>
                  {msg.sender === 'ai' && (
                    <div className="flex items-start gap-2 mb-1">
                      <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-blue-600 text-xs">🤖</span>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-blue-700">{msg.name}</p>
                        <p className="text-xs text-gray-400">Real-time analysis active</p>
                      </div>
                    </div>
                  )}
                  <div className={`rounded-xl px-3 py-2.5 text-xs leading-relaxed ${msg.sender === 'interviewer' ? 'bg-blue-600 text-white ml-6' : 'bg-gray-100 text-gray-700 mr-6'}`}>
                    {msg.text}
                  </div>
                  <p className={`text-xs text-gray-400 mt-1 ${msg.sender === 'interviewer' ? 'text-right mr-1' : 'ml-1'}`}>
                    {msg.time}
                  </p>
                </div>
              ))}
            </div>

            {/* Input */}
            <div className="p-3 border-t border-gray-100">
              <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
                <input
                  type="text"
                  placeholder="Ask AI for a hint..."
                  value={inputMsg}
                  onChange={(e) => setInputMsg(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                  className="flex-1 bg-transparent text-xs text-gray-700 placeholder-gray-400 outline-none"
                />
                <span className="text-xs text-gray-400 font-medium">AI MODE</span>
                <button
                  onClick={sendMessage}
                  className="w-6 h-6 bg-blue-600 rounded-lg flex items-center justify-center hover:bg-blue-700 transition-colors"
                >
                  <Send size={11} className="text-white" />
                </button>
              </div>
              <div className="flex gap-2 mt-2">
                {['Analyze Complexity', 'Check Plagiarism', 'Generate Hint'].map((action) => (
                  <button key={action} className="text-xs text-blue-600 font-medium hover:underline">
                    {action}
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
