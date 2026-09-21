import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Clock, Play, RotateCcw, ChevronLeft, ChevronRight,
  CheckCircle, AlertTriangle, Send, Maximize2, Minimize2,
  Settings, HelpCircle, AlertCircle, List, X,
} from 'lucide-react'
import Logo from '../../components/Logo'

// ─── Problem bank ────────────────────────────────────────────────────────────

const PROBLEMS = [
  {
    id: 1,
    slug: 'two-sum',
    title: 'Two Sum',
    difficulty: 'Easy',
    points: 15,
    description: `Given an array of integers <code>nums</code> and an integer <code>target</code>, return indices of the two numbers such that they add up to <code>target</code>. You may assume that each input would have exactly one solution, and you may not use the same element twice.`,
    examples: [
      {
        input: 'nums = [2, 7, 11, 15], target = 9',
        output: '[0, 1]',
        explanation: 'Because nums[0] + nums[1] == 9, we return [0, 1].',
      },
      {
        input: 'nums = [3, 2, 4], target = 6',
        output: '[1, 2]',
        explanation: 'nums[1] + nums[2] == 6.',
      },
    ],
    constraints: [
      '2 ≤ nums.length ≤ 10⁴',
      '-10⁹ ≤ nums[i] ≤ 10⁹',
      '-10⁹ ≤ target ≤ 10⁹',
      'Only one valid answer exists.',
    ],
    starterCode: {
      JavaScript: `function twoSum(nums, target) {\n  // Your solution here\n  \n}`,
      Python: `def two_sum(nums: list[int], target: int) -> list[int]:\n    # Your solution here\n    pass`,
      TypeScript: `function twoSum(nums: number[], target: number): number[] {\n  // Your solution here\n  return [];\n}`,
      Java: `class Solution {\n    public int[] twoSum(int[] nums, int target) {\n        // Your solution here\n        return new int[]{};\n    }\n}`,
      'C++': `class Solution {\npublic:\n    vector<int> twoSum(vector<int>& nums, int target) {\n        // Your solution here\n        return {};\n    }\n};`,
    },
    testCases: [
      { input: '[2,7,11,15], 9', expected: '[0,1]' },
      { input: '[3,2,4], 6', expected: '[1,2]' },
      { input: '[3,3], 6', expected: '[0,1]' },
    ],
  },
  {
    id: 2,
    slug: 'valid-parentheses',
    title: 'Valid Parentheses',
    difficulty: 'Easy',
    points: 15,
    description: `Given a string <code>s</code> containing just the characters <code>'('</code>, <code>')'</code>, <code>'{'</code>, <code>'}'</code>, <code>'['</code> and <code>']'</code>, determine if the input string is valid. An input string is valid if: open brackets must be closed by the same type of brackets, and open brackets must be closed in the correct order.`,
    examples: [
      { input: 's = "()"', output: 'true' },
      { input: 's = "()[]{}"', output: 'true' },
      { input: 's = "(]"', output: 'false' },
    ],
    constraints: [
      '1 ≤ s.length ≤ 10⁴',
      's consists of parentheses only: \'()[]{}\' ',
    ],
    starterCode: {
      JavaScript: `function isValid(s) {\n  // Your solution here\n  \n}`,
      Python: `def is_valid(s: str) -> bool:\n    # Your solution here\n    pass`,
      TypeScript: `function isValid(s: string): boolean {\n  // Your solution here\n  return false;\n}`,
      Java: `class Solution {\n    public boolean isValid(String s) {\n        // Your solution here\n        return false;\n    }\n}`,
      'C++': `class Solution {\npublic:\n    bool isValid(string s) {\n        // Your solution here\n        return false;\n    }\n};`,
    },
    testCases: [
      { input: '"()"', expected: 'true' },
      { input: '"()[]{}"', expected: 'true' },
      { input: '"(]"', expected: 'false' },
    ],
  },
  {
    id: 3,
    slug: 'lru-cache',
    title: 'LRU Cache',
    difficulty: 'Medium',
    points: 30,
    description: `Design a data structure that follows the constraints of a <strong>Least Recently Used (LRU) cache</strong>. Implement the <code>LRUCache</code> class with the following functions: <code>get(key)</code> — return the value of the key if it exists, otherwise return <code>-1</code>; <code>put(key, value)</code> — update or insert the value. When the cache reaches its capacity, invalidate the least recently used key before inserting.`,
    examples: [
      {
        input: 'LRUCache(2) → put(1,1) → put(2,2) → get(1) → put(3,3) → get(2) → put(4,4) → get(1) → get(3) → get(4)',
        output: '[null, null, null, 1, null, -1, null, -1, 3, 4]',
        explanation: 'Capacity 2. After put(3,3), key 2 is evicted (LRU). After put(4,4), key 1 is evicted.',
      },
    ],
    constraints: [
      '1 ≤ capacity ≤ 3000',
      '0 ≤ key ≤ 10⁴',
      '0 ≤ value ≤ 10⁵',
      'At most 2 × 10⁵ calls will be made to get and put.',
    ],
    starterCode: {
      JavaScript: `class LRUCache {\n  constructor(capacity) {\n    this.capacity = capacity;\n    // Your implementation here\n  }\n  \n  get(key) {\n    // Your implementation here\n  }\n  \n  put(key, value) {\n    // Your implementation here\n  }\n}`,
      Python: `class LRUCache:\n    def __init__(self, capacity: int):\n        self.capacity = capacity\n        # Your implementation here\n\n    def get(self, key: int) -> int:\n        # Your implementation here\n        pass\n\n    def put(self, key: int, value: int) -> None:\n        # Your implementation here\n        pass`,
      TypeScript: `class LRUCache {\n  constructor(private capacity: number) {\n    // Your implementation here\n  }\n\n  get(key: number): number {\n    // Your implementation here\n    return -1;\n  }\n\n  put(key: number, value: number): void {\n    // Your implementation here\n  }\n}`,
      Java: `class LRUCache {\n    public LRUCache(int capacity) {\n        // Your implementation here\n    }\n\n    public int get(int key) {\n        // Your implementation here\n        return -1;\n    }\n\n    public void put(int key, int value) {\n        // Your implementation here\n    }\n}`,
      'C++': `class LRUCache {\npublic:\n    LRUCache(int capacity) {\n        // Your implementation here\n    }\n\n    int get(int key) {\n        // Your implementation here\n        return -1;\n    }\n\n    void put(int key, int value) {\n        // Your implementation here\n    }\n};`,
    },
    testCases: [
      { input: 'cap=2, ops=[put(1,1),put(2,2),get(1)]', expected: '1' },
      { input: 'cap=2, ops=[put(1,1),put(2,2),put(3,3),get(2)]', expected: '-1' },
      { input: 'cap=1, ops=[put(2,1),get(2),put(3,2),get(2),get(3)]', expected: '1,-1,2' },
    ],
  },
]

