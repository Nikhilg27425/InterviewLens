/**
 * Loads a session's problems from the backend and normalises them into the
 * shape the editor/problem panels expect. `id` is the backend UUID, so it can
 * be sent straight to /submissions, /analytics and over the WebSocket.
 *
 * Seeded problems only carry starter code for some languages, so missing
 * languages fall back to the local problem bank (matched by slug).
 */
import { problemsAPI } from './api'
import { PROBLEMS as LOCAL_PROBLEMS } from '../data/problems'

const parseJSON = (value, fallback) => {
  if (value == null) return fallback
  if (typeof value !== 'string') return value
  try { return JSON.parse(value) } catch { return fallback }
}

export function normaliseProblem(p) {
  const local = LOCAL_PROBLEMS.find((lp) => lp.slug === p.slug)
  return {
    id:          p.id,
    slug:        p.slug,
    title:       p.title,
    difficulty:  p.difficulty,
    points:      p.points,
    description: p.description,
    examples:    parseJSON(p.examples, []),
    constraints: parseJSON(p.constraints, []),
    testCases:   (p.test_cases || []).map((tc) => ({
      label: tc.label, stdin: tc.stdin, expected: tc.expected,
    })),
    customTestDefault: p.custom_test_default ?? local?.customTestDefault ?? '',
    starterCode: { ...(local?.starterCode || {}), ...parseJSON(p.starter_code, {}) },
  }
}

/** Problems for a session, in the order the interviewer picked them. */
export async function loadSessionProblems(session) {
  let ids = (session?.problem_ids || '').split(',').map((s) => s.trim()).filter(Boolean)
  if (!ids.length) {
    // Session created without an explicit selection — use the whole bank
    const { data } = await problemsAPI.list()
    ids = data.map((p) => p.id)
  }
  // Skip problems deleted since the session was created rather than failing the whole page
  const results = await Promise.allSettled(ids.map((id) => problemsAPI.get(id).then((r) => r.data)))
  const found = results.filter((r) => r.status === 'fulfilled').map((r) => r.value)
  if (!found.length && results.length) throw results[0].reason
  return found.map(normaliseProblem)
}
