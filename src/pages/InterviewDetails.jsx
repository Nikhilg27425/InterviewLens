import React, { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  Download, Share2, Play, Code2, AlertTriangle,
  CheckCircle, ShieldAlert, Clock, ChevronRight,
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'

const behavioralData = Array.from({ length: 61 }, (_, i) => ({
  t: i,
  engagement: Math.max(60, Math.min(100, 75 + Math.sin(i / 5) * 15 + Math.random() * 8)),
  focus: Math.max(50, Math.min(95, 70 + Math.cos(i / 4) * 12 + Math.random() * 6)),
  risk: i >= 38 && i <= 43 ? 35 : 0,
}))

const aiSignals = [
  {
    type: 'risk',
    category: 'RISK SIGNAL',
    title: 'Switching Tabs Frequently',
    time: '42:15',
    desc: 'The candidate switched to an external browser tab 4 times within 60 seconds',
  },
  {
    type: 'behavioral',
    category: 'BEHAVIORAL',
    title: 'Strong Technical Clarity',
    time: '15:20',
    desc: 'Candidate explained the time complexity of the heap sort implementation with high',
  },
  {
    type: 'suspicious',
    category: 'SUSPICIOUS ACTIVITY',
    title: 'Potential Copied Code Snippet',
    time: '38:05',
    desc: 'A large block of boilerplate code (45 lines) was pasted instantly. Similarity',
  },
]

const timeline = [
  { label: 'Interview Started', time: '00:00', flagged: false },
  { label: 'Problem Introduction: LRG Cache', time: '05:30', flagged: false },
  { label: 'Behavioral Analysis: Technical Clarity', time: '15:20', flagged: false, active: true },
  { label: 'Suspicious Activity: Paste Event', time: '38:05', flagged: true },
  { label: 'Risk Signal: Tab Switch', time: '42:15', flagged: true },
  { label: 'Solution Submission', time: '55:00', flagged: false },
  { label: 'Interview Concluded', time: '60:00', flagged: false },
]

const competency = [
  { label: 'Systems Design', score: 95 },
  { label: 'Algorithm Complexity', score: 88 },
  { label: 'Frontend Architecture', score: 72 },
  { label: 'Security Awareness', score: 64 },
]

const tabs = ['Session Overview', 'Coding Details', 'Similarity Analysis']

const skillBadges = [
  { label: 'Technical Skill', value: 'Elite', delta: '+12%', color: 'blue' },
  { label: 'Communication', value: 'High', color: 'green' },
  { label: 'Problem Solving', value: '92%', color: 'purple' },
  { label: 'Integrity Score', value: '84/100', color: 'orange' },
]

function SignalCard({ type, category, title, time, desc }) {
  const styles = {
    risk: 'border-red-100 bg-red-50',
    behavioral: 'border-blue-100 bg-blue-50',
    suspicious: 'border-orange-100 bg-orange-50',
  }
  const icons = {
    risk: <AlertTriangle size={14} className="text-red-500 flex-shrink-0 mt-0.5" />,
    behavioral: <CheckCircle size={14} className="text-blue-500 flex-shrink-0 mt-0.5" />,
    suspicious: <ShieldAlert size={14} className="text-orange-500 flex-shrink-0 mt-0.5" />,
  }
  const catColors = {
    risk: 'text-red-600',
    behavioral: 'text-blue-600',
    suspicious: 'text-orange-500',
  }

  return (
    <div className={`rounded-xl border p-3.5 ${styles[type]}`}>
      <div className="flex items-start gap-2">
        {icons[type]}
        <div className="flex-1 min-w-0">
          <p className={`text-xs font-bold tracking-wide mb-0.5 ${catColors[type]}`}>{category}</p>
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-gray-900">{title}</p>
            <span className="text-xs text-gray-400 flex-shrink-0">{time}</span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5 leading-relaxed line-clamp-2">{desc}</p>
        </div>
      </div>
    </div>
  )
}

export default function InterviewDetails() {
  const { id } = useParams()
  const [activeTab, setActiveTab] = useState('Session Overview')

  return (
    <div className="p-6 space-y-5">
      {/* Candidate header */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-5">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
          AR
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-gray-900">Alex Rivera</h1>
            <span className="bg-green-100 text-green-700 text-xs font-bold px-2.5 py-1 rounded-full">Qualified</span>
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span className="flex items-center gap-1.5">
              <span>👤</span> Senior Full Stack Engineer Candidate
            </span>
            <span className="flex items-center gap-1.5">
              <Clock size={13} /> Oct 24, 2023 • 60 mins
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle size={13} className="text-green-500" /> Score: 88/100
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <button className="flex items-center gap-2 border border-gray-200 rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            <Download size={14} /> Export Report
          </button>
          <button className="flex items-center gap-2 border border-gray-200 rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            <Share2 size={14} /> Share
          </button>
          <button className="flex items-center gap-2 bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-semibold hover:bg-blue-700">
            <Play size={13} fill="white" /> Watch Replay
          </button>
        </div>
      </div>

      {/* Skill badges */}
      <div className="grid grid-cols-4 gap-4">
        {skillBadges.map(({ label, value, delta, color }) => {
          const colors = {
            blue: 'text-blue-600 bg-blue-50',
            green: 'text-green-600 bg-green-50',
            purple: 'text-purple-600 bg-purple-50',
            orange: 'text-orange-500 bg-orange-50',
          }
          return (
            <div key={label} className={`rounded-xl px-4 py-3 ${colors[color]}`}>
              <p className="text-xs font-medium text-gray-500 mb-1">{label}</p>
              <div className="flex items-baseline gap-1.5">
                <p className="font-bold text-lg">{value}</p>
                {delta && <span className="text-xs font-semibold text-emerald-600">{delta}</span>}
              </div>
            </div>
          )
        })}
      </div>

      {/* Main content */}
      <div className="grid lg:grid-cols-3 gap-5">
        {/* Left: behavioral timeline + tabs */}
        <div className="lg:col-span-2 space-y-5">
          {/* Behavioral timeline */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-1">
              <div>
                <h2 className="font-semibold text-gray-900">Behavioral Analysis Timeline</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Continuous tracking of engagement and focus signals during the session.
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1"><span className="w-2 h-2 bg-blue-400 rounded-full" /> Engagement</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 bg-indigo-600 rounded-full" /> Focus</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 bg-red-500 rounded-full" /> Risk Signal</span>
              </div>
            </div>
            <div className="h-48 mt-3">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={behavioralData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="engGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#93C5FD" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#93C5FD" stopOpacity={0.05} />
                    </linearGradient>
                    <linearGradient id="focusGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366F1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366F1" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis dataKey="t" tickFormatter={(v) => `${v}m`} tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} interval={9} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #e5e7eb', fontSize: 11 }} />
                  <Area type="monotone" dataKey="engagement" stroke="#93C5FD" strokeWidth={2} fill="url(#engGrad)" dot={false} />
                  <Area type="monotone" dataKey="focus" stroke="#6366F1" strokeWidth={2} fill="url(#focusGrad)" dot={false} />
                  <Area type="monotone" dataKey="risk" stroke="#EF4444" strokeWidth={2} fill="none" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex gap-1 mb-5 border-b border-gray-100 pb-3">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === tab ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {activeTab === 'Session Overview' && (
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-3">Interviewer Summary</h3>
                <p className="text-gray-600 text-sm leading-relaxed mb-5">
                  Alex demonstrated exceptional command over system design principles, particularly in their approach to distributed caching. They successfully implemented the core LRU logic within the first 30 minutes, handling edge cases like concurrent updates and expiration policies. Communication was fluid, though a brief moment of hesitation occurred around minute 40, which coincided with some detected suspicious tab activity. Overall, a strong technical candidate with deep seniority.
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <CheckCircle size={15} className="text-green-500" />
                      <p className="text-sm font-semibold text-gray-900">Strengths</p>
                    </div>
                    <ul className="space-y-1.5">
                      {[
                        'Excellent mental model of async I/O',
                        'Precise explanation of complexity trade-offs',
                        'Clean, idiomatic TypeScript usage',
                      ].map((s) => (
                        <li key={s} className="text-xs text-gray-600 flex items-start gap-1.5">
                          <span className="text-gray-400 mt-0.5">•</span>{s}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="bg-orange-50 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <AlertTriangle size={15} className="text-orange-500" />
                      <p className="text-sm font-semibold text-gray-900">Areas for Review</p>
                    </div>
                    <ul className="space-y-1.5">
                      {[
                        'Minor tab-switching behavior detected',
                        'Large paste event at 38:05 needs validation',
                        'Brief dip in focus during security questions',
                      ].map((s) => (
                        <li key={s} className="text-xs text-gray-600 flex items-start gap-1.5">
                          <span className="text-gray-400 mt-0.5">•</span>{s}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'Coding Details' && (
              <div className="text-center py-8 text-gray-400">
                <Code2 size={40} className="mx-auto mb-3 opacity-40" />
                <p className="text-sm">Coding session recordings and analysis available.</p>
                <Link to="/live-session" className="mt-3 inline-flex items-center gap-1 text-blue-600 text-sm font-medium hover:underline">
                  View Session <ChevronRight size={14} />
                </Link>
              </div>
            )}

            {activeTab === 'Similarity Analysis' && (
              <div className="text-center py-8 text-gray-400">
                <ShieldAlert size={40} className="mx-auto mb-3 opacity-40" />
                <p className="text-sm">Similarity analysis reports for this candidate.</p>
                <Link to="/code-analysis" className="mt-3 inline-flex items-center gap-1 text-blue-600 text-sm font-medium hover:underline">
                  View Analysis <ChevronRight size={14} />
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Right: signals + timeline + competency */}
        <div className="space-y-5">
          {/* AI Signal Analysis */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ShieldAlert size={16} className="text-blue-600" />
                <h2 className="font-semibold text-gray-900">AI Signal Analysis</h2>
              </div>
              <span className="bg-orange-100 text-orange-600 text-xs font-bold px-2 py-0.5 rounded-full">3 Signals</span>
            </div>
            <div className="space-y-3">
              {aiSignals.map((s) => <SignalCard key={s.title} {...s} />)}
            </div>
            <button className="mt-4 text-blue-600 text-sm font-semibold flex items-center gap-1 hover:underline">
              View All Signals <ChevronRight size={14} />
            </button>
          </div>

          {/* Session Timeline */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Session Timeline</h2>
            <div className="space-y-3">
              {timeline.map(({ label, time, flagged, active }) => (
                <div key={label} className="flex items-start gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 mt-0.5 ${flagged ? 'bg-red-500' : active ? 'bg-blue-500' : 'bg-gray-300'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-sm ${flagged ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>{label}</p>
                      <span className="text-xs text-gray-400 flex-shrink-0">{time}</span>
                    </div>
                    {flagged && (
                      <p className="text-xs text-red-500 flex items-center gap-1 mt-0.5">
                        <AlertTriangle size={10} /> Flagged for review
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Competency Profile */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-base">📊</span>
              <h2 className="font-semibold text-gray-900">Competency Profile</h2>
            </div>
            <div className="space-y-3">
              {competency.map(({ label, score }) => (
                <div key={label}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-gray-700">{label}</span>
                    <span className="font-semibold text-gray-900">{score}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600 rounded-full transition-all duration-700"
                      style={{ width: `${score}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <button className="mt-4 w-full text-blue-600 text-sm font-semibold border border-blue-200 rounded-xl py-2 hover:bg-blue-50 transition-colors">
              Detailed Skill Gap Analysis
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-gray-400 pt-2">
        <span className="flex items-center gap-1.5">
          <ShieldAlert size={12} /> Report generated by InterviewLens AI Integrity Engine v2.4.0
        </span>
        <div className="flex gap-4">
          {['Privacy Policy', 'Candidate Rights', 'Help Center ↗'].map((l) => (
            <a key={l} href="#" className="hover:text-gray-600 transition-colors">{l}</a>
          ))}
        </div>
      </div>
    </div>
  )
}
