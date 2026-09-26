import React, { useState, useEffect, useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  Play, Code2, AlertTriangle, CheckCircle, ShieldAlert, Clock,
  Loader, XCircle, Info, Save, ChevronDown, ChevronUp,
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { sessionsAPI, analyticsAPI, signalsAPI, submissionsAPI } from '../services/api'
import { loadSessionProblems } from '../services/problems'
import InviteControls from '../components/InviteControls'

const tabs = ['Evaluation', 'Submissions', 'Similarity Analysis']

const titleCase = (s = '') => s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
const fmtElapsed = (s) =>
  s == null ? '—' : `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

const RISK_STYLE = {
  critical: { box: 'border-red-200 bg-red-50',       text: 'text-red-600',    Icon: AlertTriangle },
  high:     { box: 'border-red-100 bg-red-50',       text: 'text-red-600',    Icon: AlertTriangle },
  medium:   { box: 'border-orange-100 bg-orange-50', text: 'text-orange-500', Icon: ShieldAlert },
  low:      { box: 'border-blue-100 bg-blue-50',     text: 'text-blue-600',   Icon: Info },
  info:     { box: 'border-gray-100 bg-gray-50',     text: 'text-gray-500',   Icon: Info },
}

const STATUS_BADGE = {
  active:    'bg-green-100 text-green-700',
  waiting:   'bg-amber-100 text-amber-700',
  scheduled: 'bg-gray-100 text-gray-600',
  completed: 'bg-blue-100 text-blue-700',
  cancelled: 'bg-red-100 text-red-600',
}

function describeDetail(detail) {
  if (!detail) return null
  try {
    const d = JSON.parse(detail)
    if (d && typeof d === 'object') {
      if (d.length != null) return `${d.length} characters${d.preview ? `: “${d.preview}…”` : ''}`
      return Object.entries(d).map(([k, v]) => `${k}: ${v}`).join(', ')
    }
    return String(d)
  } catch {
    return detail
  }
}

function SignalCard({ signal }) {
  const style = RISK_STYLE[signal.risk_level] || RISK_STYLE.info
  const { Icon } = style
  return (
    <div className={`rounded-xl border p-3 ${style.box}`}>
      <div className="flex items-start gap-2">
        <Icon size={14} className={`${style.text} flex-shrink-0 mt-0.5`} />
        <div className="flex-1 min-w-0">
          <p className={`text-[10px] font-bold tracking-wide uppercase ${style.text}`}>{signal.risk_level} risk</p>
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-gray-900">{titleCase(signal.signal_type)}</p>
            <span className="text-xs text-gray-400 flex-shrink-0">{fmtElapsed(signal.elapsed_seconds)}</span>
          </div>
          {signal.detail && (
            <p className="text-xs text-gray-500 mt-0.5 leading-relaxed line-clamp-2">{describeDetail(signal.detail)}</p>
          )}
        </div>
      </div>
    </div>
  )
}

function ScoreTile({ label, value, color, hint }) {
  const colors = {
    blue: 'text-blue-600 bg-blue-50',
    green: 'text-green-600 bg-green-50',
    purple: 'text-purple-600 bg-purple-50',
    orange: 'text-orange-500 bg-orange-50',
  }
  return (
    <div className={`rounded-xl px-4 py-3 ${colors[color]}`}>
      <p className="text-xs font-medium text-gray-500 mb-1">{label}</p>
      <p className="font-bold text-lg">{value}</p>
      {hint && <p className="text-[11px] text-gray-500 mt-0.5">{hint}</p>}
    </div>
  )
}

function SubmissionRow({ sub, problemTitle }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden">
      <button onClick={() => setOpen((o) => !o)} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50">
        {sub.is_accepted
          ? <CheckCircle size={15} className="text-emerald-500 flex-shrink-0" />
          : <XCircle size={15} className="text-red-500 flex-shrink-0" />}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">
            {problemTitle}
            {sub.is_final && <span className="ml-2 text-[10px] font-bold uppercase bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">Final</span>}
          </p>
          <p className="text-xs text-gray-400">
            {sub.language} · {new Date(sub.submitted_at).toLocaleTimeString()}
            {sub.avg_runtime_ms != null && ` · ${Math.round(sub.avg_runtime_ms)}ms avg`}
          </p>
        </div>
        <span className={`text-sm font-bold ${sub.is_accepted ? 'text-emerald-600' : 'text-gray-700'}`}>
          {sub.passed_cases}/{sub.total_cases}
        </span>
        {open ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
      </button>
      {open && (
        <pre className="bg-gray-900 text-gray-100 text-xs p-4 overflow-x-auto max-h-80">{sub.source_code}</pre>
      )}
    </div>
  )
}

export default function InterviewDetails() {
  const { id } = useParams()
  const [activeTab, setActiveTab] = useState('Evaluation')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [session, setSession] = useState(null)
  const [problems, setProblems] = useState([])
  const [timeline, setTimeline] = useState(null)
  const [signals, setSignals] = useState([])
  const [similarity, setSimilarity] = useState([])
  const [submissions, setSubmissions] = useState([])
  const [scores, setScores] = useState(null)
  const [evalForm, setEvalForm] = useState({ final_score: '', notes: '' })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    ;(async () => {
      try {
        const { data: sess } = await sessionsAPI.get(id)
        const [probs, tl, sigs, sim, subs, sc] = await Promise.all([
          loadSessionProblems(sess).catch(() => []),
          analyticsAPI.timeline(id).then((r) => r.data).catch(() => null),
          signalsAPI.forSession(id).then((r) => r.data).catch(() => []),
          analyticsAPI.similarity(id).then((r) => r.data).catch(() => []),
          submissionsAPI.listForSession(id).then((r) => r.data).catch(() => []),
          analyticsAPI.score(id).then((r) => r.data).catch(() => null),
        ])
        if (cancelled) return
        setSession(sess)
        setEvalForm({ final_score: sess.final_score ?? '', notes: sess.notes || '' })
        setProblems(probs)
        setTimeline(tl)
        setSignals(sigs)
        setSimilarity(sim)
        setSubmissions(subs)
        setScores(sc)
      } catch (err) {
        if (!cancelled) setError(err.response?.data?.detail || 'Could not load this interview.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [id])

  const chartData = useMemo(() => (timeline?.engagement || []).map((e) => ({
    t: Math.round(e.elapsed_seconds / 60),
    engagement: Math.min(100, Math.round(e.keystroke_rate)),
    risk: timeline.signals.some((s) =>
      s.elapsed_seconds != null &&
      Math.abs(s.elapsed_seconds - e.elapsed_seconds) <= 30 &&
      ['high', 'critical'].includes(s.risk_level)) ? 35 : 0,
  })), [timeline])

  const problemTitle = (pid) => problems.find((p) => p.id === pid)?.title || 'Problem'

  // Best result per problem (final submission preferred)
  const perProblem = useMemo(() => problems.map((p) => {
    const subs = submissions.filter((s) => s.problem_id === p.id)
    const best = subs.find((s) => s.is_final) || subs.reduce((a, s) => (!a || s.passed_cases > a.passed_cases ? s : a), null)
    return { problem: p, best, attempts: subs.length }
  }), [problems, submissions])

  const flaggedSignals = signals.filter((s) => ['high', 'critical', 'medium'].includes(s.risk_level))

  const saveEvaluation = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const score = evalForm.final_score === '' ? null : Math.max(0, Math.min(100, Number(evalForm.final_score)))
      const { data } = await sessionsAPI.update(id, { final_score: score, notes: evalForm.notes })
      setSession(data)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader className="animate-spin text-blue-600" /></div>
  }
  if (error) {
    return (
      <div className="p-6">
        <div className="bg-white border border-red-200 rounded-2xl p-6 max-w-md mx-auto text-center">
          <AlertTriangle className="mx-auto text-red-500 mb-3" />
          <p className="font-semibold text-gray-900 mb-1">Unable to load interview</p>
          <p className="text-sm text-gray-500 mb-4">{error}</p>
          <Link to="/interviews" className="text-sm font-semibold text-blue-600 hover:underline">Back to interviews</Link>
        </div>
      </div>
    )
  }

  const initials = (session.candidate_name || 'CA').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
  const dateStr = new Date(session.started_at || session.created_at)
    .toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  const isOpen = !['completed', 'cancelled'].includes(session.status)

  return (
    <div className="p-6 space-y-5">
      {/* Candidate header */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-5">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-gray-900 truncate">{session.candidate_name || 'Candidate'}</h1>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${STATUS_BADGE[session.status]}`}>
              {titleCase(session.status)}
            </span>
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-500 flex-wrap">
            <span>{session.title}</span>
            {session.candidate_role && <span>👤 {session.candidate_role}</span>}
            <span className="flex items-center gap-1.5">
              <Clock size={13} /> {dateStr} • {session.duration_minutes} mins
            </span>
            {session.final_score != null && (
              <span className="flex items-center gap-1.5">
                <CheckCircle size={13} className="text-green-500" /> Score: {session.final_score}/100
              </span>
            )}
          </div>
        </div>
        {isOpen && (
          <Link
            to={`/live-session?session=${id}`}
            className="flex items-center gap-2 bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-semibold hover:bg-blue-700 flex-shrink-0"
          >
            <Play size={13} fill="white" /> Open Live Session
          </Link>
        )}
      </div>

      {/* Computed scores */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <ScoreTile label="Engagement" value={scores ? `${Math.round(scores.engagement_score)}%` : '—'} color="blue" hint={`${scores?.snapshot_count ?? 0} code snapshots`} />
        <ScoreTile label="Focus" value={scores ? `${Math.round(scores.focus_score)}%` : '—'} color="green" />
        <ScoreTile
          label="Problems solved"
          value={`${perProblem.filter((p) => p.best?.is_accepted).length}/${problems.length}`}
          color="purple"
          hint={`${submissions.length} code runs`}
        />
        <ScoreTile label="Integrity" value={scores ? `${Math.round(scores.integrity_score)}/100` : '—'} color="orange" hint={`${signals.length} proctoring signals`} />
      </div>

      {/* Main content */}
      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          {/* Behavioral timeline */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-1">
              <div>
                <h2 className="font-semibold text-gray-900">Behavioral Analysis Timeline</h2>
                <p className="text-xs text-gray-400 mt-0.5">Typing rate from 30-second code snapshots, with high-risk signals marked.</p>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1"><span className="w-2 h-2 bg-blue-400 rounded-full" /> Keystrokes/min</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 bg-red-500 rounded-full" /> Risk Signal</span>
              </div>
            </div>
            {chartData.length ? (
              <div className="h-48 mt-3">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                    <defs>
                      <linearGradient id="engGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#93C5FD" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#93C5FD" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                    <XAxis dataKey="t" tickFormatter={(v) => `${v}m`} tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #e5e7eb', fontSize: 11 }} />
                    <Area type="monotone" dataKey="engagement" name="Keystrokes/min" stroke="#93C5FD" strokeWidth={2} fill="url(#engGrad)" dot={false} />
                    <Area type="stepAfter" dataKey="risk" name="Risk" stroke="#EF4444" strokeWidth={2} fill="none" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-10">No activity recorded yet.</p>
            )}
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

            {activeTab === 'Evaluation' && (
              <div className="space-y-5">
                {scores?.summary && (
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                    <p className="text-xs font-bold text-blue-700 uppercase tracking-wide mb-1">Automated summary</p>
                    <p className="text-sm text-gray-700 leading-relaxed">{scores.summary}</p>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {perProblem.map(({ problem, best, attempts }) => (
                    <div key={problem.id} className="bg-gray-50 rounded-xl p-3.5">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-gray-900">{problem.title}</p>
                        <span className={`text-xs font-bold ${best?.is_accepted ? 'text-emerald-600' : best ? 'text-amber-600' : 'text-gray-400'}`}>
                          {best ? `${best.passed_cases}/${best.total_cases} tests` : 'Not attempted'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">{problem.difficulty} · {attempts} run{attempts === 1 ? '' : 's'}</p>
                    </div>
                  ))}
                </div>

                <form onSubmit={saveEvaluation} className="space-y-3">
                  <h3 className="text-base font-bold text-gray-900">Interviewer evaluation</h3>
                  <div className="flex items-center gap-3">
                    <label className="text-sm text-gray-600 w-28">Final score</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={evalForm.final_score}
                      onChange={(e) => setEvalForm({ ...evalForm, final_score: e.target.value })}
                      className="w-24 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0–100"
                    />
                    <span className="text-sm text-gray-400">/ 100</span>
                  </div>
                  <textarea
                    value={evalForm.notes}
                    onChange={(e) => setEvalForm({ ...evalForm, notes: e.target.value })}
                    rows={5}
                    placeholder="Strengths, concerns, hiring recommendation…"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex items-center gap-2 bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-semibold hover:bg-blue-700 disabled:opacity-60"
                  >
                    {saving ? <Loader size={13} className="animate-spin" /> : saved ? <CheckCircle size={13} /> : <Save size={13} />}
                    {saved ? 'Saved' : 'Save evaluation'}
                  </button>
                </form>
              </div>
            )}

            {activeTab === 'Submissions' && (
              submissions.length ? (
                <div className="space-y-2">
                  {submissions.map((s) => <SubmissionRow key={s.id} sub={s} problemTitle={problemTitle(s.problem_id)} />)}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <Code2 size={40} className="mx-auto mb-3 opacity-40" />
                  <p className="text-sm">No code has been run in this session yet.</p>
                </div>
              )
            )}

            {activeTab === 'Similarity Analysis' && (
              similarity.length ? (
                <div className="space-y-2">
                  {similarity.map((r) => (
                    <div key={r.id} className={`flex items-center gap-3 border rounded-xl px-4 py-3 ${r.is_flagged ? 'border-red-200 bg-red-50' : 'border-gray-100'}`}>
                      <ShieldAlert size={15} className={r.is_flagged ? 'text-red-500' : 'text-gray-400'} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900">{problemTitle(r.problem_id)} · {r.language}</p>
                        <p className="text-xs text-gray-500">
                          Structural {Math.round(r.structural_score)}% · Token {Math.round(r.token_score)}% · Literal {Math.round(r.literal_score)}%
                          {r.matched_source && ` · vs ${r.matched_source}`}
                        </p>
                      </div>
                      <span className={`text-sm font-bold ${r.is_flagged ? 'text-red-600' : 'text-gray-700'}`}>{Math.round(r.overall_score)}%</span>
                    </div>
                  ))}
                  <Link to={`/code-analysis?session=${id}`} className="inline-flex items-center gap-1 text-blue-600 text-sm font-medium hover:underline pt-2">
                    Open detailed code analysis
                  </Link>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <ShieldAlert size={40} className="mx-auto mb-3 opacity-40" />
                  <p className="text-sm">No similarity reports yet — they’re generated from code snapshots during the session.</p>
                </div>
              )
            )}
          </div>
        </div>

        {/* Right: invite + signals */}
        <div className="space-y-5">
          {session.candidate_email && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h2 className="font-semibold text-gray-900 mb-1">Candidate access</h2>
              <p className="text-xs text-gray-400 mb-3">
                {session.candidate_email} · token <span className="font-mono">{session.access_token}</span>
              </p>
              <InviteControls session={session} onSessionChange={setSession} />
            </div>
          )}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ShieldAlert size={16} className="text-blue-600" />
                <h2 className="font-semibold text-gray-900">Flagged Signals</h2>
              </div>
              <span className="bg-orange-100 text-orange-600 text-xs font-bold px-2 py-0.5 rounded-full">
                {flaggedSignals.length} of {signals.length}
              </span>
            </div>
            {flaggedSignals.length ? (
              <div className="space-y-3 max-h-[28rem] overflow-y-auto">
                {flaggedSignals.map((s) => <SignalCard key={s.id} signal={s} />)}
              </div>
            ) : (
              <p className="text-sm text-gray-400">No medium or high-risk signals recorded.</p>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Session Timeline</h2>
            <div className="space-y-3">
              {[
                { label: 'Session created', at: session.created_at },
                session.started_at && { label: 'Interview started', at: session.started_at },
                ...submissions.filter((s) => s.is_final).map((s) => ({ label: `Final submission: ${problemTitle(s.problem_id)}`, at: s.submitted_at })),
                session.ended_at && { label: 'Interview ended', at: session.ended_at },
              ].filter(Boolean).sort((a, b) => new Date(a.at) - new Date(b.at)).map(({ label, at }) => (
                <div key={label + at} className="flex items-start gap-3">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1 bg-gray-300" />
                  <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
                    <p className="text-sm text-gray-700">{label}</p>
                    <span className="text-xs text-gray-400 flex-shrink-0">{new Date(at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
