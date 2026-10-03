/**
 * Code execution service — routes through our FastAPI backend at
 * /api/execute/run and /api/execute/run-custom, which proxies to
 * Judge0 CE server-side (avoids CORS errors from the browser).
 *
 * Response shape from backend matches what the UI components expect:
 * {
 *   id, status_id, status_label, status_type,
 *   passed, stdout, stderr, compile_error, error,
 *   time, memory, input, expected
 * }
 */

import { BASE_URL, getAuthToken } from './api'

export const LANGUAGES = ['JavaScript', 'TypeScript', 'Python', 'Java', 'C++']

// ─── Normalise backend response keys to what the UI expects ──────────────────
// Backend returns snake_case; UI was built on camelCase from the old direct client.

function normalise(r) {
  return {
    statusId:    r.status_id    ?? r.statusId    ?? 13,
    statusLabel: r.status_label ?? r.statusLabel ?? 'Error',
    statusType:  r.status_type  ?? r.statusType  ?? 'error',
    passed:      r.passed       ?? false,
    stdout:      r.stdout       ?? '',
    stderr:      r.stderr       ?? '',
    compileError:r.compile_error ?? r.compileError ?? '',
    error:       r.error        ?? '',
    time:        r.time         ?? null,
    memory:      r.memory       ?? null,
    input:       r.input        ?? '',
    expected:    r.expected     ?? '',
  }
}

// ─── Run all test cases via backend proxy ─────────────────────────────────────

export async function runAllTestCases({ code, language, testCases }) {
  const token = getAuthToken()
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE_URL}/api/execute/run`, {
    method:  'POST',
    headers,
    body: JSON.stringify({
      source_code: code,
      language,
      test_cases: testCases.map(tc => ({
        label:    tc.label    ?? tc.stdin ?? '',
        stdin:    tc.stdin    ?? '',
        expected: tc.expected ?? null,
      })),
    }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(`Execution failed (${res.status}): ${text}`)
  }

  const raw = await res.json()

  return raw.map((r, i) => ({
    ...normalise(r),
    id:       r.id ?? i + 1,
    input:    r.input    || testCases[i]?.label || testCases[i]?.stdin || '',
    expected: r.expected || testCases[i]?.expected || '',
  }))
}

// ─── Run single custom stdin via backend proxy ────────────────────────────────

export async function runTestCase({ code, language, stdin, expected }) {
  const token = getAuthToken()
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE_URL}/api/execute/run-custom`, {
    method:  'POST',
    headers,
    body: JSON.stringify({ source_code: code, language, stdin: stdin ?? '' }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(`Execution failed (${res.status}): ${text}`)
  }

  return normalise(await res.json())
}
