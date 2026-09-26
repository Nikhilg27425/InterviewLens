import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Search, Filter, Clock, CheckCircle, AlertTriangle, Play, Users } from 'lucide-react'
import NewSessionModal from '../components/NewSessionModal'
import { sessionsAPI } from '../services/api'

const riskColors = {
  Low: 'bg-green-100 text-green-700',
  Medium: 'bg-orange-100 text-orange-600',
  High: 'bg-red-100 text-red-600',
}

export default function Interviews() {
  const [showNew, setShowNew] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [search, setSearch] = useState('')
  const [interviews, setInterviews] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchInterviews = async () => {
      try {
        const { data } = await sessionsAPI.list()
        
        // Transform sessions for display
        const transformedInterviews = data.map(s => ({
          id: s.id,
          name: s.candidate_name || 'Unknown Candidate',
          role: s.candidate_role || 'Candidate',
          date: s.created_at 
            ? new Date(s.created_at).toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric' 
              })
            : '—',
          score: s.final_score || null,
          status: s.status === 'active' 
            ? 'Live' 
            : s.status === 'completed' 
              ? 'Completed'
              : s.status === 'waiting'
                ? 'Waiting'
                : 'Scheduled',
          risk: 'Low', // TODO: Calculate from signals
          avatar: (s.candidate_name || 'UN')
            .split(' ')
            .map(w => w[0])
            .join('')
            .slice(0, 2)
            .toUpperCase(),
        }))
        
        setInterviews(transformedInterviews)
        setLoading(false)
      } catch (error) {
        console.error('Failed to fetch interviews:', error)
        setLoading(false)
      }
    }

    fetchInterviews()
  }, [reloadKey])

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
        <button
            onClick={() => setShowNew(true)}
            className="flex items-center gap-2 bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-semibold hover:bg-blue-700"
          >
          <Play size={14} fill="white" /> Start New Session
        </button>
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
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-500">Loading interviews...</p>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Users size={48} className="text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {search ? 'No interviews found' : 'No interviews yet'}
              </h3>
              <p className="text-gray-500 text-sm mb-4">
                {search 
                  ? 'Try adjusting your search terms' 
                  : 'Create your first interview session to get started'
                }
              </p>
              {!search && (
                <button
            onClick={() => setShowNew(true)}
            className="inline-flex items-center gap-2 bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-semibold hover:bg-blue-700"
          >
                  <Play size={14} fill="white" />
                  Start New Session
                </button>
              )}
            </div>
          </div>
        ) : (
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
                      <span className="text-xs text-gray-400">Not scored</span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${riskColors[interview.risk]}`}>
                      {interview.risk}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${
                      interview.status === 'Live' 
                        ? 'bg-green-100 text-green-700' 
                        : interview.status === 'Waiting'
                          ? 'bg-yellow-100 text-yellow-700'
                          : interview.status === 'Scheduled'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-600'
                    }`}>
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
                          to={`/live-session?session=${interview.id}`}
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
        )}
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
