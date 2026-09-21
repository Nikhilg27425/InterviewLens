/**
 * Judge0 CE — browser-compatible API wrapper
 *
 * Uses the free Judge0 CE community instance.
 * No API key required for reasonable usage.
 *
 * Public endpoint: https://ce.judge0.com
 * Docs: https://ce.judge0.com/
 */

const BASE = 'https://ce.judge0.com'

// ─── Language IDs (Judge0 CE) ─────────────────────────────────────────────────

export const LANGUAGE_IDS = {
  JavaScript: 63,   // Node.js 12.14.0
  TypeScript: 74,   // TypeScript 3.7.4
  Python:     71,   // Python 3.8.1
  Java:       62,   // Java OpenJDK 13.0.1
  'C++':      54,   // C++ (GCC 9.2.0)
}

export const LANGUAGES = Object.keys(LANGUAGE_IDS)

// ─── Status codes ─────────────────────────────────────────────────────────────

export const STATUS = {
  1:  { label: 'In Queue',               type: 'pending'  },
  2:  { label: 'Processing',             type: 'pending'  },
  3:  { label: 'Accepted',               type: 'success'  },
  4:  { label: 'Wrong Answer',           type: 'wrong'    },
  5:  { label: 'Time Limit Exceeded',    type: 'tle'      },
  6:  { label: 'Compilation Error',      type: 'error'    },
  7:  { label: 'Runtime Error (SIGSEGV)', type: 'error'   },
  8:  { label: 'Runtime Error (SIGXFSZ)', type: 'error'   },
  9:  { label: 'Runtime Error (SIGFPE)',  type: 'error'   },
  10: { label: 'Runtime Error (SIGABRT)', type: 'error'   },
  11: { label: 'Runtime Error (NZEC)',    type: 'error'   },
  12: { label: 'Runtime Error (Other)',   type: 'error'   },
  13: { label: 'Internal Error',          type: 'error'   },
  14: { label: 'Exec Format Error',       type: 'error'   },
}

// ─── Submit one test case ─────────────────────────────────────────────────────

export async function submitCode(code, language, stdin, expectedOutput) {
  const langId = LANGUAGE_IDS[language]
  if (!langId) throw new Error(`Unsupported language: ${language}`)

  const body = {
    language_id: langId,
    source_code: code,
    stdin: stdin ?? '',
    expected_output: expectedOutput ?? null,
    cpu_time_limit: 5,
    memory_limit: 131072,
  }

  const res = await fetch(
    `${BASE}/submissions?base64_encoded=false&wait=false`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
    }
  )

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(`Judge0 submission error ${res.status}: ${text}`)
  }

  const { token } = await res.json()
  if (!token) throw new Error('Judge0 returned no token')
  return token
}

// ─── Poll until terminal status ───────────────────────────────────────────────

export async function pollResult(token, maxAttempts = 20, intervalMs = 800) {
  const fields = 'status,stdout,stderr,compile_output,time,memory'

  for (let i = 0; i < maxAttempts; i++) {
    await sleep(intervalMs)

    const res = await fetch(
      `${BASE}/submissions/${token}?base64_encoded=false&fields=${fields}`,
      { headers: { Accept: 'application/json' } }
    )
    if (!res.ok) throw new Error(`Poll failed ${res.status}`)

    const data = await res.json()
    const sid  = data.status?.id ?? 0

    if (sid >= 3) return parseResult(data)   // terminal state
  }

  throw new Error('Timed out waiting for Judge0 result')
}

// ─── Run a single stdin test case ─────────────────────────────────────────────

export async function runTestCase({ code, language, stdin, expected }) {
  const token = await submitCode(code, language, stdin, expected)
  return pollResult(token)
}

// ─── Run all test cases in parallel ──────────────────────────────────────────

export async function runAllTestCases({ code, language, testCases }) {
  // Submit all at once
  const tokens = await Promise.all(
    testCases.map((tc) => submitCode(code, language, tc.stdin, tc.expected))
  )

  // Poll all in parallel
  const results = await Promise.all(tokens.map(pollResult))

  // Decorate with metadata from the test-case definition
  return results.map((r, i) => ({
    ...r,
    id:       i + 1,
    input:    testCases[i].label ?? testCases[i].stdin,
    expected: testCases[i].expected,
  }))
}

// ─── Parse raw Judge0 result ──────────────────────────────────────────────────

function parseResult(data) {
  const sid      = data.status?.id ?? 13
  const info     = STATUS[sid] ?? { label: 'Unknown', type: 'error' }

  const stdout   = (data.stdout         ?? '').trim()
  const stderr   = (data.stderr         ?? '').trim()
  const compErr  = (data.compile_output ?? '').trim()

  // Judge0 marks Accepted (3) when expected_output matched OR no expected was given
  const passed   = sid === 3

  return {
    statusId:    sid,
    statusLabel: info.label,
    statusType:  info.type,
    passed,
    stdout,
    stderr,
    compileError: compErr,
    time:   data.time   ? `${Math.round(parseFloat(data.time) * 1000)}ms`      : null,
    memory: data.memory ? `${(data.memory / 1024).toFixed(1)} KB`              : null,
    // Convenience fields for the UI
    output: stdout || stderr || compErr || info.label,
    error:  stderr || compErr || (info.type === 'error' ? info.label : null),
  }
}

// ─── Utility ──────────────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
