import React, { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  X, Loader, Copy, Check, Play, AlertTriangle, Search, Mail, CalendarClock, BookOpen, CheckCircle,
} from 'lucide-react'
import { problemsAPI, sessionsAPI, apiErrorMessage } from '../services/api'
import InviteControls from './InviteControls'

const DIFF = {
  Easy:   'bg-emerald-100 text-emerald-700',
  Medium: 'bg-amber-100 text-amber-700',
  Hard:   'bg-red-100 text-red-600',
}

const DURATIONS = [30, 45, 60, 90, 120]

const parseTags = (t) => { try { return JSON.parse(t || '[]') } catch { return [] } }

function CopyField({ label, value }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(value).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <div>
      <p className="text-xs font-semibold text-gray-500 mb-1">{label}</p>
      <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
        <code className="flex-1 text-sm font-mono text-gray-800 truncate">{value}</code>
        <button type="button" onClick={copy} className="text-gray-400 hover:text-gray-700" title="Copy">
          {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
        </button>
      </div>
    </div>
  )
}

/** Create an interview session, email the candidate, then show the invite details. */
export default function NewSessionModal({ onClose, onCreated }) {
  const navigate = useNavigate()
  const [problems, setProblems] = useState(null)
  const [form, setForm] = useState({
    title: '',
    candidate_name: '',
    candidate_email: '',
    candidate_role: '',
    duration_minutes: 60,
    scheduled_at: '',
    send_invite: true,
  })
  const [selected, setSelected] = useState([])
  const [query, setQuery] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [created, setCreated] = useState(null)

  useEffect(() => {
    problemsAPI.list()
      .then(({ data }) => setProblems(data))
      .catch(() => { setProblems([]); setError('Could not load the problem bank.') })
  }, [])

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (problems || []).filter((p) =>
      !q || p.title.toLowerCase().includes(q) || parseTags(p.tags).some((t) => t.toLowerCase().includes(q)) ||
      p.difficulty.toLowerCase() === q)
  }, [problems, query])

  const toggle = (id) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))

  const estMinutes = (problems || [])
    .filter((p) => selected.includes(p.id))
    .reduce((m, p) => m + ({ Easy: 15, Medium: 25, Hard: 40 }[p.difficulty] || 20), 0)

  const submit = async (e) => {
    e.preventDefault()
    if (!selected.length) {
      setError('Pick at least one problem.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const { data } = await sessionsAPI.create({
        title: form.title.trim() || `${form.candidate_role.trim() || 'Technical'} Interview — ${form.candidate_name.trim()}`,
        candidate_name: form.candidate_name.trim(),
        candidate_email: form.candidate_email.trim() || null,
        candidate_role: form.candidate_role.trim() || null,
        duration_minutes: Number(form.duration_minutes) || 60,
        scheduled_at: form.scheduled_at ? new Date(form.scheduled_at).toISOString() : null,
        send_invite: form.send_invite && !!form.candidate_email.trim(),
        problem_ids: selected, // in the order they were picked
      })
      setCreated(data)
      onCreated?.(data)
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not create the session.'))
    } finally {
      setSaving(false)
    }
  }

  const input = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div>
            <h2 className="font-bold text-gray-900 text-lg">
              {created ? 'Interview created' : 'New interview session'}
            </h2>
            {!created && <p className="text-xs text-gray-400">The candidate gets an email with a one-click join link.</p>}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        {created ? (
          <div className="p-6 space-y-4 overflow-y-auto">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                <CheckCircle size={20} className="text-emerald-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">{created.title}</p>
                <p className="text-xs text-gray-500">
                  {created.duration_minutes} min
                  {created.scheduled_at && ` · ${new Date(created.scheduled_at).toLocaleString()}`}
                </p>
              </div>
            </div>
            <CopyField label="Access token" value={created.access_token} />
            {created.candidate_email ? (
              <InviteControls session={created} invite={created.invite} />
            ) : (
              <CopyField label="Candidate login page" value={`${window.location.origin}/candidate/login`} />
            )}
            <div className="flex gap-3 pt-2">
              <button
                onClick={onClose}
                className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Done
              </button>
              <button
                onClick={() => navigate(`/live-session?session=${created.id}`)}
                className="flex-1 bg-blue-600 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-blue-700 flex items-center justify-center gap-2"
              >
                <Play size={13} fill="white" /> Open live session
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="flex flex-col min-h-0">
            <div className="p-6 space-y-5 overflow-y-auto">
              {/* Candidate */}
              <section className="space-y-3">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Candidate</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Full name</label>
                    <input value={form.candidate_name} onChange={set('candidate_name')} required placeholder="Jane Doe" className={input} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Email</label>
                    <input type="email" value={form.candidate_email} onChange={set('candidate_email')} placeholder="jane@example.com" className={input} />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Role</label>
                    <input value={form.candidate_role} onChange={set('candidate_role')} placeholder="Frontend Engineer" className={input} />
                  </div>
                </div>
              </section>

              {/* Session */}
              <section className="space-y-3">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Session</p>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Title</label>
                  <input value={form.title} onChange={set('title')} placeholder="Defaults to role + candidate name" className={input} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Duration</label>
                    <select value={form.duration_minutes} onChange={set('duration_minutes')} className={input}>
                      {DURATIONS.map((d) => <option key={d} value={d}>{d} minutes</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1 flex items-center gap-1">
                      <CalendarClock size={12} /> Scheduled for <span className="font-normal text-gray-400">(optional)</span>
                    </label>
                    <input type="datetime-local" value={form.scheduled_at} onChange={set('scheduled_at')} className={input} />
                  </div>
                </div>
              </section>

              {/* Problems */}
              <section className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">
                    Problems {selected.length > 0 && <span className="text-blue-600 normal-case">· {selected.length} selected · ~{estMinutes} min</span>}
                  </p>
                  <Link to="/problems" onClick={onClose} className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1">
                    <BookOpen size={12} /> Manage problem bank
                  </Link>
                </div>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search by title, tag or difficulty…"
                    className={`${input} pl-9`}
                  />
                </div>
                {problems == null ? (
                  <Loader size={16} className="animate-spin text-gray-400" />
                ) : problems.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    Your problem bank is empty. <Link to="/problems/new" onClick={onClose} className="text-blue-600 font-semibold">Create a problem</Link>
                  </p>
                ) : (
                  <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                    {filtered.map((p) => {
                      const order = selected.indexOf(p.id)
                      return (
                        <label
                          key={p.id}
                          className={`flex items-center gap-3 px-3 py-2 border rounded-lg cursor-pointer transition-colors ${
                            order >= 0 ? 'border-blue-300 bg-blue-50/50' : 'border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          <input type="checkbox" checked={order >= 0} onChange={() => toggle(p.id)} className="sr-only" />
                          <span className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center flex-shrink-0 ${
                            order >= 0 ? 'bg-blue-600 text-white' : 'border-2 border-gray-300'
                          }`}>
                            {order >= 0 ? order + 1 : ''}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate">{p.title}</p>
                            <p className="text-[11px] text-gray-400 truncate">
                              {p.test_case_count} tests{p.hidden_case_count ? ` (${p.hidden_case_count} hidden)` : ''}
                              {parseTags(p.tags).length > 0 && ` · ${parseTags(p.tags).join(', ')}`}
                            </p>
                          </div>
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${DIFF[p.difficulty] || ''}`}>
                            {p.difficulty}
                          </span>
                        </label>
                      )
                    })}
                    {filtered.length === 0 && <p className="text-xs text-gray-400 py-2">No problems match “{query}”.</p>}
                  </div>
                )}
              </section>

              {/* Invite */}
              <label className={`flex items-start gap-3 p-3 rounded-xl border ${form.candidate_email ? 'border-gray-200' : 'border-gray-100 opacity-60'}`}>
                <input
                  type="checkbox"
                  checked={form.send_invite && !!form.candidate_email}
                  disabled={!form.candidate_email}
                  onChange={set('send_invite')}
                  className="w-4 h-4 mt-0.5 rounded border-gray-300 text-blue-600"
                />
                <div>
                  <p className="text-sm font-semibold text-gray-800 flex items-center gap-1.5"><Mail size={13} /> Email the invite to the candidate</p>
                  <p className="text-xs text-gray-500">
                    {form.candidate_email
                      ? 'Includes the schedule, instructions and a one-click join link.'
                      : 'Add the candidate’s email to send an invite.'}
                  </p>
                </div>
              </label>

              {error && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3">
                  <AlertTriangle size={14} className="text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-600">{error}</p>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex-shrink-0">
              <button
                type="submit"
                disabled={saving}
                className="w-full bg-blue-600 text-white font-semibold py-2.5 rounded-xl hover:bg-blue-700 disabled:opacity-60 text-sm flex items-center justify-center gap-2"
              >
                {saving
                  ? <><Loader size={14} className="animate-spin" /> Creating…</>
                  : form.send_invite && form.candidate_email ? 'Create session & send invite' : 'Create session'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
