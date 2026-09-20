import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, Filter, Clock, CheckCircle, AlertTriangle, Play } from 'lucide-react'

const interviews = [
  { id: '1', name: 'Alex Rivera', role: 'Senior Full Stack Engineer', date: 'Oct 24, 2023', score: 88, status: 'Completed', risk: 'Medium', avatar: 'AR' },
  { id: '2', name: 'Jordan Smith', role: 'Backend Developer (Node.js)', date: 'Oct 23, 2023', score: 74, status: 'Completed', risk: 'High', avatar: 'JS' },
  { id: '3', name: 'Taylor Kim', role: 'Frontend Lead', date: 'Oct 22, 2023', score: 91, status: 'Completed', risk: 'Low', avatar: 'TK' },
  { id: '4', name: 'Marcus Richardson', role: 'Senior Backend Engineer', date: 'Oct 21, 2023', score: null, status: 'Live', risk: 'Low', avatar: 'MR' },
  { id: '5', name: 'Priya Sharma', role: 'ML Engineer', date: 'Oct 20, 2023', score: 82, status: 'Completed', risk: 'Low', avatar: 'PS' },
  { id: '6', name: 'David Chen', role: 'DevOps Engineer', date: 'Oct 19, 2023', score: 67, status: 'Completed', risk: 'Medium', avatar: 'DC' },
]

const riskColors = {
  Low: 'bg-green-100 text-green-700',
  Medium: 'bg-orange-100 text-orange-600',
  High: 'bg-red-100 text-red-600',
}

export default function Interviews() {
  const [search, setSearch] = useState('')

  const filtered = interviews.filter(
    (i) =>
      i.name.toLowerCase().includes(search.toLowerCase()) ||
      i.role.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Interviews</h1>
          <p className="text-gray-500 text-sm mt-0.5">All technical assessment sessions</p>
        </div>
        <Link
          to="/live-session"
          className="flex items-center gap-2 bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-semibold hover:bg-blue-700"
        >
          <Play size={14} fill="white" /> Start New Session
        </Link>
      </div>

      {/* Search + filter */}
      <div className="flex items-center gap-3 mb-5">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
          <input
            type="text"
            placeholder="Search interviews..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">
          <Filter size={14} /> Filter
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              {['Candidate', 'Role', 'Date', 'Score', 'Risk', 'Status', 'Actions'].map((h) => (
                <th key={h} className="text-left text-xs font-semibold text-gray-400 px-5 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map((interview) => (
              <tr key={interview.id} className="hover:bg-gray-50/60 transition-colors">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {interview.avatar}
                    </div>
                    <span className="text-sm font-semibold text-gray-900">{interview.name}</span>
                  </div>
                </td>
                <td className="px-5 py-4 text-sm text-gray-600">{interview.role}</td>
                <td className="px-5 py-4">
                  <span className="flex items-center gap-1.5 text-sm text-gray-500">
                    <Clock size={13} className="text-gray-400" /> {interview.date}
                  </span>
                </td>
                <td className="px-5 py-4">
                  {interview.score !== null ? (
                    <span className="text-sm font-bold text-gray-900">{interview.score}/100</span>
                  ) : (
                    <span className="text-xs text-gray-400">In progress</span>
                  )}
                </td>
                <td className="px-5 py-4">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${riskColors[interview.risk]}`}>
                    {interview.risk}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${interview.status === 'Live' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                    {interview.status === 'Live' && <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />}
                    {interview.status}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/interviews/${interview.id}`}
                      className="text-xs font-semibold text-blue-600 hover:underline"
                    >
                      View Details
                    </Link>
                    {interview.status === 'Live' && (
                      <Link
                        to="/live-session"
                        className="bg-blue-600 text-white text-xs font-semibold px-2.5 py-1 rounded-lg hover:bg-blue-700"
                      >
                        Join
                      </Link>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
