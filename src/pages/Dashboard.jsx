import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Users, TrendingUp, CheckCircle, AlertTriangle,
  Calendar, Play, ArrowUpRight, ArrowDownRight,
  Clock, MoreHorizontal, Filter, RotateCcw, Activity,
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'

const weeklyData = [
  { day: 'Mon', interviews: 8, quality: 7 },
  { day: 'Tue', interviews: 12, quality: 7.5 },
  { day: 'Wed', interviews: 14, quality: 8 },
  { day: 'Thu', interviews: 22, quality: 8.2 },
  { day: 'Fri', interviews: 18, quality: 7.8 },
  { day: 'Sat', interviews: 10, quality: 7.2 },
  { day: 'Sun', interviews: 7, quality: 6.8 },
]

const statCards = [
  {
    label: 'TOTAL INTERVIEWS',
    value: '124',
    delta: '+12%',
    up: true,
    icon: Users,
    color: 'blue',
  },
  {
    label: 'AVG. SCORE',
    value: '7.8/10',
    delta: '+2.4%',
    up: true,
    icon: TrendingUp,
    color: 'green',
  },
  {
    label: 'COMPLETED TODAY',
    value: '18',
    delta: '-3%',
    up: false,
    icon: CheckCircle,
    color: 'orange',
  },
  {
    label: 'RISK SIGNALS',
    value: '4',
    delta: '-50%',
    up: true,
    icon: AlertTriangle,
    color: 'red',
  },
]

const sessions = [
  {
    name: 'Alex Rivera',
    role: 'Senior Fullstack Engineer',
    time: '10:30 AM',
    status: 'Live',
    risk: 'Clean session',
    riskLevel: 'clean',
    avatar: 'AR',
    id: '1',
  },
  {
    name: 'Jordan Smith',
    role: 'Backend Developer (Node.js)',
    time: '11:15 AM',
    status: 'Live',
    risk: 'Suspicious Activity',
    riskLevel: 'suspicious',
    avatar: 'JS',
    id: '2',
  },
  {
    name: 'Taylor Kim',
    role: 'Frontend Lead',
    time: '1:00 PM',
    status: 'Waiting',
    risk: 'Pre-check completed',
    riskLevel: 'clean',
    avatar: 'TK',
    id: '3',
  },
]

const recentActivity = [
  {
    dot: 'blue',
    title: 'Score finalized',
    desc: 'Sarah Jenkins scored Alex Rivera as 8.5/10',
    time: '2m ago',
  },
  {
    dot: 'blue',
    title: 'Risk Signal Detected',
    desc: 'InterviewLens AI flagged Suspicious Activity in Jordan Smith\'s session',
    time: '15m ago',
  },
  {
    dot: 'blue',
    title: 'New Session Started',
    desc: 'Taylor Kim joined the waiting room',
    time: '45m ago',
  },
  {
    dot: 'blue',
    title: 'Interview Scheduled',
    desc: 'HR Team set up a panel for Jamie Vance',
    time: '2h ago',
  },
]

const similarityScans = [
  { name: 'Code Comparison v2.4', date: 'Oct 12, 2023', score: '94%', label: 'Safe', safe: true },
  { name: 'External Repository Scan', date: 'Oct 11, 2023', score: '12%', label: 'Warning', safe: false },
]

