import React, { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { TrendingUp, Users, CheckCircle, AlertTriangle } from 'lucide-react'
import { analyticsAPI } from '../services/api'

export default function Insights() {
  const [overview, setOverview] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    analyticsAPI.overview()
      .then(({ data }) => setOverview(data))
      .catch(() => setError('Could not load insights.'))
  }, [])

  const monthlyData = overview?.monthly || []
  const scoreDistribution = overview?.score_distribution || []

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Insights</h1>
        <p className="text-gray-500 text-sm mt-0.5">Hiring trends across all of your interviews</p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Interviews', value: overview?.total_interviews ?? '—', icon: Users, color: 'blue', hint: overview ? `${overview.completed} completed` : '' },
          { label: 'Avg. Score', value: overview?.avg_score ?? '—', icon: TrendingUp, color: 'green', hint: 'of scored interviews' },
          { label: 'Pass Rate', value: overview?.pass_rate != null ? `${overview.pass_rate}%` : '—', icon: CheckCircle, color: 'emerald', hint: 'final score ≥ 70' },
          { label: 'High-Risk Signals', value: overview?.high_risk_signals ?? '—', icon: AlertTriangle, color: 'red', hint: overview ? `${overview.flagged_sessions} flagged sessions` : '' },
        ].map(({ label, value, icon: Icon, color, hint }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${
              color === 'blue' ? 'bg-blue-50 text-blue-600' :
              color === 'green' ? 'bg-green-50 text-green-600' :
              color === 'emerald' ? 'bg-emerald-50 text-emerald-600' :
              'bg-red-50 text-red-500'
            }`}>
              <Icon size={17} />
            </div>
            <p className="text-2xl font-extrabold text-gray-900">{value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{label}</p>
            <span className="text-xs text-gray-400 mt-1 block">{hint}</span>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* Monthly volume */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-900 mb-1">Monthly Interview Volume</h2>
          <p className="text-xs text-gray-400 mb-4">Interviews conducted, passed, and flagged per month</p>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #e5e7eb', fontSize: 12 }} />
                <Bar dataKey="interviews" name="Interviews" fill="#BFDBFE" radius={[4, 4, 0, 0]} />
                <Bar dataKey="passed" name="Passed" fill="#2563EB" radius={[4, 4, 0, 0]} />
                <Bar dataKey="flagged" name="Flagged" fill="#FCA5A5" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Score distribution */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-900 mb-1">Score Distribution</h2>
          <p className="text-xs text-gray-400 mb-4">Final scores you've given, across all sessions</p>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={scoreDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="range" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #e5e7eb', fontSize: 12 }} />
                <Bar dataKey="count" name="Candidates" fill="#2563EB" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}
