import React from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'
import { TrendingUp, Users, CheckCircle, AlertTriangle } from 'lucide-react'

const monthlyData = [
  { month: 'Jul', interviews: 42, passed: 28, flagged: 6 },
  { month: 'Aug', interviews: 58, passed: 38, flagged: 9 },
  { month: 'Sep', interviews: 51, passed: 34, flagged: 7 },
  { month: 'Oct', interviews: 74, passed: 52, flagged: 11 },
  { month: 'Nov', interviews: 67, passed: 48, flagged: 8 },
  { month: 'Dec', interviews: 89, passed: 63, flagged: 14 },
]

const scoreDistribution = [
  { range: '0-20', count: 4 },
  { range: '21-40', count: 8 },
  { range: '41-60', count: 15 },
  { range: '61-80', count: 32 },
  { range: '81-100', count: 28 },
]

export default function Insights() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Insights</h1>
        <p className="text-gray-500 text-sm mt-0.5">Platform-wide analytics and hiring trends</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Interviews (YTD)', value: '381', icon: Users, color: 'blue', delta: '+18%' },
          { label: 'Avg. Score', value: '76.4', icon: TrendingUp, color: 'green', delta: '+3.2%' },
          { label: 'Pass Rate', value: '68%', icon: CheckCircle, color: 'emerald', delta: '+5%' },
          { label: 'Risk Signals', value: '55', icon: AlertTriangle, color: 'red', delta: '-12%' },
        ].map(({ label, value, icon: Icon, color, delta }) => (
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
            <span className="text-xs font-semibold text-emerald-600 mt-1 block">{delta}</span>
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
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #e5e7eb', fontSize: 12 }} />
                <Bar dataKey="interviews" fill="#BFDBFE" radius={[4, 4, 0, 0]} />
                <Bar dataKey="passed" fill="#2563EB" radius={[4, 4, 0, 0]} />
                <Bar dataKey="flagged" fill="#FCA5A5" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Score distribution */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-900 mb-1">Score Distribution</h2>
          <p className="text-xs text-gray-400 mb-4">Candidate score breakdown across all sessions</p>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={scoreDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="range" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #e5e7eb', fontSize: 12 }} />
                <Bar dataKey="count" fill="#2563EB" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}