function StatCard({ label, value, delta, up, icon: Icon, color }) {
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
        <span className={`text-xs font-semibold flex items-center gap-0.5 ${up ? 'text-emerald-600' : 'text-red-500'}`}>
          {up ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
          {delta}
        </span>
      </div>
      <div>
        <p className="text-2xl font-extrabold text-gray-900">{value}</p>
        <p className="text-xs text-gray-400 font-medium mt-0.5 tracking-wide">{label}</p>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('All')

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Interviewer Dashboard</h1>
          <p className="text-gray-500 text-sm mt-0.5">Monitor live technical assessments and analyze candidate performance.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 border border-gray-200 rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            <Calendar size={15} />
            Schedule
          </button>
          <Link
            to="/live-session"
            className="flex items-center gap-2 bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-semibold hover:bg-blue-700 transition-colors"
          >
            <Play size={14} fill="white" />
            Start Live Session
          </Link>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <StatCard key={card.label} {...card} />
        ))}
      </div>

      {/* Charts + Recent Activity */}
      <div className="grid lg:grid-cols-3 gap-5">
        {/* Weekly Performance Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-1">
            <div>
              <h2 className="font-semibold text-gray-900">Weekly Performance</h2>
              <p className="text-xs text-gray-400 mt-0.5">Average candidate quality vs. interview volume</p>
            </div>
            <div className="flex gap-2">
              {['Interviews', 'Quality'].map((tab) => (
                <button key={tab} className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${tab === 'Interviews' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                  {tab}
                </button>
              ))}
            </div>
          </div>
          <div className="h-56 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorInterviews" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorQuality" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366F1" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 10, border: '1px solid #e5e7eb', fontSize: 12 }}
                  cursor={{ stroke: '#e5e7eb' }}
                />
                <Area type="monotone" dataKey="interviews" stroke="#2563EB" strokeWidth={2.5} fill="url(#colorInterviews)" dot={false} />
                <Area type="monotone" dataKey="quality" stroke="#6366F1" strokeWidth={2} fill="url(#colorQuality)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Recent Activity</h2>
            <RotateCcw size={15} className="text-gray-400 cursor-pointer hover:text-gray-600" />
          </div>
          <div className="space-y-4">
            {recentActivity.map(({ title, desc, time }, i) => (
              <div key={i} className="flex gap-3">
                <div className="mt-1 flex-shrink-0">
                  <div className="w-2 h-2 bg-blue-600 rounded-full" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-gray-800">{title}</p>
                    <span className="text-xs text-gray-400 flex-shrink-0 ml-2">{time}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
          <button className="mt-5 text-blue-600 text-sm font-semibold hover:underline">
            View Audit Logs
          </button>
        </div>
      </div>

      {/* Active Sessions */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-semibold text-gray-900">Active Sessions</h2>
            <p className="text-xs text-gray-400 mt-0.5">Real-time monitoring of current interviews</p>
          </div>
          <div className="flex items-center gap-2">
            {['All', 'Live', 'Risk Alerts'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${activeTab === tab ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
              >
                {tab}
              </button>
            ))}
            <button className="flex items-center gap-1.5 border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50">
              <Filter size={12} />
              Filter
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                {['Candidate', 'Start Time', 'Status', 'Risk Signal', 'Actions'].map((h) => (
                  <th key={h} className="text-left text-xs font-semibold text-gray-400 pb-3 pr-4">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {sessions.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="py-4 pr-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {s.avatar}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{s.name}</p>
                        <p className="text-xs text-gray-400">{s.role}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 pr-4">
                    <div className="flex items-center gap-1.5 text-sm text-gray-600">
                      <Clock size={13} className="text-gray-400" />
                      {s.time}
                    </div>
                  </td>
                  <td className="py-4 pr-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${s.status === 'Live' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {s.status === 'Live' && <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />}
                      {s.status}
                    </span>
                  </td>
                  <td className="py-4 pr-4">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${s.riskLevel === 'suspicious' ? 'text-orange-500' : 'text-emerald-600'}`}>
                      {s.riskLevel === 'suspicious' ? <AlertTriangle size={13} /> : <CheckCircle size={13} />}
                      {s.risk}
                    </span>
                  </td>
                  <td className="py-4">
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/interviews/${s.id}`}
                        className="text-xs font-semibold text-gray-700 hover:text-blue-600 transition-colors"
                      >
                        View Detail
                      </Link>
                      <Link
                        to="/live-session"
                        className="bg-blue-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Join Session
                      </Link>
                      <button className="text-gray-400 hover:text-gray-600 p-1">
                        <MoreHorizontal size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-400">Showing 3 of 12 active interview sessions</p>
          <div className="flex gap-2">
            <button className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50">Previous</button>
            <button className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50">Next</button>
          </div>
        </div>
      </div>

      {/* Similarity Analysis + Quick Insights */}
      <div className="grid lg:grid-cols-2 gap-5">
        {/* Similarity Analysis */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-gray-900">Similarity Analysis</h2>
              <p className="text-xs text-gray-400 mt-0.5">Automated plagiarism and AI detection scans</p>
            </div>
            <ArrowUpRight size={16} className="text-gray-400" />
          </div>
          <div className="space-y-3">
            {similarityScans.map(({ name, date, score, label, safe }) => (
              <div key={name} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-blue-600 text-base">📄</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800">{name}</p>
                  <p className="text-xs text-gray-400">{date}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-800">{score}</p>
                  <p className="text-xs text-gray-400">Match Score</p>
                </div>
                <span className={`px-2 py-1 rounded-md text-xs font-bold ${safe ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                  {label}
                </span>
              </div>
            ))}
          </div>
          <Link
            to="/code-analysis"
            className="mt-4 w-full flex items-center justify-center py-2.5 border-2 border-dashed border-gray-200 rounded-xl text-sm font-medium text-gray-500 hover:border-blue-300 hover:text-blue-600 transition-colors"
          >
            Run New Similarity Scan
          </Link>
        </div>

        {/* Quick Insights */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-gray-900">Quick Insights</h2>
              <p className="text-xs text-gray-400 mt-0.5">Platform performance and system health</p>
            </div>
            <Activity size={16} className="text-green-500" />
          </div>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-gray-500 font-medium">SYSTEM UPTIME</span>
                <span className="font-bold text-gray-900">99.9%</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-green-500 rounded-full" style={{ width: '99.9%' }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-gray-500 font-medium">API RESPONSE TIME</span>
                <span className="font-bold text-gray-900">42MS</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: '30%' }} />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-6">
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs text-gray-400 font-medium mb-1">Queue Size</p>
              <p className="text-xl font-extrabold text-gray-900">2 Candidates</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs text-gray-400 font-medium mb-1">Active Rooms</p>
              <p className="text-xl font-extrabold text-gray-900">8 / 20</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
