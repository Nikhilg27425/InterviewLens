import React, { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Users, TrendingUp, CheckCircle, AlertTriangle,
  Play, Clock, ShieldAlert, ChevronRight,
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import NewSessionModal from '../components/NewSessionModal'
import { analyticsAPI, sessionsAPI } from '../services/api'

const STATUS_LABEL = {
  active: 'Live', waiting: 'Waiting', scheduled: 'Scheduled', completed: 'Completed', cancelled: 'Cancelled',
}
const TABS = ['All', 'Live', 'Risk Alerts']

const initialsOf = (name) =>
  (name || 'UN').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()

function StatCard({ label, value, hint, icon: Icon, color }) {
  const colorMap = {
    blue: 'text-blue-600 bg-blue-50',
    green: 'text-emerald-600 bg-emerald-50',
    orange: 'text-orange-500 bg-orange-50',
    red: 'text-red-500 bg-red-50',
  }
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${colorMap[color]}`}>
          <Icon size={17} />
        </div>
        {hint && <span className="text-xs text-gray-400">{hint}</span>}
      </div>
      <div>
        <p className="text-2xl font-extrabold text-gray-900">{value}</p>
        <p className="text-xs text-gray-400 font-medium mt-0.5 tracking-wide">{label}</p>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [showNew, setShowNew] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [activeTab, setActiveTab] = useState('All')
  const [sessions, setSessions] = useState([])
  const [overview, setOverview] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setError('')
    Promise.all([sessionsAPI.list(), analyticsAPI.overview()])
      .then(([{ data: list }, { data: ov }]) => {
        setSessions(list)
        setOverview(ov)
      })
      .catch(() => setError('Could not load your sessions. Is the backend running?'))
      .finally(() => setLoading(false))
  }, [reloadKey])

  const riskFor = (id) => overview?.per_session?.[id] || { high: 0, medium: 0, low: 0 }

  const rows = sessions
    .filter((s) => activeTab !== 'Live' || s.status === 'active' || s.status === 'waiting')
    .filter((s) => activeTab !== 'Risk Alerts' || riskFor(s.id).high > 0)

  // Interviews created per day over the last 7 days
  const weekly = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const day = new Date()
    day.setHours(0, 0, 0, 0)
    day.setDate(day.getDate() - (6 - i))
    const same = sessions.filter((s) => new Date(s.created_at).toDateString() === day.toDateString())
    return {
      day: day.toLocaleDateString('en-US', { weekday: 'short' }),
      interviews: same.length,
      completed: same.filter((s) => s.status === 'completed').length,
    }
  }), [sessions])

  const today = new Date().toDateString()
  const completedToday = sessions.filter((s) => s.ended_at && new Date(s.ended_at).toDateString() === today).length
  const counts = (status) => sessions.filter((s) => s.status === status).length
  const needsReview = sessions.filter((s) => riskFor(s.id).high > 0).slice(0, 4)
  const lastEvent = (s) => new Date(s.ended_at || s.started_at || s.created_at)
  const recent = [...sessions].sort((a, b) => lastEvent(b) - lastEvent(a)).slice(0, 5)

  const stats = [
    { label: 'TOTAL INTERVIEWS', value: sessions.length, icon: Users, color: 'blue', hint: `${counts('completed')} completed` },
    { label: 'AVG. SCORE', value: overview?.avg_score != null ? `${overview.avg_score}/100` : '—', icon: TrendingUp, color: 'green', hint: overview?.pass_rate != null ? `${overview.pass_rate}% pass` : null },
    { label: 'COMPLETED TODAY', value: completedToday, icon: CheckCircle, color: 'orange' },
    { label: 'HIGH-RISK SIGNALS', value: overview?.high_risk_signals ?? 0, icon: AlertTriangle, color: 'red', hint: overview ? `${overview.flagged_sessions} sessions` : null },
  ]

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Interviewer Dashboard</h1>
          <p className="text-gray-500 text-sm mt-0.5">Monitor live technical assessments and analyze candidate performance.</p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-2 bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-semibold hover:bg-blue-700 transition-colors"
        >
          <Play size={14} fill="white" />
          Start Live Session
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600">
          <AlertTriangle size={15} /> {error}
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((card) => <StatCard key={card.label} {...card} />)}
      </div>

      {/* Chart + Recent Activity */}
      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-5">
          <div>
            <h2 className="font-semibold text-gray-900">This Week</h2>
            <p className="text-xs text-gray-400 mt-0.5">Interviews created vs. completed, last 7 days</p>
          </div>
          <div className="h-56 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weekly} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorInterviews" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #e5e7eb', fontSize: 12 }} cursor={{ stroke: '#e5e7eb' }} />
                <Area type="monotone" dataKey="interviews" name="Created" stroke="#2563EB" strokeWidth={2.5} fill="url(#colorInterviews)" dot={false} />
                <Area type="monotone" dataKey="completed" name="Completed" stroke="#10B981" strokeWidth={2} fill="url(#colorCompleted)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Recent Activity</h2>
          {recent.length === 0 ? (
            <p className="text-sm text-gray-400">Nothing yet.</p>
          ) : (
            <div className="space-y-4">
              {recent.map((s) => {
                const what = s.ended_at ? 'Interview completed' : s.started_at ? 'Interview started' : 'Interview created'
                return (
                  <Link key={s.id} to={`/interviews/${s.id}`} className="flex gap-3 group">
                    <div className="mt-1.5 w-2 h-2 bg-blue-600 rounded-full flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-gray-800 group-hover:text-blue-600">{what}</p>
                        <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
                          {lastEvent(s).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 truncate">{s.candidate_name || 'Candidate'} · {s.title}</p>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Sessions table */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-semibold text-gray-900">Sessions</h2>
            <p className="text-xs text-gray-400 mt-0.5">Live monitoring and recent interviews</p>
          </div>
          <div className="flex items-center gap-2">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${activeTab === tab ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : rows.length === 0 ? (
            <div className="text-center py-12">
              <Users size={48} className="text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {sessions.length ? 'No sessions match this filter' : 'No sessions yet'}
              </h3>
              {!sessions.length && (
                <>
                  <p className="text-gray-500 text-sm mb-4">Create your first interview session to get started</p>
                  <button
                    onClick={() => setShowNew(true)}
                    className="inline-flex items-center gap-2 bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-semibold hover:bg-blue-700"
                  >
                    <Play size={14} fill="white" /> Create Session
                  </button>
                </>
              )}
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Candidate', 'Start Time', 'Status', 'Risk Signal', 'Actions'].map((h) => (
                    <th key={h} className="text-left text-xs font-semibold text-gray-400 pb-3 pr-4">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rows.map((s) => {
                  const status = STATUS_LABEL[s.status] || s.status
                  const risk = riskFor(s.id)
                  const at = s.started_at || s.scheduled_at
                  return (
                    <tr key={s.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-4 pr-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                            {initialsOf(s.candidate_name)}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{s.candidate_name || 'Unknown Candidate'}</p>
                            <p className="text-xs text-gray-400">{s.candidate_role || s.title}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 pr-4">
                        <div className="flex items-center gap-1.5 text-sm text-gray-600">
                          <Clock size={13} className="text-gray-400" />
                          {at ? new Date(at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                        </div>
                      </td>
                      <td className="py-4 pr-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                          status === 'Live' ? 'bg-green-100 text-green-700'
                            : status === 'Waiting' ? 'bg-yellow-100 text-yellow-700'
                            : status === 'Scheduled' ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}>
                          {status === 'Live' && <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />}
                          {status}
                        </span>
                      </td>
                      <td className="py-4 pr-4">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                          risk.high ? 'text-red-500' : risk.medium ? 'text-orange-500' : 'text-emerald-600'
                        }`}>
                          {risk.high || risk.medium ? <AlertTriangle size={13} /> : <CheckCircle size={13} />}
                          {risk.high ? `${risk.high} high-risk signal${risk.high > 1 ? 's' : ''}`
                            : risk.medium ? `${risk.medium} medium-risk signal${risk.medium > 1 ? 's' : ''}`
                            : 'Clean session'}
                        </span>
                      </td>
                      <td className="py-4">
                        <div className="flex items-center gap-2">
                          <Link to={`/interviews/${s.id}`} className="text-xs font-semibold text-gray-700 hover:text-blue-600 transition-colors">
                            View Detail
                          </Link>
                          {!['completed', 'cancelled'].includes(s.status) && (
                            <Link
                              to={`/live-session?session=${s.id}`}
                              className="bg-blue-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors"
                            >
                              {s.status === 'active' ? 'Join Session' : 'Open'}
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Needs review + pipeline */}
      <div className="grid lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="mb-4">
            <h2 className="font-semibold text-gray-900">Needs Review</h2>
            <p className="text-xs text-gray-400 mt-0.5">Sessions with high-risk proctoring signals</p>
          </div>
          {needsReview.length === 0 ? (
            <p className="text-sm text-gray-400">No flagged sessions.</p>
          ) : (
            <div className="space-y-3">
              {needsReview.map((s) => (
                <Link key={s.id} to={`/interviews/${s.id}`} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100">
                  <ShieldAlert size={18} className="text-red-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{s.candidate_name || 'Candidate'}</p>
                    <p className="text-xs text-gray-400 truncate">{s.title}</p>
                  </div>
                  <span className="px-2 py-1 rounded-md text-xs font-bold bg-red-100 text-red-600">
                    {riskFor(s.id).high} high
                  </span>
                  <ChevronRight size={14} className="text-gray-300" />
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="mb-4">
            <h2 className="font-semibold text-gray-900">Pipeline</h2>
            <p className="text-xs text-gray-400 mt-0.5">Where your interviews stand right now</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              ['Live now', counts('active')],
              ['Candidates waiting', counts('waiting')],
              ['Scheduled', counts('scheduled')],
              ['Completed', counts('completed')],
            ].map(([label, value]) => (
              <div key={label} className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-400 font-medium mb-1">{label}</p>
                <p className="text-xl font-extrabold text-gray-900">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showNew && (
        <NewSessionModal
          onClose={() => setShowNew(false)}
          onCreated={() => setReloadKey((k) => k + 1)}
        />
      )}
    </div>
  )
}
