import React, { useState, useEffect, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ShieldAlert, AlertTriangle, Loader, CheckCircle, ChevronRight } from 'lucide-react'
import { analyticsAPI, sessionsAPI } from '../services/api'

/** Split a unified diff (list of lines) into aligned reference/candidate panes. */
function splitDiff(lines) {
  const left = []
  const right = []
  for (const line of lines) {
    if (line.startsWith('---') || line.startsWith('+++')) continue
    if (line.startsWith('@@')) {
      left.push({ text: line, kind: 'hunk' })
      right.push({ text: line, kind: 'hunk' })
    } else if (line.startsWith('-')) {
      left.push({ text: line.slice(1), kind: 'del' })
    } else if (line.startsWith('+')) {
      right.push({ text: line.slice(1), kind: 'add' })
    } else {
      // pad the shorter side so shared context lines stay aligned
      while (left.length < right.length) left.push({ text: '', kind: 'pad' })
      while (right.length < left.length) right.push({ text: '', kind: 'pad' })
      left.push({ text: line.slice(1), kind: 'same' })
      right.push({ text: line.slice(1), kind: 'same' })
    }
  }
  return { left, right }
}

const LINE_STYLE = {
  hunk: 'text-blue-400 bg-blue-950/40',
  del:  'text-orange-300 bg-orange-950/40',
  add:  'text-emerald-300 bg-emerald-950/40',
  same: 'text-gray-300',
  pad:  '',
}

function CodePanel({ title, lines }) {
  return (
    <div className="flex-1 flex flex-col rounded-xl overflow-hidden border border-gray-700 min-w-0">
      <div className="bg-gray-800 px-4 py-2.5 flex-shrink-0">
        <span className="text-gray-300 text-xs font-semibold uppercase tracking-wide">{title}</span>
      </div>
      <div className="flex-1 bg-gray-900 overflow-auto p-3 font-mono text-xs">
        {lines.map((l, i) => (
          <div key={i} className={`whitespace-pre leading-5 px-1 ${LINE_STYLE[l.kind]}`}>{l.text || ' '}</div>
        ))}
      </div>
    </div>
  )
}

function SessionPicker() {
  const [sessions, setSessions] = useState(null)
  useEffect(() => {
    sessionsAPI.list().then(({ data }) => setSessions(data)).catch(() => setSessions([]))
  }, [])
  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Code Similarity Analysis</h1>
        <p className="text-gray-500 text-sm">Pick an interview to review its similarity reports.</p>
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
        {sessions == null ? (
          <div className="p-6 flex justify-center"><Loader className="animate-spin text-blue-600" /></div>
        ) : sessions.length === 0 ? (
          <p className="p-6 text-sm text-gray-400 text-center">No interviews yet.</p>
        ) : sessions.map((s) => (
          <Link key={s.id} to={`/code-analysis?session=${s.id}`} className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{s.candidate_name || 'Candidate'}</p>
              <p className="text-xs text-gray-400 truncate">{s.title}</p>
            </div>
            <span className="text-xs text-gray-400">{new Date(s.created_at).toLocaleDateString()}</span>
            <ChevronRight size={14} className="text-gray-300" />
          </Link>
        ))}
      </div>
    </div>
  )
}

export default function CodeAnalysis() {
  const [searchParams] = useSearchParams()
  const sessionId = searchParams.get('session')
  if (!sessionId) return <SessionPicker />
  return <SessionAnalysis key={sessionId} sessionId={sessionId} />
}

