import React, { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Search, Clock, Play, Users, Mail, MailCheck, Ban, RotateCw, Loader, CalendarClock } from 'lucide-react'
import NewSessionModal from '../components/NewSessionModal'
import { analyticsAPI, sessionsAPI, apiErrorMessage } from '../services/api'

const STATUS = {
  active:    { label: 'Live',      cls: 'bg-green-100 text-green-700' },
  waiting:   { label: 'Waiting',   cls: 'bg-yellow-100 text-yellow-700' },
  scheduled: { label: 'Scheduled', cls: 'bg-blue-100 text-blue-700' },
  completed: { label: 'Completed', cls: 'bg-gray-100 text-gray-600' },
  cancelled: { label: 'Cancelled', cls: 'bg-red-50 text-red-500' },
}
const FILTERS = [
  ['all', 'All'], ['upcoming', 'Upcoming'], ['active', 'Live'], ['completed', 'Completed'], ['cancelled', 'Cancelled'],
]
const matchesFilter = (s, f) =>
  f === 'all' || (f === 'upcoming' ? ['scheduled', 'waiting'].includes(s.status) : s.status === f)

const initialsOf = (name) => (name || 'UN').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()

export default function Interviews() {
  const [showNew, setShowNew] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [sessions, setSessions] = useState([])
  const [risk, setRisk] = useState({})
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)
  const [notice, setNotice] = useState(null)

  useEffect(() => {
    Promise.all([sessionsAPI.list(), analyticsAPI.overview().catch(() => ({ data: {} }))])
      .then(([{ data }, { data: ov }]) => {
        setSessions(data)
        setRisk(ov.per_session || {})
      })
      .catch(() => setNotice({ ok: false, text: 'Could not load interviews.' }))
      .finally(() => setLoading(false))
  }, [reloadKey])

  const replace = (updated) => setSessions((prev) => prev.map((s) => (s.id === updated.id ? { ...s, ...updated } : s)))

  const act = async (s, fn, okText) => {
    setBusyId(s.id)
    setNotice(null)
    try {
      const { data } = await fn(s.id)
      replace(data)
      setNotice({ ok: true, text: typeof okText === 'function' ? okText(data) : okText })
    } catch (err) {
      setNotice({ ok: false, text: apiErrorMessage(err) })
    } finally {
      setBusyId(null)
    }
  }

  const resend = (s) => act(s, sessionsAPI.resendInvite, (d) =>
    d.invite?.sent ? `Invite emailed to ${d.candidate_email}` : 'Email isn’t configured — invite saved to the server outbox.')
  const cancel = (s) => {
    if (window.confirm(`Cancel the interview with ${s.candidate_name}? Their access token will stop working.`)) {
      act(s, sessionsAPI.cancel, 'Interview cancelled')
    }
  }

  const counts = useMemo(() => Object.fromEntries(FILTERS.map(([k]) => [k, sessions.filter((s) => matchesFilter(s, k)).length])), [sessions])

  const q = search.toLowerCase()
  const rows = sessions.filter((s) => matchesFilter(s, filter) && (
    !q || [s.candidate_name, s.candidate_role, s.candidate_email, s.title].some((v) => v?.toLowerCase().includes(q))
  ))

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

      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
          <input
            type="text"
            placeholder="Search name, email, role…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {FILTERS.map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${filter === key ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
            >
              {label} <span className="opacity-60">{counts[key]}</span>
            </button>
          ))}
        </div>
      </div>

      {notice && (
        <div className={`mb-4 text-sm rounded-xl px-4 py-2.5 border ${notice.ok ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-600'}`}>
          {notice.text}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center py-12">
            <Users size={48} className="text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {sessions.length ? 'No interviews match' : 'No interviews yet'}
            </h3>
            {!sessions.length && (
              <button
                onClick={() => setShowNew(true)}
                className="inline-flex items-center gap-2 bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-semibold hover:bg-blue-700"
              >
                <Play size={14} fill="white" /> Start New Session
              </button>
            )}
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {['Candidate', 'When', 'Invite', 'Score', 'Risk', 'Status', ''].map((h) => (
                  <th key={h} className="text-left text-xs font-semibold text-gray-400 px-5 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rows.map((s) => {
                const st = STATUS[s.status] || STATUS.scheduled
                const r = risk[s.id] || {}
                const open = !['completed', 'cancelled'].includes(s.status)
                const when = s.started_at || s.scheduled_at || s.created_at
                return (
                  <tr key={s.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {initialsOf(s.candidate_name)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{s.candidate_name || 'Unknown Candidate'}</p>
                          <p className="text-xs text-gray-400 truncate">{s.candidate_role || s.title}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="flex items-center gap-1.5 text-sm text-gray-500 whitespace-nowrap">
                        {s.scheduled_at && !s.started_at ? <CalendarClock size={13} className="text-blue-500" /> : <Clock size={13} className="text-gray-400" />}
                        {new Date(when).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      {!s.candidate_email ? (
                        <span className="text-xs text-gray-300">No email</span>
                      ) : s.invite_sent_at ? (
                        <span className="flex items-center gap-1 text-xs text-emerald-600" title={new Date(s.invite_sent_at).toLocaleString()}>
                          <MailCheck size={13} /> Sent
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-gray-400"><Mail size={13} /> Not sent</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      {s.final_score != null
                        ? <span className="text-sm font-bold text-gray-900">{s.final_score}/100</span>
                        : <span className="text-xs text-gray-400">—</span>}
                    </td>
                    <td className="px-5 py-4">
                      {r.high ? <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-red-100 text-red-600">High · {r.high}</span>
                        : r.medium ? <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-orange-100 text-orange-600">Medium · {r.medium}</span>
                        : <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-green-100 text-green-700">Clean</span>}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${st.cls}`}>
                        {s.status === 'active' && <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />}
                        {st.label}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-1.5">
                        {busyId === s.id && <Loader size={13} className="animate-spin text-gray-400" />}
                        {open && s.candidate_email && (
                          <button onClick={() => resend(s)} disabled={busyId === s.id} title="Resend invite email"
                            className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50">
                            <RotateCw size={14} />
                          </button>
                        )}
                        {open && (
                          <button onClick={() => cancel(s)} disabled={busyId === s.id} title="Cancel interview"
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50">
                            <Ban size={14} />
                          </button>
                        )}
                        <Link to={`/interviews/${s.id}`} className="text-xs font-semibold text-blue-600 hover:underline px-1">
                          Details
                        </Link>
                        {open && (
                          <Link to={`/live-session?session=${s.id}`} className="bg-blue-600 text-white text-xs font-semibold px-2.5 py-1 rounded-lg hover:bg-blue-700">
                            {s.status === 'active' ? 'Join' : 'Open'}
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
      {showNew && (
        <NewSessionModal
          onClose={() => setShowNew(false)}
          onCreated={() => setReloadKey((k) => k + 1)}
        />
      )}
    </div>
  )
}