const LANGUAGES = ['JavaScript', 'Python', 'TypeScript', 'Java', 'C++']

const DIFF_COLORS = {
  Easy: 'bg-emerald-100 text-emerald-700',
  Medium: 'bg-amber-100 text-amber-700',
  Hard: 'bg-red-100 text-red-600',
}

// ─── Mock run output ──────────────────────────────────────────────────────────

function mockRunOutput(problem) {
  const lines = problem.testCases.map((tc, i) => ({
    id: i + 1,
    input: tc.input,
    expected: tc.expected,
    actual: tc.expected, // mock: all pass
    passed: true,
    ms: Math.floor(Math.random() * 30) + 10,
  }))
  return lines
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ProblemNav({ problems, currentIdx, solved, onSelect, onClose }) {
  return (
    <div className="absolute top-full left-0 mt-1 w-72 bg-white border border-gray-200 rounded-2xl shadow-xl z-50 p-3">
      <div className="flex items-center justify-between mb-2 px-1">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">All Problems</p>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <X size={14} />
        </button>
      </div>
      {problems.map((p, i) => (
        <button
          key={p.id}
          onClick={() => { onSelect(i); onClose() }}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${
            i === currentIdx ? 'bg-blue-50' : 'hover:bg-gray-50'
          }`}
        >
          <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${
            solved[p.id] ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-500'
          }`}>
            {solved[p.id] ? '✓' : i + 1}
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-semibold truncate ${i === currentIdx ? 'text-blue-700' : 'text-gray-800'}`}>
              {p.title}
            </p>
          </div>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${DIFF_COLORS[p.difficulty]}`}>
            {p.difficulty}
          </span>
        </button>
      ))}
    </div>
  )
}