function SessionAnalysis({ sessionId }) {
  const [viewMode, setViewMode] = useState('Split')
  const [session, setSession] = useState(null)
  const [reports, setReports] = useState(null)
  const [activeIdx, setActiveIdx] = useState(0)

  useEffect(() => {
    sessionsAPI.get(sessionId).then(({ data }) => setSession(data)).catch(() => {})
    analyticsAPI.similarity(sessionId)
      .then(({ data }) => setReports(data))
      .catch(() => setReports([]))
  }, [sessionId])

  const report = reports?.[activeIdx]
  const diffLines = useMemo(() => {
    try { return JSON.parse(report?.diff_json || '[]') } catch { return [] }
  }, [report])
  const { left, right } = useMemo(() => splitDiff(diffLines), [diffLines])

  if (reports == null) {
    return <div className="flex items-center justify-center h-64"><Loader className="animate-spin text-blue-600" /></div>
  }

  const score = report ? report.overall_score : 0
  const scoreColor = score >= 70 ? 'text-red-500' : score >= 40 ? 'text-amber-500' : 'text-emerald-600'

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-gray-900">Code Similarity Analysis</h1>
            {report?.is_flagged && (
              <span className="bg-red-100 text-red-600 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                <AlertTriangle size={11} /> Risk Signal Detected
              </span>
            )}
          </div>
          <p className="text-gray-500 text-sm">
            {session ? <>{session.candidate_name || 'Candidate'} · {session.title}</> : 'Loading session…'}
          </p>
        </div>
        <Link to={`/interviews/${sessionId}`} className="border border-gray-200 rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
          Interview report
        </Link>
      </div>

      {!report ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center text-gray-400">
          <ShieldAlert size={40} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm">No similarity reports for this session yet. They are generated from the candidate’s code snapshots every 30 seconds.</p>
        </div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-5">
          {/* Left: breakdown */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h2 className="font-semibold text-gray-900 mb-4">Similarity Breakdown</h2>
              <div className="text-center mb-6">
                <p className={`text-5xl font-extrabold ${scoreColor}`}>{score.toFixed(1)}%</p>
                <p className={`text-xs font-bold tracking-widest uppercase mt-1 ${scoreColor}`}>
                  {report.is_flagged ? 'High risk signal' : score >= 40 ? 'Moderate similarity' : 'Low similarity'}
                </p>
              </div>
              <div className="space-y-4">
                {[
                  { label: 'Structural Similarity', desc: 'AST shape with identifiers normalised (Python) or token flow', value: report.structural_score },
                  { label: 'Token Similarity', desc: 'Sequence of language tokens', value: report.token_score },
                  { label: 'Literal Similarity', desc: 'Character-level text match', value: report.literal_score },
                ].map(({ label, desc, value }) => (
                  <div key={label}>
                    <div className="flex justify-between items-baseline mb-1">
                      <div>
                        <p className="text-sm font-semibold text-gray-800">{label}</p>
                        <p className="text-xs text-gray-400">{desc}</p>
                      </div>
                      <span className="font-bold text-sm ml-2 flex-shrink-0 text-gray-700">{Math.round(value)}%</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-600 rounded-full" style={{ width: `${Math.min(100, value)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between text-sm mt-5 pt-4 border-t border-gray-100">
                <span className="text-gray-400 font-medium">Compared against</span>
                <span className="font-semibold text-gray-700">{report.matched_source || '—'}</span>
              </div>
            </div>

            {/* Report list */}
            <div className="bg-white rounded-2xl border border-gray-100 p-3">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide px-2 py-1.5">
                {reports.length} report{reports.length === 1 ? '' : 's'}
              </p>
              <div className="max-h-64 overflow-y-auto">
                {reports.map((r, i) => (
                  <button
                    key={r.id}
                    onClick={() => setActiveIdx(i)}
                    className={`w-full flex items-center gap-2 px-2 py-2 rounded-lg text-left text-xs ${i === activeIdx ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                  >
                    {r.is_flagged
                      ? <AlertTriangle size={12} className="text-red-500 flex-shrink-0" />
                      : <CheckCircle size={12} className="text-emerald-500 flex-shrink-0" />}
                    <span className="flex-1 text-gray-700">{r.language} · {new Date(r.analyzed_at).toLocaleTimeString()}</span>
                    <span className="font-bold text-gray-800">{Math.round(r.overall_score)}%</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
              <p className="text-xs font-bold text-gray-900 mb-1">COMPLIANCE DISCLAIMER</p>
              <p className="text-xs text-gray-500 leading-relaxed">
                This automated similarity analysis is a support tool. A high similarity score indicates a 'Risk Signal' and does not confirm plagiarism. Manual review is required before any hiring decision.
              </p>
            </div>
          </div>

          {/* Right: diff */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-semibold text-gray-900">Diff Comparison</h2>
                  <p className="text-xs text-gray-400 mt-0.5">Changed regions between the reference and the candidate’s code.</p>
                </div>
                <div className="flex border border-gray-200 rounded-lg overflow-hidden">
                  {['Split', 'Unified'].map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setViewMode(mode)}
                      className={`px-3 py-1.5 text-xs font-medium transition-colors ${viewMode === mode ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              {diffLines.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-10">The candidate’s code is identical to the reference.</p>
              ) : viewMode === 'Split' ? (
                <div className="flex gap-3 h-[28rem]">
                  <CodePanel title={`Reference: ${report.matched_source || 'source'}`} lines={left} />
                  <CodePanel title="Candidate" lines={right} />
                </div>
              ) : (
                <div className="h-[28rem] bg-gray-900 rounded-xl overflow-auto p-3 font-mono text-xs">
                  {diffLines.map((line, i) => {
                    const kind = line.startsWith('@@') ? 'hunk'
                      : line.startsWith('+') && !line.startsWith('+++') ? 'add'
                      : line.startsWith('-') && !line.startsWith('---') ? 'del' : 'same'
                    return <div key={i} className={`whitespace-pre leading-5 px-1 ${LINE_STYLE[kind]}`}>{line || ' '}</div>
                  })}
                </div>
              )}

              <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 bg-orange-400 rounded-full" /> Only in reference</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 bg-emerald-400 rounded-full" /> Only in candidate</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
