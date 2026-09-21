/**
 * CodeEditorPane — shared editable code editor with real Judge0 execution.
 *
 * Used by both CandidateInterviewPage and LiveSession (interviewer view).
 *
 * Features:
 *  - Textarea with real Tab indentation
 *  - Syntax highlighting via highlight.js overlay (textarea-mirror pattern)
 *  - Language switcher
 *  - Run Code → submits to Judge0 CE (free public API), polls for results
 *  - Test Cases tab: per-case collapsible cards with pass/fail, actual output
 *  - Console tab: raw stdout/stderr per case
 *  - Custom Input tab: free-form stdin runner
 *  - Reset to starter code
 */

import React, { useRef, useMemo, useState, useCallback } from 'react'
import {
  Play, RotateCcw, CheckCircle, XCircle,
  AlertTriangle, Loader, ChevronDown, ChevronUp,
  Terminal, FlaskConical, SlidersHorizontal,
} from 'lucide-react'
import hljs from 'highlight.js/lib/core'
import javascript from 'highlight.js/lib/languages/javascript'
import typescript from 'highlight.js/lib/languages/typescript'
import python from 'highlight.js/lib/languages/python'
import java from 'highlight.js/lib/languages/java'
import cpp from 'highlight.js/lib/languages/cpp'
import 'highlight.js/styles/atom-one-dark.css'
import { LANGUAGES, runAllTestCases, runTestCase } from '../services/judge0'

hljs.registerLanguage('javascript', javascript)
hljs.registerLanguage('typescript', typescript)
hljs.registerLanguage('python', python)
hljs.registerLanguage('java', java)
hljs.registerLanguage('cpp', cpp)

const HLJS_LANG = {
  JavaScript: 'javascript',
  TypeScript: 'typescript',
  Python: 'python',
  Java: 'java',
  'C++': 'cpp',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function StatusPill({ result }) {
  if (!result) return null
  if (result.passed) return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
      <CheckCircle size={11} /> {result.statusLabel || 'Accepted'}
    </span>
  )
  if (result.statusType === 'error') return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
      <XCircle size={11} /> {result.statusLabel || 'Error'}
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
      <AlertTriangle size={11} /> {result.statusLabel || 'Wrong Answer'}
    </span>
  )
}

function TestCaseCard({ result, idx }) {
  const [open, setOpen] = useState(true)

  const bg = result.running
    ? 'border-blue-200 bg-blue-50/60'
    : result.passed
    ? 'border-emerald-200 bg-emerald-50/60'
    : result.error
    ? 'border-red-200 bg-red-50/60'
    : 'border-amber-200 bg-amber-50/60'

  return (
    <div className={`rounded-xl border overflow-hidden ${bg}`}>
      <button
        className="w-full flex items-center justify-between px-4 py-2.5 text-left gap-2"
        onClick={() => setOpen((o) => !o)}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {result.running
            ? <Loader size={13} className="text-blue-500 animate-spin flex-shrink-0" />
            : result.passed
            ? <CheckCircle size={13} className="text-emerald-600 flex-shrink-0" />
            : result.error
            ? <XCircle size={13} className="text-red-500 flex-shrink-0" />
            : <AlertTriangle size={13} className="text-amber-500 flex-shrink-0" />
          }
          <span className="text-sm font-semibold text-gray-800 truncate">
            Case {idx + 1}{result.input ? ` — ${result.input}` : ''}
          </span>
          {result.time && (
            <span className="text-xs text-gray-400 font-mono flex-shrink-0">{result.time}</span>
          )}
          {result.memory && (
            <span className="text-xs text-gray-400 font-mono flex-shrink-0">{result.memory}</span>
          )}
        </div>
        {open
          ? <ChevronUp size={14} className="text-gray-400 flex-shrink-0" />
          : <ChevronDown size={14} className="text-gray-400 flex-shrink-0" />
        }
      </button>

      {open && !result.running && (
        <div className="px-4 pb-3 font-mono text-xs space-y-1.5 border-t border-black/5 pt-2">
          {result.input && (
            <Row label="Input" value={result.input} />
          )}
          {result.expected && (
            <Row label="Expected" value={result.expected} />
          )}
          {result.stdout !== '' && result.stdout !== undefined && (
            <Row
              label={result.passed ? 'Output' : 'Got'}
              value={result.stdout || '(empty)'}
              valueClass={result.passed ? 'text-emerald-700' : 'text-red-600'}
            />
          )}
          {result.error && (
            <Row label="Error" value={result.error} valueClass="text-red-600 whitespace-pre-wrap" />
          )}
        </div>
      )}
    </div>
  )
}