function ProblemPanel({ problem }) {
  return (
    <div className="h-full overflow-y-auto p-6 space-y-5">
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${DIFF_COLORS[problem.difficulty]}`}>
          {problem.difficulty}
        </span>
        <span className="text-gray-400 text-sm font-medium">{problem.points} Points</span>
      </div>

      <h1 className="text-2xl font-bold text-gray-900">
        {problem.id}. {problem.title}
      </h1>

      <p
        className="text-gray-700 text-sm leading-relaxed"
        dangerouslySetInnerHTML={{ __html: problem.description }}
      />

      <div className="space-y-3">
        {problem.examples.map((ex, i) => (
          <div key={i}>
            <p className="text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
              <span className="text-blue-500">ℹ</span> Example {i + 1}:
            </p>
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 font-mono text-xs space-y-1 text-gray-700">
              <p><span className="text-gray-400">Input:</span></p>
              <p className="ml-3">{ex.input}</p>
              <p className="mt-1.5"><span className="text-gray-400">Output:</span></p>
              <p className="ml-3">{ex.output}</p>
              {ex.explanation && (
                <>
                  <p className="mt-1.5"><span className="text-gray-400">Explanation:</span></p>
                  <p className="ml-3 text-xs text-gray-500">{ex.explanation}</p>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      <div>
        <p className="font-semibold text-gray-900 mb-2.5 text-sm">Constraints:</p>
        <ul className="space-y-1.5">
          {problem.constraints.map((c, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
              <span className="text-gray-300 mt-0.5">•</span>
              <code className="font-mono text-xs bg-gray-50 px-1.5 py-0.5 rounded">{c}</code>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function CodeEditor({ code, onChange, language }) {
  const textareaRef = useRef(null)

  const handleKeyDown = (e) => {
    if (e.key === 'Tab') {
      e.preventDefault()
      const start = e.target.selectionStart
      const end = e.target.selectionEnd
      const newCode = code.substring(0, start) + '  ' + code.substring(end)
      onChange(newCode)
      setTimeout(() => {
        textareaRef.current.selectionStart = start + 2
        textareaRef.current.selectionEnd = start + 2
      }, 0)
    }
  }

  return (
    <div className="relative flex-1 overflow-hidden bg-gray-900">
      {/* Line numbers + editable textarea overlay */}
      <div className="flex h-full overflow-auto scrollbar-thin">
        {/* Line numbers */}
        <div className="select-none bg-gray-900 text-gray-600 font-mono text-xs pt-4 pb-4 pl-3 pr-2 text-right min-w-[2.5rem] leading-6">
          {code.split('\n').map((_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>
        {/* Editable area */}
        <textarea
          ref={textareaRef}
          value={code}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          spellCheck={false}
          autoCapitalize="none"
          autoCorrect="off"
          className="flex-1 bg-transparent text-gray-300 font-mono text-xs leading-6 pt-4 pb-4 pr-4 outline-none resize-none caret-white"
          style={{ minHeight: '100%' }}
        />
      </div>
    </div>
  )
}

function OutputPanel({ results, running, activeTab, onTabChange }) {
  return (
    <div className="flex flex-col border-t border-gray-200 bg-white" style={{ height: '220px' }}>
      <div className="flex items-center justify-between px-4 pt-2 border-b border-gray-100 flex-shrink-0">
        <div className="flex gap-3">
          {['Test Cases', 'Console'].map((tab) => (
            <button
              key={tab}
              onClick={() => onTabChange(tab)}
              className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 pb-1">
          {results && !running && (
            <span className={`text-xs font-semibold flex items-center gap-1 ${
              results.every((r) => r.passed) ? 'text-emerald-600' : 'text-red-500'
            }`}>
              {results.every((r) => r.passed) ? (
                <><CheckCircle size={13} /> All {results.length} passed</>
              ) : (
                <><AlertTriangle size={13} /> Some tests failed</>
              )}
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {running ? (
          <div className="flex items-center gap-2 text-gray-500 text-sm">
            <svg className="animate-spin h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Running test cases…
          </div>
        ) : !results ? (
          <p className="text-gray-400 text-sm">Click <strong>Run Code</strong> to execute against test cases.</p>
        ) : activeTab === 'Test Cases' ? (
          <div className="space-y-2.5">
            {results.map((r) => (
              <div
                key={r.id}
                className={`rounded-xl border px-4 py-3 text-xs font-mono ${
                  r.passed
                    ? 'bg-emerald-50 border-emerald-200'
                    : 'bg-red-50 border-red-200'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`font-bold text-xs ${r.passed ? 'text-emerald-700' : 'text-red-600'}`}>
                    {r.passed ? '✓' : '✗'} Test Case #{r.id}
                  </span>
                  <span className="text-gray-400">{r.ms}ms</span>
                </div>
                <p className="text-gray-500">Input: <span className="text-gray-800">{r.input}</span></p>
                <p className="text-gray-500">Expected: <span className="text-gray-800">{r.expected}</span></p>
                {!r.passed && (
                  <p className="text-gray-500">Got: <span className="text-red-600">{r.actual}</span></p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="font-mono text-xs text-gray-300 space-y-0.5 bg-gray-900 rounded-xl p-3">
            {results.map((r) => (
              <p key={r.id}>
                [{new Date().toLocaleTimeString()}] Test Case #{r.id}:{' '}
                <span className={r.passed ? 'text-emerald-400' : 'text-red-400'}>
                  {r.passed ? 'Passed' : 'Failed'}
                </span>{' '}
                ({r.ms}ms)
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function CandidateInterviewPage() {
  const navigate = useNavigate()
  const TOTAL_SECS = 60 * 60
  const [timeLeft, setTimeLeft] = useState(TOTAL_SECS)
  const [currentIdx, setCurrentIdx] = useState(0)
  const [lang, setLang] = useState('JavaScript')
  const [codes, setCodes] = useState(() =>
    Object.fromEntries(PROBLEMS.map((p) => [p.id, { ...p.starterCode }]))
  )
  const [solved, setSolved] = useState({})
  const [outputTab, setOutputTab] = useState('Test Cases')
  const [runResults, setRunResults] = useState(null)
  const [running, setRunning] = useState(false)
  const [showNav, setShowNav] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const [showSubmitModal, setShowSubmitModal] = useState(false)
  const [showHelp, setShowHelp] = useState(false)

  const problem = PROBLEMS[currentIdx]

  // Countdown
  useEffect(() => {
    const t = setInterval(() => setTimeLeft((s) => (s > 0 ? s - 1 : 0)), 1000)
    return () => clearInterval(t)
  }, [])

  // Reset output when switching problems
  useEffect(() => { setRunResults(null) }, [currentIdx])

  const fmt = (s) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0')
    const sec = (s % 60).toString().padStart(2, '0')
    return `${m}:${sec}`
  }

  const timerColor = timeLeft < 300 ? 'text-red-500' : timeLeft < 600 ? 'text-amber-500' : 'text-gray-700'

  const handleCodeChange = (val) => {
    setCodes((prev) => ({
      ...prev,
      [problem.id]: { ...prev[problem.id], [lang]: val },
    }))
  }

  const handleRun = () => {
    setRunning(true)
    setRunResults(null)
    setOutputTab('Test Cases')
    setTimeout(() => {
      setRunResults(mockRunOutput(problem))
      setRunning(false)
    }, 1000)
  }

  const handleReset = () => {
    setCodes((prev) => ({
      ...prev,
      [problem.id]: { ...prev[problem.id], [lang]: problem.starterCode[lang] },
    }))
    setRunResults(null)
  }

  const handleMarkSolved = () => {
    setSolved((prev) => ({ ...prev, [problem.id]: true }))
  }

  const handleFinalSubmit = () => {
    navigate('/candidate/submitted')
  }

  const allSolved = PROBLEMS.every((p) => solved[p.id])
  const solvedCount = Object.keys(solved).length

  return (
    <div className={`flex flex-col bg-white ${fullscreen ? 'fixed inset-0 z-50' : 'min-h-screen'}`}
      style={{ height: fullscreen ? '100vh' : '100vh' }}>

      {/* ── Top bar ── */}
      <header className="h-14 border-b border-gray-200 flex items-center justify-between px-4 flex-shrink-0 bg-white z-30">
        {/* Left */}
        <div className="flex items-center gap-3">
          <Logo size="sm" />
          <div className="h-5 w-px bg-gray-200" />
          {/* Problem nav trigger */}
          <div className="relative">
            <button
              onClick={() => setShowNav(!showNav)}
              className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors"
            >
              <List size={14} />
              <span>
                {currentIdx + 1}. {problem.title}
              </span>
              <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${DIFF_COLORS[problem.difficulty]}`}>
                {problem.difficulty}
              </span>
            </button>
            {showNav && (
              <ProblemNav
                problems={PROBLEMS}
                currentIdx={currentIdx}
                solved={solved}
                onSelect={setCurrentIdx}
                onClose={() => setShowNav(false)}
              />
            )}
          </div>
          {/* Prev / Next */}
          <div className="flex items-center gap-1">
            <button
              disabled={currentIdx === 0}
              onClick={() => setCurrentIdx((i) => i - 1)}
              className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 disabled:opacity-30 transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              disabled={currentIdx === PROBLEMS.length - 1}
              onClick={() => setCurrentIdx((i) => i + 1)}
              className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 disabled:opacity-30 transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
          {/* Progress pills */}
          <div className="hidden sm:flex items-center gap-1.5">
            {PROBLEMS.map((p, i) => (
              <button
                key={p.id}
                onClick={() => setCurrentIdx(i)}
                title={p.title}
                className={`w-6 h-6 rounded-full text-xs font-bold transition-all ${
                  solved[p.id]
                    ? 'bg-emerald-500 text-white'
                    : i === currentIdx
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-500 hover:bg-gray-300'
                }`}
              >
                {solved[p.id] ? '✓' : i + 1}
              </button>
            ))}
          </div>
        </div>

        {/* Center — timer */}
        <div className={`flex items-center gap-2 font-mono font-bold text-lg ${timerColor}`}>
          <Clock size={16} className={timerColor} />
          {fmt(timeLeft)}
          {timeLeft < 300 && (
            <span className="text-xs font-semibold text-red-500 animate-pulse">Low time!</span>
          )}
        </div>

        {/* Right */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowHelp(!showHelp)}
            className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors"
          >
            <HelpCircle size={17} />
          </button>
          <button
            onClick={() => setFullscreen(!fullscreen)}
            className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors"
          >
            {fullscreen ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
          </button>
          <button
            onClick={() => setShowSubmitModal(true)}
            className="flex items-center gap-2 bg-blue-600 text-white font-semibold text-sm px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Send size={14} />
            Submit All
          </button>
        </div>
      </header>

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Problem panel */}
        <div className="w-[42%] border-r border-gray-200 flex flex-col overflow-hidden">
          <ProblemPanel problem={problem} />
        </div>

        {/* Editor + output */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Editor toolbar */}
          <div className="border-b border-gray-200 px-4 py-2 flex items-center justify-between flex-shrink-0 bg-white">
            <div className="flex items-center gap-2">
              <div className="flex border border-gray-200 rounded-lg overflow-hidden">
                {LANGUAGES.map((l) => (
                  <button
                    key={l}
                    onClick={() => setLang(l)}
                    className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                      lang === l
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>
              <button className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                <Settings size={14} />
              </button>
            </div>
            <div className="flex items-center gap-2">
              {solved[problem.id] && (
                <span className="flex items-center gap-1 text-xs text-emerald-600 font-semibold bg-emerald-50 px-2 py-1 rounded-full">
                  <CheckCircle size={12} /> Marked solved
                </span>
              )}
              <button
                onClick={handleReset}
                className="flex items-center gap-1.5 text-xs text-gray-500 border border-gray-200 rounded-lg px-2.5 py-1.5 hover:bg-gray-50 transition-colors"
              >
                <RotateCcw size={12} /> Reset
              </button>
              <button
                onClick={handleRun}
                className="flex items-center gap-1.5 bg-gray-900 text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-gray-700 transition-colors"
              >
                <Play size={11} fill="white" /> Run Code
              </button>
              <button
                onClick={handleMarkSolved}
                disabled={!!solved[problem.id]}
                className="flex items-center gap-1.5 bg-emerald-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <CheckCircle size={12} /> Mark Solved
              </button>
            </div>
          </div>

          {/* Code area */}
          <CodeEditor
            code={codes[problem.id][lang]}
            onChange={handleCodeChange}
            language={lang}
          />

          {/* Output */}
          <OutputPanel
            results={runResults}
            running={running}
            activeTab={outputTab}
            onTabChange={setOutputTab}
          />
        </div>
      </div>

      {/* ── Status bar ── */}
      <div className="h-7 bg-white border-t border-gray-100 flex items-center justify-between px-5 flex-shrink-0">
        <div className="flex items-center gap-4 text-xs text-gray-400">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            Proctoring Active
          </span>
          <span className="text-gray-200">|</span>
          <span>Auto-saved just now</span>
          <span className="text-gray-200">|</span>
          <span className="text-emerald-600 font-medium">{solvedCount}/{PROBLEMS.length} solved</span>
        </div>
        <div className="flex items-center gap-4 text-xs text-gray-400">
          <button className="flex items-center gap-1 hover:text-gray-600">
            <AlertCircle size={11} /> Report Issue
          </button>
          <span>v2.4.0-stable</span>
        </div>
      </div>

      {/* ── Submit confirmation modal ── */}
      {showSubmitModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                <Send size={18} className="text-blue-600" />
              </div>
              <div>
                <h2 className="font-bold text-gray-900 text-lg">Submit Assessment</h2>
                <p className="text-gray-500 text-xs">This action cannot be undone.</p>
              </div>
            </div>

            {/* Solved status */}
            <div className="space-y-2 mb-5">
              {PROBLEMS.map((p) => (
                <div key={p.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                      solved[p.id] ? 'bg-emerald-500 text-white' : 'bg-gray-300 text-gray-600'
                    }`}>
                      {solved[p.id] ? '✓' : p.id}
                    </div>
                    <span className="text-sm font-medium text-gray-800">{p.title}</span>
                  </div>
                  <span className={`text-xs font-semibold ${solved[p.id] ? 'text-emerald-600' : 'text-gray-400'}`}>
                    {solved[p.id] ? 'Solved' : 'Unsolved'}
                  </span>
                </div>
              ))}
            </div>

            {!allSolved && (
              <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
                <AlertTriangle size={14} className="text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700">
                  You have <strong>{PROBLEMS.length - solvedCount} unsolved</strong> problem(s). You can still submit — your code for each problem will be evaluated.
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setShowSubmitModal(false)}
                className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Go Back
              </button>
              <button
                onClick={handleFinalSubmit}
                className="flex-1 bg-blue-600 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-blue-700 transition-colors"
              >
                Confirm & Submit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Help tooltip ── */}
      {showHelp && (
        <div className="fixed bottom-10 right-5 w-64 bg-white border border-gray-200 rounded-2xl shadow-xl p-4 z-50">
          <div className="flex items-center justify-between mb-3">
            <p className="font-semibold text-gray-900 text-sm">Keyboard Shortcuts</p>
            <button onClick={() => setShowHelp(false)} className="text-gray-400 hover:text-gray-600">
              <X size={14} />
            </button>
          </div>
          <ul className="space-y-2 text-xs text-gray-600">
            {[
              ['Tab', 'Indent code (2 spaces)'],
              ['Ctrl+Enter', 'Run code'],
              ['⬅ ➡', 'Navigate problems'],
            ].map(([key, desc]) => (
              <li key={key} className="flex items-center justify-between">
                <span>{desc}</span>
                <kbd className="bg-gray-100 border border-gray-200 rounded px-1.5 py-0.5 font-mono text-xs">{key}</kbd>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
