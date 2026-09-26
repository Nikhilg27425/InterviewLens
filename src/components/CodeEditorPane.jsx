/**
 * CodeEditorPane — VS Code-inspired editor with real Judge0 execution.
 *
 * Improvements over previous version:
 *  - VS Code dark theme (exact token colours for JS/TS/Python/Java/C++)
 *  - Resizable editor/output split via drag handle
 *  - Font-size controls (10–20px)
 *  - Line-highlight on current row
 *  - Minimap-style scrollbar gutter
 *  - Better output panel: LeetCode-style verdict banner + detailed cards
 *  - Compilation error diff view
 *  - Execution summary row (time, memory, status) at output header
 *  - Smooth skeleton loading during run
 */

import React, {
  useRef, useMemo, useState, useCallback, useEffect,
} from 'react'
import {
  Play, RotateCcw, CheckCircle, XCircle, AlertTriangle,
  Loader, ChevronDown, ChevronUp, Terminal, FlaskConical,
  SlidersHorizontal, ZoomIn, ZoomOut, Minus, Plus,
  Copy, Check,
} from 'lucide-react'
import hljs from 'highlight.js/lib/core'
import javascript from 'highlight.js/lib/languages/javascript'
import typescript from 'highlight.js/lib/languages/typescript'
import python    from 'highlight.js/lib/languages/python'
import java      from 'highlight.js/lib/languages/java'
import cpp       from 'highlight.js/lib/languages/cpp'
import { LANGUAGES, runAllTestCases, runTestCase } from '../services/judge0'

hljs.registerLanguage('javascript', javascript)
hljs.registerLanguage('typescript', typescript)
hljs.registerLanguage('python',     python)
hljs.registerLanguage('java',       java)
hljs.registerLanguage('cpp',        cpp)

const HLJS_LANG = {
  JavaScript: 'javascript',
  TypeScript: 'typescript',
  Python:     'python',
  Java:       'java',
  'C++':      'cpp',
}

// ── VS Code One Dark Pro token colours injected as CSS vars ──────────────────
const VSCODE_STYLE = `
  .vscode-editor .hljs { background: transparent; color: #abb2bf; }
  .vscode-editor .hljs-comment,
  .vscode-editor .hljs-quote    { color: #5c6370; font-style: italic; }
  .vscode-editor .hljs-keyword,
  .vscode-editor .hljs-selector-tag,
  .vscode-editor .hljs-built_in { color: #c678dd; }
  .vscode-editor .hljs-string,
  .vscode-editor .hljs-attr,
  .vscode-editor .hljs-selector-attr { color: #98c379; }
  .vscode-editor .hljs-number,
  .vscode-editor .hljs-literal      { color: #d19a66; }
  .vscode-editor .hljs-title,
  .vscode-editor .hljs-section      { color: #61afef; }
  .vscode-editor .hljs-type,
  .vscode-editor .hljs-class .hljs-title { color: #e5c07b; }
  .vscode-editor .hljs-variable,
  .vscode-editor .hljs-template-variable { color: #e06c75; }
  .vscode-editor .hljs-params        { color: #abb2bf; }
  .vscode-editor .hljs-meta          { color: #56b6c2; }
  .vscode-editor .hljs-operator,
  .vscode-editor .hljs-punctuation   { color: #abb2bf; }
  .vscode-editor .hljs-function .hljs-title,
  .vscode-editor .hljs-title.function_ { color: #61afef; }
  .vscode-editor .hljs-property       { color: #e06c75; }
  .vscode-editor .hljs-tag            { color: #e06c75; }
  .vscode-editor .hljs-regexp         { color: #98c379; }
`

