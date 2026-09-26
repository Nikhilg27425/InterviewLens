import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, Loader, Copy, Check, Play, AlertTriangle } from 'lucide-react'
import { problemsAPI, sessionsAPI } from '../services/api'

const DIFF = {
  Easy:   'bg-emerald-100 text-emerald-700',
  Medium: 'bg-amber-100 text-amber-700',
  Hard:   'bg-red-100 text-red-600',
}

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
        <button onClick={copy} className="text-gray-400 hover:text-gray-700" title="Copy">
          {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
        </button>
      </div>
    </div>
  )
}

/** Create an interview session, then show the invite details to share. */
export default function NewSessionModal({ onClose, onCreated }) {
  const navigate = useNavigate()
  const [problems, setProblems] = useState([])
  const [form, setForm] = useState({
    title: '',
    candidate_name: '',
    candidate_email: '',
    candidate_role: '',
    duration_minutes: 60,
  })
  const [selected, setSelected] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [created, setCreated] = useState(null)

  useEffect(() => {
    problemsAPI.list()
      .then(({ data }) => {
        setProblems(data)
        setSelected(data.map((p) => p.id))
      })
      .catch(() => setError('Could not load the problem bank.'))
  }, [])

  const toggle = (id) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))

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
        ...form,
        title: form.title || `${form.candidate_role || 'Technical'} Interview — ${form.candidate_name}`,
        candidate_email: form.candidate_email || null,
        candidate_role: form.candidate_role || null,
        duration_minutes: Number(form.duration_minutes) || 60,
        // keep the bank's order
        problem_ids: problems.filter((p) => selected.includes(p.id)).map((p) => p.id),
      })
      setCreated(data)
      onCreated?.(data)
    } catch (err) {
      const detail = err.response?.data?.detail
      setError(Array.isArray(detail) ? detail.map((d) => d.msg).join('. ') : detail || 'Could not create the session.')
    } finally {
      setSaving(false)
    }
  }

  const field = (key, label, props = {}) => (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>
      <input
        value={form[key]}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        {...props}
      />
    </div>
  )

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-900 text-lg">
            {created ? 'Interview created' : 'New interview session'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        {created ? (
          <div className="p-6 space-y-4">
            <p className="text-sm text-gray-600">
              Share these with <span className="font-semibold">{created.candidate_name}</span>. They sign in at the
              candidate portal with {created.candidate_email ? <span className="font-semibold">{created.candidate_email}</span> : 'their email'} and this access token.
            </p>
            <CopyField label="Access token" value={created.access_token} />
            <CopyField label="Candidate login link" value={`${window.location.origin}/candidate/login`} />
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
          <form onSubmit={submit} className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {field('candidate_name', 'Candidate name', { required: true, placeholder: 'Jane Doe' })}
              {field('candidate_email', 'Candidate email', { type: 'email', placeholder: 'jane@example.com' })}
              {field('candidate_role', 'Role', { placeholder: 'Frontend Engineer' })}
              {field('duration_minutes', 'Duration (minutes)', { type: 'number', min: 5, max: 480, required: true })}
            </div>
            {field('title', 'Session title', { placeholder: 'Defaults to role + candidate name' })}

            <div>
              <p className="text-xs font-semibold text-gray-600 mb-1.5">Problems</p>
              {problems.length === 0 && !error ? (
                <Loader size={16} className="animate-spin text-gray-400" />
              ) : (
                <div className="space-y-1.5">
                  {problems.map((p) => (
                    <label
                      key={p.id}
                      className="flex items-center gap-3 px-3 py-2 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50"
                    >
                      <input
                        type="checkbox"
                        checked={selected.includes(p.id)}
                        onChange={() => toggle(p.id)}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600"
                      />
                      <span className="flex-1 text-sm font-medium text-gray-800">{p.title}</span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${DIFF[p.difficulty] || ''}`}>
                        {p.difficulty}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {error && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3">
                <AlertTriangle size={14} className="text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-600">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={saving}
              className="w-full bg-blue-600 text-white font-semibold py-2.5 rounded-xl hover:bg-blue-700 disabled:opacity-60 text-sm flex items-center justify-center gap-2"
            >
              {saving ? <><Loader size={14} className="animate-spin" /> Creating…</> : 'Create session'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
