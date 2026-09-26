import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, Pencil, Trash2, Loader, BookOpen, EyeOff, AlertTriangle } from 'lucide-react'
import { problemsAPI, apiErrorMessage } from '../services/api'

const DIFF = {
  Easy:   'bg-emerald-100 text-emerald-700',
  Medium: 'bg-amber-100 text-amber-700',
  Hard:   'bg-red-100 text-red-600',
}
const parseTags = (t) => { try { return JSON.parse(t || '[]') } catch { return [] } }

export default function Problems() {
  const [problems, setProblems] = useState(null)
  const [query, setQuery] = useState('')
  const [difficulty, setDifficulty] = useState('All')
  const [error, setError] = useState('')

  const load = () => problemsAPI.list()
    .then(({ data }) => setProblems(data))
    .catch((err) => { setProblems([]); setError(apiErrorMessage(err, 'Could not load problems.')) })

  useEffect(() => { load() }, [])

  const visible = useMemo(() => (problems || []).filter((p) => {
    const q = query.trim().toLowerCase()
    const matches = !q || p.title.toLowerCase().includes(q) || parseTags(p.tags).some((t) => t.toLowerCase().includes(q))
    return matches && (difficulty === 'All' || p.difficulty === difficulty)
  }), [problems, query, difficulty])

  const remove = async (p) => {
    if (!window.confirm(`Delete “${p.title}”? This can't be undone.`)) return
    setError('')
    try {
      await problemsAPI.delete(p.id)
      setProblems((prev) => prev.filter((x) => x.id !== p.id))
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not delete the problem.'))
    }
  }

  const counts = { All: problems?.length || 0 }
  for (const p of problems || []) counts[p.difficulty] = (counts[p.difficulty] || 0) + 1

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Problem Bank</h1>
          <p className="text-gray-500 text-sm mt-0.5">Coding problems available for your interviews</p>
        </div>
        <Link to="/problems/new" className="flex items-center gap-2 bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-semibold hover:bg-blue-700">
          <Plus size={15} /> New problem
        </Link>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search title or tag…"
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex gap-1.5">
          {['All', 'Easy', 'Medium', 'Hard'].map((d) => (
            <button
              key={d}
              onClick={() => setDifficulty(d)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${difficulty === d ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
            >
              {d} <span className="opacity-60">{counts[d] || 0}</span>
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600">
          <AlertTriangle size={15} className="flex-shrink-0 mt-0.5" /> {error}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {problems == null ? (
          <div className="p-10 flex justify-center"><Loader className="animate-spin text-blue-600" /></div>
        ) : visible.length === 0 ? (
          <div className="p-12 text-center">
            <BookOpen size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="font-semibold text-gray-900">{problems.length ? 'No problems match your filters' : 'No problems yet'}</p>
            {!problems.length && (
              <Link to="/problems/new" className="inline-block mt-3 text-sm font-semibold text-blue-600 hover:underline">Create your first problem</Link>
            )}
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {['Problem', 'Difficulty', 'Tests', 'Points', 'Updated', ''].map((h) => (
                  <th key={h} className="text-left text-xs font-semibold text-gray-500 px-5 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {visible.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50/60">
                  <td className="px-5 py-3.5">
                    <Link to={`/problems/${p.id}`} className="text-sm font-semibold text-gray-900 hover:text-blue-600">{p.title}</Link>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {parseTags(p.tags).map((t) => (
                        <span key={t} className="text-[10px] font-medium bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{t}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${DIFF[p.difficulty]}`}>{p.difficulty}</span>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-gray-700">
                    {p.test_case_count}
                    {p.hidden_case_count > 0 && (
                      <span className="ml-1.5 inline-flex items-center gap-0.5 text-xs text-gray-400"><EyeOff size={11} /> {p.hidden_case_count}</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-sm text-gray-700">{p.points}</td>
                  <td className="px-5 py-3.5 text-xs text-gray-400">{p.updated_at ? new Date(p.updated_at).toLocaleDateString() : '—'}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex justify-end gap-1">
                      <Link to={`/problems/${p.id}`} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50" title="Edit">
                        <Pencil size={14} />
                      </Link>
                      <button onClick={() => remove(p)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50" title="Delete">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