// ── Language badge colours ────────────────────────────────────────────────────
const LANG_COLORS = {
  JavaScript: { bg: '#f7df1e22', border: '#f7df1e55', text: '#f7df1e', dot: '#f7df1e' },
  TypeScript: { bg: '#3178c622', border: '#3178c655', text: '#60a5fa', dot: '#3b82f6' },
  Python:     { bg: '#3776ab22', border: '#3776ab55', text: '#4ade80', dot: '#22c55e' },
  Java:       { bg: '#b07219aa', border: '#b0721966', text: '#fb923c', dot: '#f97316' },
  'C++':      { bg: '#00599c22', border: '#00599c55', text: '#7dd3fc', dot: '#38bdf8' },
}

// ── Verdict banner config ────────────────────────────────────────────────────
function VerdictBanner({ results }) {
  if (!results?.length) return null
  const total   = results.length
  const passed  = results.filter((r) => r.passed).length
  const allPass = passed === total
  const hasErr  = results.some((r) => r.statusType === 'error')
  const hasTLE  = results.some((r) => r.statusType === 'tle')

  if (allPass) {
    return (
      <div className="flex items-center gap-3 px-4 py-2.5 bg-emerald-500/10 border-b border-emerald-500/20">
        <CheckCircle size={16} className="text-emerald-400 flex-shrink-0" />
        <div>
          <p className="text-sm font-bold text-emerald-400">Accepted</p>
          <p className="text-xs text-emerald-500/80">{passed}/{total} test cases passed</p>
        </div>
        <div className="ml-auto flex items-center gap-4 text-xs text-gray-400">
          {results[0]?.time   && <span>⏱ {results[0].time}</span>}
          {results[0]?.memory && <span>💾 {results[0].memory}</span>}
        </div>
      </div>
    )
  }
  if (hasErr) {
    return (
      <div className="flex items-center gap-3 px-4 py-2.5 bg-red-500/10 border-b border-red-500/20">
        <XCircle size={16} className="text-red-400 flex-shrink-0" />
        <div>
          <p className="text-sm font-bold text-red-400">
            {results.find((r) => r.statusType === 'error')?.statusLabel || 'Runtime Error'}
          </p>
          <p className="text-xs text-red-500/80">{passed}/{total} test cases passed</p>
        </div>
      </div>
    )
  }
  if (hasTLE) {
    return (
      <div className="flex items-center gap-3 px-4 py-2.5 bg-amber-500/10 border-b border-amber-500/20">
        <AlertTriangle size={16} className="text-amber-400 flex-shrink-0" />
        <div>
          <p className="text-sm font-bold text-amber-400">Time Limit Exceeded</p>
          <p className="text-xs text-amber-500/80">{passed}/{total} test cases passed</p>
        </div>
      </div>
    )
  }
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-red-500/10 border-b border-red-500/20">
      <XCircle size={16} className="text-red-400 flex-shrink-0" />
      <div>
        <p className="text-sm font-bold text-red-400">Wrong Answer</p>
        <p className="text-xs text-red-500/80">{passed}/{total} test cases passed</p>
      </div>
    </div>
  )
}