function Row({ label, value, valueClass = 'text-gray-700' }) {
  return (
    <div className="flex gap-2">
      <span className="text-gray-400 w-16 flex-shrink-0">{label}:</span>
      <span className={`break-all ${valueClass}`}>{value}</span>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function CodeEditorPane({
  code = '',
  onCodeChange,
  language = 'JavaScript',
  onLanguageChange,
  problem,           // { testCases: [{label,stdin,expected}], customTestDefault }
  starterCode = '',
  readOnly = false,
  showLanguageSwitcher = true,
  toolbarSlot = null,   // extra buttons injected by parent (Mark Solved, Complete Eval…)
}) {
  const textareaRef  = useRef(null)
  const highlightRef = useRef(null)

  // ── output state ──
  const [outputTab,    setOutputTab]    = useState('testcases')
  const [testResults,  setTestResults]  = useState([])
  const [customResult, setCustomResult] = useState(null)
  const [customInput,  setCustomInput]  = useState(problem?.customTestDefault ?? '')
  const [running,      setRunning]      = useState(false)
  const [runningCustom, setRunningCustom] = useState(false)

  // ── highlight ──
  const highlighted = useMemo(() => {
    try {
      return hljs.highlight(code, { language: HLJS_LANG[language] || 'javascript' }).value
    } catch {
      return code
    }
  }, [code, language])

  // ── scroll sync ──
  const syncScroll = () => {
    if (!highlightRef.current || !textareaRef.current) return
    highlightRef.current.scrollTop  = textareaRef.current.scrollTop
    highlightRef.current.scrollLeft = textareaRef.current.scrollLeft
  }

  // ── Tab key ──
  const handleKeyDown = (e) => {
    if (readOnly) return
    if (e.key === 'Tab') {
      e.preventDefault()
      const ta = textareaRef.current
      const s = ta.selectionStart, en = ta.selectionEnd
      const next = code.substring(0, s) + '  ' + code.substring(en)
      onCodeChange(next)
      requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = s + 2 })
    }
  }

  // ── Run against all test cases ──
  const handleRunAll = useCallback(async () => {
    if (!problem?.testCases?.length) return
    setRunning(true)
    setOutputTab('testcases')
    // Placeholder cards
    setTestResults(
      problem.testCases.map((tc, i) => ({
        id: i + 1, input: tc.label ?? tc.stdin,
        expected: tc.expected, running: true,
      }))
    )
    try {
      const results = await runAllTestCases({ code, language, testCases: problem.testCases })
      setTestResults(results)
    } catch (err) {
      setTestResults(
        problem.testCases.map((tc, i) => ({
          id: i + 1, input: tc.label ?? tc.stdin, expected: tc.expected,
          running: false, passed: false,
          statusId: 13, statusLabel: 'Network Error', statusType: 'error',
          error: `Could not reach Judge0: ${err.message}`, stdout: '',
        }))
      )
    } finally {
      setRunning(false)
    }
  }, [code, language, problem])

  // ── Run custom input ──
  const handleRunCustom = useCallback(async () => {
    setRunningCustom(true)
    setCustomResult(null)
    try {
      const r = await runTestCase({ code, language, stdin: customInput, expected: null })
      setCustomResult(r)
    } catch (err) {
      setCustomResult({
        passed: false, statusLabel: 'Network Error', statusType: 'error',
        error: `Could not reach Judge0: ${err.message}`, stdout: '',
      })
    } finally {
      setRunningCustom(false)
    }
  }, [code, language, customInput])

  // ── Reset ──
  const handleReset = () => {
    onCodeChange(starterCode)
    setTestResults([])
    setCustomResult(null)
  }

  const allPassed = testResults.length > 0 && testResults.every((r) => r.passed && !r.running)
  const anyFailed = testResults.some((r) => !r.passed && !r.running && r.statusId)

  return (
    <div className="flex flex-col h-full overflow-hidden bg-gray-950">

      {/* ── Toolbar ── */}
      <div className="bg-gray-900 border-b border-gray-700/60 px-3 py-2 flex items-center justify-between flex-shrink-0 gap-2">
        {/* Left: language switcher */}
        <div className="flex items-center gap-2 min-w-0">
          {showLanguageSwitcher && (
            <div className="flex border border-gray-700 rounded-lg overflow-hidden flex-shrink-0">
              {LANGUAGES.map((l) => (
                <button
                  key={l}
                  onClick={() => !readOnly && onLanguageChange?.(l)}
                  disabled={readOnly}
                  className={`px-2.5 py-1 text-xs font-medium transition-colors ${
                    language === l
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-gray-700'
                  } disabled:cursor-not-allowed`}
                >
                  {l}
                </button>
              ))}
            </div>
          )}
          {readOnly && (
            <span className="text-gray-500 text-xs flex items-center gap-1">🔒 READ-ONLY</span>
          )}
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {toolbarSlot}
          {!readOnly && (
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 text-gray-400 hover:text-white text-xs border border-gray-700 rounded-lg px-2.5 py-1.5 hover:bg-gray-700 transition-colors"
            >
              <RotateCcw size={11} /> Reset
            </button>
          )}
          {problem?.testCases && (
            <button
              onClick={handleRunAll}
              disabled={running}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
            >
              {running
                ? <><Loader size={11} className="animate-spin" /> Running…</>
                : <><Play size={11} fill="white" /> Run Code</>
              }
            </button>
          )}
        </div>
      </div>

      {/* ── Code area ── */}
      <div className="flex-1 relative overflow-hidden" style={{ minHeight: 0 }}>
        {/* Line numbers */}
        <div
          className="absolute left-0 top-0 bottom-0 w-10 select-none pointer-events-none z-10 bg-gray-900 border-r border-gray-800"
          aria-hidden="true"
        >
          <div className="pt-4 pb-4 pr-2 font-mono text-xs text-gray-600 leading-6 text-right">
            {code.split('\n').map((_, i) => <div key={i}>{i + 1}</div>)}
          </div>
        </div>

        {/* Syntax highlight overlay */}
        <pre
          ref={highlightRef}
          aria-hidden="true"
          className="absolute inset-0 overflow-auto pointer-events-none font-mono text-xs leading-6 pt-4 pb-4 pr-4 pl-3 m-0 bg-transparent whitespace-pre"
          style={{ left: 40 }}
        >
          <code
            className={`language-${HLJS_LANG[language] || 'javascript'} bg-transparent`}
            dangerouslySetInnerHTML={{ __html: highlighted }}
          />
        </pre>

        {/* Transparent editable textarea */}
        <textarea
          ref={textareaRef}
          value={code}
          readOnly={readOnly}
          onChange={(e) => !readOnly && onCodeChange?.(e.target.value)}
          onKeyDown={handleKeyDown}
          onScroll={syncScroll}
          spellCheck={false}
          autoCapitalize="none"
          autoCorrect="off"
          className="absolute inset-0 font-mono text-xs leading-6 pt-4 pb-4 pr-4 pl-3 bg-transparent outline-none resize-none overflow-auto"
          style={{
            left: 40,
            color: 'transparent',
            caretColor: '#e2e8f0',
            WebkitTextFillColor: 'transparent',
          }}
        />
      </div>

      {/* ── Output panel ── */}
      <div className="flex-shrink-0 bg-white border-t border-gray-200" style={{ height: 240 }}>
        {/* Tab bar */}
        <div className="flex items-center gap-1 px-4 border-b border-gray-100 h-10 flex-shrink-0">
          {[
            { id: 'testcases', label: 'Test Cases', Icon: FlaskConical },
            { id: 'console',   label: 'Console',    Icon: Terminal },
            { id: 'custom',    label: 'Custom Input', Icon: SlidersHorizontal },
          ].map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setOutputTab(id)}
              className={`flex items-center gap-1.5 h-full px-1 mr-3 text-xs font-medium border-b-2 transition-colors ${
                outputTab === id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              <Icon size={12} /> {label}
            </button>
          ))}
          {/* Summary */}
          <div className="ml-auto flex items-center">
            {(running || runningCustom) && (
              <span className="flex items-center gap-1 text-xs text-blue-600 font-semibold">
                <Loader size={11} className="animate-spin" /> Executing…
              </span>
            )}
            {!running && allPassed && (
              <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600">
                <CheckCircle size={11} /> All {testResults.length} passed
              </span>
            )}
            {!running && anyFailed && (
              <span className="flex items-center gap-1 text-xs font-semibold text-red-500">
                <XCircle size={11} />{' '}
                {testResults.filter((r) => !r.passed && r.statusId).length} failed
              </span>
            )}
          </div>
        </div>

        {/* Tab content */}
        <div className="overflow-y-auto p-4" style={{ height: 200 }}>

          {/* Test Cases */}
          {outputTab === 'testcases' && (
            <div className="space-y-2">
              {testResults.length === 0 && !running ? (
                <p className="text-gray-400 text-sm">
                  Click <strong className="text-gray-600">Run Code</strong> to execute against test cases.
                </p>
              ) : (
                testResults.map((r, i) => <TestCaseCard key={i} result={r} idx={i} />)
              )}
            </div>
          )}

          {/* Console */}
          {outputTab === 'console' && (
            <div className="bg-gray-950 rounded-xl p-3 font-mono text-xs space-y-1" style={{ minHeight: 120 }}>
              {testResults.length === 0 && !running ? (
                <p className="text-gray-500">No output yet.</p>
              ) : (
                testResults.map((r, i) => (
                  <div key={i}>
                    {r.running ? (
                      <p className="text-blue-400">[ case {i + 1} ] running…</p>
                    ) : r.error ? (
                      <>
                        <p className="text-gray-600">[ case {i + 1} ] stderr ──</p>
                        <p className="text-red-400 whitespace-pre-wrap ml-2">{r.error}</p>
                      </>
                    ) : (
                      <>
                        <p className="text-gray-600">[ case {i + 1} ] stdout ──</p>
                        <p className="text-green-400 whitespace-pre-wrap ml-2">{r.stdout || '(no output)'}</p>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* Custom input */}
          {outputTab === 'custom' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Standard Input (stdin)
                </label>
                <textarea
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  rows={3}
                  className="w-full font-mono text-xs bg-gray-950 text-gray-300 border border-gray-800 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Enter custom test input…"
                />
              </div>
              <button
                onClick={handleRunCustom}
                disabled={runningCustom}
                className="flex items-center gap-1.5 bg-gray-800 text-white text-xs font-semibold px-4 py-2 rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors"
              >
                {runningCustom
                  ? <><Loader size={11} className="animate-spin" /> Running…</>
                  : <><Play size={11} fill="white" /> Run Custom Input</>
                }
              </button>
              {customResult && !runningCustom && (
                <div className={`rounded-xl border p-3 font-mono text-xs space-y-1 ${
                  customResult.error
                    ? 'bg-red-50 border-red-200'
                    : 'bg-emerald-50 border-emerald-200'
                }`}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <StatusPill result={customResult} />
                    {customResult.time   && <span className="text-gray-400 text-xs">{customResult.time}</span>}
                    {customResult.memory && <span className="text-gray-400 text-xs">{customResult.memory}</span>}
                  </div>
                  {customResult.error
                    ? <p className="text-red-600 whitespace-pre-wrap">{customResult.error}</p>
                    : <p className="text-emerald-700 whitespace-pre-wrap">{customResult.stdout || '(no output)'}</p>
                  }
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