// ── Test-case result card ────────────────────────────────────────────────────
function TestCard({ result, idx }) {
  const [open, setOpen] = useState(idx === 0)

  const isRunning = result.running
  const isPassed  = !isRunning && result.passed
  const isError   = !isRunning && result.statusType === 'error'
  const isWrong   = !isRunning && !isPassed && !isError

  const border = isRunning ? 'border-blue-500/30 bg-[#1a2035]'
    : isPassed ? 'border-emerald-500/30 bg-[#0d1f17]'
    : isError  ? 'border-red-500/30    bg-[#1f0d0d]'
    : 'border-amber-500/30  bg-[#1f1a0d]'

  const icon = isRunning
    ? <Loader size={13} className="text-blue-400 animate-spin" />
    : isPassed
    ? <CheckCircle size={13} className="text-emerald-400" />
    : isError
    ? <XCircle size={13} className="text-red-400" />
    : <AlertTriangle size={13} className="text-amber-400" />

  return (
    <div className={`rounded-lg border overflow-hidden ${border}`}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left"
      >
        {icon}
        <span className="text-sm font-semibold text-gray-200 flex-1 truncate">
          Case {idx + 1}
          {result.input ? <span className="text-gray-500 font-normal ml-2 text-xs">{result.input}</span> : ''}
        </span>
        {result.time   && <span className="text-xs text-gray-500 font-mono">{result.time}</span>}
        {result.memory && <span className="text-xs text-gray-500 font-mono ml-2">{result.memory}</span>}
        {open
          ? <ChevronUp   size={13} className="text-gray-600 flex-shrink-0" />
          : <ChevronDown size={13} className="text-gray-600 flex-shrink-0" />
        }
      </button>

      {open && !isRunning && (
        <div className="border-t border-white/5 px-3.5 py-3 space-y-2 font-mono text-xs">
          {result.input && (
            <DiffRow label="Input"    value={result.input} />
          )}
          {result.expected && (
            <DiffRow label="Expected" value={result.expected} color="text-gray-300" />
          )}
          {!isPassed && result.stdout !== '' && result.stdout !== undefined && (
            <DiffRow
              label="Got"
              value={result.stdout || '(empty)'}
              color="text-red-300"
              highlight
            />
          )}
          {isPassed && result.stdout !== undefined && (
            <DiffRow label="Output" value={result.stdout || '(empty)'} color="text-emerald-300" />
          )}
          {result.error && (
            <div className="mt-2 bg-red-950/50 border border-red-800/40 rounded-md p-2">
              <p className="text-red-400 font-bold mb-1">
                {result.statusLabel}
              </p>
              <pre className="text-red-300 whitespace-pre-wrap text-xs leading-relaxed">
                {result.error}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function DiffRow({ label, value, color = 'text-gray-400', highlight = false }) {
  return (
    <div className="flex gap-2.5">
      <span className="text-gray-600 w-[4.5rem] flex-shrink-0">{label}:</span>
      <span className={`break-all leading-relaxed ${color} ${highlight ? 'bg-red-950/40 px-1 rounded' : ''}`}>
        {value}
      </span>
    </div>
  )
}

// ── Copy button ──────────────────────────────────────────────────────────────
function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(text).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <button
      onClick={copy}
      className="p-1.5 rounded text-gray-600 hover:text-gray-300 hover:bg-white/5 transition-colors"
      title="Copy code"
    >
      {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
    </button>
  )
}

// ── Skeleton loader for cards ────────────────────────────────────────────────
function SkeletonCard({ idx }) {
  return (
    <div className="rounded-lg border border-blue-500/20 bg-[#1a2035] px-3.5 py-3 animate-pulse">
      <div className="flex items-center gap-2.5">
        <Loader size={13} className="text-blue-400 animate-spin" />
        <div className="h-3 w-24 bg-gray-700 rounded" />
        <div className="ml-auto h-3 w-12 bg-gray-700 rounded" />
      </div>
    </div>
  )
}

// ── Main exported component ──────────────────────────────────────────────────
export default function CodeEditorPane({
  code = '',
  onCodeChange,
  language = 'JavaScript',
  onLanguageChange,
  problem,
  starterCode = '',
  readOnly     = false,
  showLanguageSwitcher = true,
  toolbarSlot  = null,
  onSignal,          // callback(type, detail) for proctoring events
  onRunAll,          // optional async ({ code, language }) => results; replaces the default runner
}) {
  const textareaRef  = useRef(null)
  const highlightRef = useRef(null)
  const gutterRef    = useRef(null)
  const paneRef      = useRef(null)

  // ── state ──
  const [outputTab,    setOutputTab]    = useState('testcases')
  const [testResults,  setTestResults]  = useState([])
  const [customResult, setCustomResult] = useState(null)
  const [customInput,  setCustomInput]  = useState(problem?.customTestDefault ?? '')
  const [running,      setRunning]      = useState(false)
  const [runningCustom, setRunningCustom] = useState(false)
  const [fontSize,     setFontSize]     = useState(13)
  const [outputHeight, setOutputHeight] = useState(260)
  const [isDragging,   setIsDragging]   = useState(false)
  const dragStart = useRef(null)

  // ── inject VS Code styles once ──
  useEffect(() => {
    if (document.getElementById('vscode-hljs-style')) return
    const el = document.createElement('style')
    el.id = 'vscode-hljs-style'
    el.textContent = VSCODE_STYLE
    document.head.appendChild(el)
  }, [])

  // ── syntax highlight ──
  const highlighted = useMemo(() => {
    try {
      return hljs.highlight(code || '', {
        language: HLJS_LANG[language] || 'javascript',
      }).value
    } catch { return code || '' }
  }, [code, language])

  // ── line count ──
  const lineCount = useMemo(() => (code || '').split('\n').length, [code])

  // ── scroll sync ──
  const syncScroll = useCallback(() => {
    if (!highlightRef.current || !textareaRef.current) return
    highlightRef.current.scrollTop  = textareaRef.current.scrollTop
    highlightRef.current.scrollLeft = textareaRef.current.scrollLeft
    if (gutterRef.current) gutterRef.current.scrollTop = textareaRef.current.scrollTop
  }, [])

  // ── keyboard handler ──
  const handleKeyDown = useCallback((e) => {
    if (readOnly) return
    if (e.key === 'Tab') {
      e.preventDefault()
      const ta = textareaRef.current
      const s = ta.selectionStart, en = ta.selectionEnd
      const next = code.substring(0, s) + '  ' + code.substring(en)
      onCodeChange(next)
      requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = s + 2 })
    }
    // Ctrl+/ — comment toggle (basic)
    if ((e.ctrlKey || e.metaKey) && e.key === '/') {
      e.preventDefault()
      const ta = textareaRef.current
      const lines = code.split('\n')
      const start = code.substring(0, ta.selectionStart).split('\n').length - 1
      const prefix = language === 'Python' ? '# ' : '// '
      lines[start] = lines[start].startsWith(prefix)
        ? lines[start].slice(prefix.length)
        : prefix + lines[start]
      onCodeChange(lines.join('\n'))
    }
  }, [readOnly, code, onCodeChange, language])

  // ── resize drag ──
  const onMouseDownDivider = useCallback((e) => {
    e.preventDefault()
    setIsDragging(true)
    dragStart.current = { y: e.clientY, height: outputHeight }
  }, [outputHeight])

  useEffect(() => {
    if (!isDragging) return
    const onMove = (e) => {
      const delta = dragStart.current.y - e.clientY
      const next  = Math.max(140, Math.min(500, dragStart.current.height + delta))
      setOutputHeight(next)
    }
    const onUp = () => setIsDragging(false)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup',  onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup',  onUp)
    }
  }, [isDragging])

  // ── Run all test cases ──
  const handleRunAll = useCallback(async () => {
    if (!problem?.testCases?.length) return
    setRunning(true)
    setOutputTab('testcases')
    setTestResults(
      problem.testCases.map((tc, i) => ({
        id: i + 1, input: tc.label ?? tc.stdin,
        expected: tc.expected, running: true,
      }))
    )
    try {
      const results = onRunAll
        ? await onRunAll({ code, language })
        : await runAllTestCases({ code, language, testCases: problem.testCases })
      setTestResults(results)
    } catch (err) {
      setTestResults(problem.testCases.map((tc, i) => ({
        id: i + 1, input: tc.label ?? tc.stdin, expected: tc.expected,
        running: false, passed: false,
        statusId: 13, statusLabel: 'Network Error', statusType: 'error',
        error: `Code execution failed: ${err.response?.data?.detail || err.message}`, stdout: '',
      })))
    } finally {
      setRunning(false)
    }
  }, [code, language, problem, onRunAll])

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
        error: `Could not reach Judge0 CE: ${err.message}`, stdout: '',
      })
    } finally {
      setRunningCustom(false)
    }
  }, [code, language, customInput])

  // ── Reset ──
  const handleReset = useCallback(() => {
    onCodeChange(starterCode)
    setTestResults([])
    setCustomResult(null)
  }, [starterCode, onCodeChange])

  const allPassed = testResults.length > 0 && testResults.every((r) => r.passed && !r.running)
  const anyFailed = !allPassed && testResults.some((r) => !r.running && r.statusId)
  const lc        = LANG_COLORS[language] || LANG_COLORS.JavaScript
  const lineH     = Math.round(fontSize * 1.65)

  return (
    <div
      ref={paneRef}
      className="flex flex-col h-full overflow-hidden"
      style={{ background: '#1e1e1e', fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace" }}
    >
      {/* ── Activity bar (top chrome) ── */}
      <div
        className="flex items-center justify-between px-3 border-b flex-shrink-0"
        style={{ background: '#252526', borderColor: '#3a3a3a', height: 40 }}
      >
        {/* Left: language tabs */}
        <div className="flex items-center gap-1 h-full overflow-x-auto no-scrollbar">
          {showLanguageSwitcher && LANGUAGES.map((l) => {
            const lColor = LANG_COLORS[l]
            const active = l === language
            return (
              <button
                key={l}
                onClick={() => !readOnly && onLanguageChange?.(l)}
                disabled={readOnly}
                className="relative flex items-center gap-1.5 px-3 h-full text-xs font-medium transition-all flex-shrink-0 disabled:cursor-not-allowed"
                style={{
                  color:      active ? '#fff'           : '#858585',
                  background: active ? '#1e1e1e'        : 'transparent',
                  borderBottom: active ? `2px solid ${lColor?.dot || '#4d9ef0'}` : '2px solid transparent',
                }}
              >
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: lColor?.dot || '#888' }}
                />
                {l}
              </button>
            )
          })}
          {readOnly && (
            <span className="text-xs text-gray-600 ml-2 flex items-center gap-1">
              🔒 READ-ONLY
            </span>
          )}
        </div>

        {/* Right: controls */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {toolbarSlot}

          {/* Font size */}
          <div className="flex items-center gap-0.5 border border-gray-700 rounded px-1" style={{ background: '#2d2d2d' }}>
            <button
              onClick={() => setFontSize((s) => Math.max(10, s - 1))}
              className="p-1 text-gray-500 hover:text-gray-200 transition-colors"
              title="Decrease font size"
            >
              <Minus size={11} />
            </button>
            <span className="text-xs text-gray-400 w-7 text-center font-mono">{fontSize}</span>
            <button
              onClick={() => setFontSize((s) => Math.min(20, s + 1))}
              className="p-1 text-gray-500 hover:text-gray-200 transition-colors"
              title="Increase font size"
            >
              <Plus size={11} />
            </button>
          </div>

          <CopyButton text={code} />

          {!readOnly && (
            <button
              onClick={handleReset}
              className="flex items-center gap-1 px-2 py-1 rounded text-xs text-gray-500 hover:text-gray-200 hover:bg-white/5 transition-colors border border-gray-700"
              title="Reset to starter code"
            >
              <RotateCcw size={11} /> Reset
            </button>
          )}

          {problem?.testCases && (
            <button
              onClick={handleRunAll}
              disabled={running}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-all disabled:opacity-50"
              style={{
                background: running ? '#1a3a1a' : '#238636',
                color: '#fff',
                border: '1px solid #2ea043',
              }}
            >
              {running
                ? <><Loader size={11} className="animate-spin" /> Running…</>
                : <><Play size={11} fill="white" /> ▶ Run Code</>
              }
            </button>
          )}
        </div>
      </div>

      {/* ── Editor area ── */}
      <div className="flex-1 relative overflow-hidden" style={{ minHeight: 0 }}>

        {/* Gutter (line numbers) */}
        <div
          ref={gutterRef}
          className="absolute left-0 top-0 bottom-0 select-none pointer-events-none z-10 overflow-hidden"
          style={{ width: 48, background: '#1e1e1e', borderRight: '1px solid #2d2d2d' }}
          aria-hidden="true"
        >
          <div
            className="text-right pr-3 pt-4 pb-4"
            style={{ fontFamily: 'inherit', fontSize, lineHeight: `${lineH}px`, color: '#495162' }}
          >
            {Array.from({ length: lineCount }, (_, i) => (
              <div key={i} style={{ lineHeight: `${lineH}px` }}>{i + 1}</div>
            ))}
          </div>
        </div>

        {/* Syntax highlight overlay */}
        <pre
          ref={highlightRef}
          aria-hidden="true"
          className="vscode-editor absolute inset-0 overflow-auto pointer-events-none m-0 whitespace-pre"
          style={{
            left: 48,
            fontFamily: 'inherit',
            fontSize,
            lineHeight: `${lineH}px`,
            padding: '16px 16px 16px 12px',
            background: 'transparent',
            color: '#abb2bf',
          }}
        >
          <code
            className={`language-${HLJS_LANG[language] || 'javascript'}`}
            style={{ background: 'transparent' }}
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
          className="absolute inset-0 resize-none outline-none overflow-auto"
          style={{
            left: 48,
            fontFamily: 'inherit',
            fontSize,
            lineHeight: `${lineH}px`,
            padding: '16px 16px 16px 12px',
            background:  'transparent',
            color:       'transparent',
            caretColor:  '#aeafad',
            WebkitTextFillColor: 'transparent',
            tabSize: 2,
          }}
        />
      </div>

      {/* ── Drag divider ── */}
      <div
        onMouseDown={onMouseDownDivider}
        className="flex-shrink-0 flex items-center justify-center cursor-row-resize select-none group"
        style={{ height: 6, background: '#252526', borderTop: '1px solid #3a3a3a' }}
      >
        <div
          className="w-8 h-1 rounded-full transition-colors"
          style={{ background: isDragging ? '#4d9ef0' : '#3a3a3a' }}
        />
      </div>

      {/* ── Output panel ── */}
      <div
        className="flex-shrink-0 flex flex-col overflow-hidden"
        style={{ height: outputHeight, background: '#1e1e1e', borderTop: '1px solid #2d2d2d' }}
      >
        {/* Verdict banner */}
        {!running && testResults.length > 0 && (
          <VerdictBanner results={testResults} />
        )}

        {/* Tab bar */}
        <div
          className="flex items-center border-b flex-shrink-0"
          style={{ background: '#252526', borderColor: '#3a3a3a', height: 36 }}
        >
          {[
            { id: 'testcases', label: 'Test Cases', Icon: FlaskConical },
            { id: 'console',   label: 'Console',    Icon: Terminal },
            { id: 'custom',    label: 'Custom Input', Icon: SlidersHorizontal },
          ].map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setOutputTab(id)}
              className="flex items-center gap-1.5 px-4 h-full text-xs font-medium transition-colors relative"
              style={{
                color:      outputTab === id ? '#cdd6f4' : '#858585',
                background: outputTab === id ? '#1e1e1e'  : 'transparent',
                borderBottom: outputTab === id ? '2px solid #4d9ef0' : '2px solid transparent',
              }}
            >
              <Icon size={12} /> {label}
            </button>
          ))}

          {/* Status summary */}
          <div className="ml-auto px-3 flex items-center gap-3">
            {(running || runningCustom) && (
              <span className="flex items-center gap-1.5 text-xs text-blue-400 font-medium">
                <Loader size={11} className="animate-spin" /> Executing…
              </span>
            )}
            {!running && allPassed && (
              <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                <CheckCircle size={11} /> All {testResults.length} passed
              </span>
            )}
            {!running && anyFailed && (
              <span className="flex items-center gap-1.5 text-xs font-semibold text-red-400">
                <XCircle size={11} />{' '}
                {testResults.filter((r) => !r.passed && r.statusId).length} failed
              </span>
            )}
          </div>
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">

          {/* ─ Test Cases ─ */}
          {outputTab === 'testcases' && (
            <>
              {running
                ? problem?.testCases?.map((_, i) => <SkeletonCard key={i} idx={i} />)
                : testResults.length === 0
                ? (
                  <div className="flex flex-col items-center justify-center h-24 text-center">
                    <Play size={22} className="text-gray-700 mb-2" />
                    <p className="text-gray-500 text-sm">
                      Press <kbd className="px-1.5 py-0.5 rounded text-xs" style={{ background: '#2d2d2d', color: '#aaa', border: '1px solid #555' }}>▶ Run Code</kbd> to execute
                    </p>
                  </div>
                )
                : testResults.map((r, i) => <TestCard key={i} result={r} idx={i} />)
              }
            </>
          )}

          {/* ─ Console ─ */}
          {outputTab === 'console' && (
            <div
              className="rounded-lg p-3 font-mono text-xs leading-relaxed space-y-2"
              style={{ background: '#0d1117', minHeight: 80 }}
            >
              {testResults.length === 0 && !running ? (
                <p style={{ color: '#484f58' }}>$ No output yet — run your code first.</p>
              ) : (
                testResults.map((r, i) => (
                  <div key={i}>
                    {r.running ? (
                      <p style={{ color: '#58a6ff' }}>$ [ case {i + 1} ] running…</p>
                    ) : r.error ? (
                      <>
                        <p style={{ color: '#484f58' }}>$ [ case {i + 1} ] ── stderr ──</p>
                        <pre className="ml-3 whitespace-pre-wrap" style={{ color: '#f85149' }}>
                          {r.error}
                        </pre>
                      </>
                    ) : (
                      <>
                        <p style={{ color: '#484f58' }}>$ [ case {i + 1} ] ── stdout ──</p>
                        <pre className="ml-3 whitespace-pre-wrap" style={{ color: '#3fb950' }}>
                          {r.stdout || '(no output)'}
                        </pre>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* ─ Custom Input ─ */}
          {outputTab === 'custom' && (
            <div className="space-y-3">
              <div>
                <label
                  className="block text-xs font-semibold mb-1.5"
                  style={{ color: '#858585' }}
                >
                  Standard Input (stdin)
                </label>
                <textarea
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  rows={4}
                  className="w-full resize-none outline-none rounded-md p-3 text-xs font-mono"
                  style={{
                    background:  '#0d1117',
                    color:       '#c9d1d9',
                    border:      '1px solid #30363d',
                    lineHeight:  1.5,
                  }}
                  placeholder="Enter custom test input here…"
                />
              </div>
              <button
                onClick={handleRunCustom}
                disabled={runningCustom}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-all disabled:opacity-50"
                style={{
                  background: '#21262d',
                  color:      '#c9d1d9',
                  border:     '1px solid #30363d',
                }}
              >
                {runningCustom
                  ? <><Loader size={11} className="animate-spin" /> Running…</>
                  : <><Play size={11} fill="currentColor" /> Run Custom Input</>
                }
              </button>

              {customResult && !runningCustom && (
                <div
                  className="rounded-md p-3 font-mono text-xs space-y-1.5"
                  style={{
                    background: customResult.error ? '#1f0d0d' : '#0d1f17',
                    border:     `1px solid ${customResult.error ? '#f8514940' : '#3fb95040'}`,
                  }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    {customResult.error
                      ? <XCircle    size={13} className="text-red-400" />
                      : <CheckCircle size={13} className="text-emerald-400" />
                    }
                    <span className={`text-xs font-bold ${customResult.error ? 'text-red-400' : 'text-emerald-400'}`}>
                      {customResult.statusLabel}
                    </span>
                    {customResult.time   && <span className="text-gray-500 ml-auto">{customResult.time}</span>}
                    {customResult.memory && <span className="text-gray-500 ml-2">{customResult.memory}</span>}
                  </div>
                  {customResult.error
                    ? <pre className="whitespace-pre-wrap text-red-300">{customResult.error}</pre>
                    : <pre className="whitespace-pre-wrap text-emerald-300">{customResult.stdout || '(no output)'}</pre>
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
