import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Clock, ChevronLeft, ChevronRight, CheckCircle,
  AlertTriangle, Send, Maximize2, Minimize2,
  List, X, HelpCircle, AlertCircle,
} from 'lucide-react'
import Logo from '../../components/Logo'
import CodeEditorPane from '../../components/CodeEditorPane'
import { PROBLEMS } from '../../data/problems'

// ─── Difficulty badge colours ─────────────────────────────────────────────────
const DIFF = {
  Easy:   'bg-emerald-100 text-emerald-700',
  Medium: 'bg-amber-100 text-amber-700',
  Hard:   'bg-red-100 text-red-600',
}

// ─── Problem-list dropdown ────────────────────────────────────────────────────
function ProblemNav({ currentIdx, solved, onSelect, onClose }) {
  return (
    <div className="absolute top-full left-0 mt-1 w-72 bg-white border border-gray-200 rounded-2xl shadow-xl z-50 p-2">
      <div className="flex items-center justify-between px-2 py-1.5 mb-1">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">All Problems</p>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-0.5">
          <X size={13} />
        </button>
      </div>
      {PROBLEMS.map((p, i) => (
        <button
          key={p.id}
          onClick={() => { onSelect(i); onClose() }}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${
            i === currentIdx ? 'bg-blue-50' : 'hover:bg-gray-50'
          }`}
        >
          <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
            solved[p.id] ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-500'
          }`}>
            {solved[p.id] ? '✓' : i + 1}
          </div>
          <span className={`flex-1 text-sm font-semibold truncate ${
            i === currentIdx ? 'text-blue-700' : 'text-gray-800'
          }`}>
            {p.title}
          </span>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${DIFF[p.difficulty]}`}>
            {p.difficulty}
          </span>
        </button>
      ))}
    </div>
  )
}

// ─── Left panel: problem statement ───────────────────────────────────────────
function ProblemPanel({ problem }) {
  return (
    <div className="h-full overflow-y-auto bg-white">
      <div className="p-6 space-y-5">
        {/* Tags */}
        <div className="flex items-center gap-2">
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${DIFF[problem.difficulty]}`}>
            {problem.difficulty}
          </span>
          <span className="text-gray-400 text-sm font-medium">{problem.points} pts</span>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 leading-tight">
          {problem.id}. {problem.title}
        </h1>

        <p
          className="text-gray-700 text-sm leading-relaxed"
          dangerouslySetInnerHTML={{ __html: problem.description }}
        />

        {/* Examples */}
        {problem.examples.map((ex, i) => (
          <div key={i}>
            <p className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
              <span className="text-blue-500 text-xs">ℹ</span> Example {i + 1}:
            </p>
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 font-mono text-xs space-y-1 text-gray-700">
              <div><span className="text-gray-400">Input:  </span>{ex.input}</div>
              <div><span className="text-gray-400">Output: </span>{ex.output}</div>
              {ex.explanation && (
                <div className="text-gray-500 pt-1">
                  <span className="text-gray-400">Explanation: </span>{ex.explanation}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Constraints */}
        <div>
          <p className="text-sm font-semibold text-gray-900 mb-2">Constraints:</p>
          <ul className="space-y-1.5">
            {problem.constraints.map((c, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                <span className="text-gray-300 mt-0.5 flex-shrink-0">•</span>
                <code className="font-mono text-xs bg-gray-50 px-1.5 py-0.5 rounded">{c}</code>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function CandidateInterviewPage() {
  const navigate = useNavigate()
  const TOTAL = 60 * 60
  const [timeLeft, setTimeLeft]     = useState(TOTAL)
  const [currentIdx, setCurrentIdx] = useState(0)
  const [lang, setLang]             = useState('JavaScript')
  // Per-problem, per-language code state
  const [codes, setCodes] = useState(() =>
    Object.fromEntries(
      PROBLEMS.map((p) => [p.id, { ...p.starterCode }])
    )
  )
  const [solved, setSolved]             = useState({})
  const [showNav, setShowNav]           = useState(false)
  const [fullscreen, setFullscreen]     = useState(false)
  const [showSubmitModal, setShowSubmitModal] = useState(false)
  const [showHelp, setShowHelp]         = useState(false)

  const problem = PROBLEMS[currentIdx]

  // Countdown
  useEffect(() => {
    const t = setInterval(() => setTimeLeft((s) => (s > 0 ? s - 1 : 0)), 1000)
    return () => clearInterval(t)
  }, [])

  const fmt = (s) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0')
    const sec = (s % 60).toString().padStart(2, '0')
    return `${m}:${sec}`
  }

  const timerColor = timeLeft < 300
    ? 'text-red-500'
    : timeLeft < 600
    ? 'text-amber-500'
    : 'text-gray-700'

  const handleCodeChange = (val) => {
    setCodes((prev) => ({
      ...prev,
      [problem.id]: { ...prev[problem.id], [lang]: val },
    }))
  }

  const handleLangChange = (l) => {
    setLang(l)
    // If the problem has starter code for the new lang, pre-fill only if code
    // hasn't been edited (still matches the default starter).
    // We always preserve edits, so we just switch the view.
  }

  const handleMarkSolved = () => setSolved((p) => ({ ...p, [problem.id]: true }))

  const handleFinalSubmit = () => navigate('/candidate/submitted')

  const solvedCount = Object.keys(solved).length
  const allSolved   = PROBLEMS.every((p) => solved[p.id])

  // Toolbar slot rendered inside CodeEditorPane's toolbar
  const toolbarSlot = (
    <>
      {solved[problem.id] && (
        <span className="flex items-center gap-1 text-xs text-emerald-600 font-semibold bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
          <CheckCircle size={11} /> Solved
        </span>
      )}
      <button
        onClick={handleMarkSolved}
        disabled={!!solved[problem.id]}
        className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
      >
        <CheckCircle size={11} /> Mark Solved
      </button>
    </>
  )

  return (
    <div
      className={`flex flex-col bg-white ${fullscreen ? 'fixed inset-0 z-50' : ''}`}
      style={{ height: '100vh' }}
    >
      {/* ── Top bar ── */}
      <header className="h-14 border-b border-gray-200 flex items-center justify-between px-4 flex-shrink-0 bg-white z-30">
        {/* Left */}
        <div className="flex items-center gap-2 min-w-0">
          <Logo size="sm" />
          <div className="h-5 w-px bg-gray-200 mx-1" />

          {/* Problem picker */}
          <div className="relative">
            <button
              onClick={() => setShowNav(!showNav)}
              className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors"
            >
              <List size={13} />
              <span className="hidden sm:inline truncate max-w-[180px]">
                {currentIdx + 1}. {problem.title}
              </span>
              <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${DIFF[problem.difficulty]}`}>
                {problem.difficulty}
              </span>
            </button>
            {showNav && (
              <ProblemNav
                currentIdx={currentIdx}
                solved={solved}
                onSelect={setCurrentIdx}
                onClose={() => setShowNav(false)}
              />
            )}
          </div>

          {/* Prev / Next */}
          <button
            disabled={currentIdx === 0}
            onClick={() => setCurrentIdx((i) => i - 1)}
            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 disabled:opacity-30 transition-colors"
          >
            <ChevronLeft size={15} />
          </button>
          <button
            disabled={currentIdx === PROBLEMS.length - 1}
            onClick={() => setCurrentIdx((i) => i + 1)}
            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 disabled:opacity-30 transition-colors"
          >
            <ChevronRight size={15} />
          </button>

          {/* Progress pills */}
          <div className="hidden sm:flex items-center gap-1.5 ml-1">
            {PROBLEMS.map((p, i) => (
              <button
                key={p.id}
                onClick={() => setCurrentIdx(i)}
                title={p.title}
                className={`w-6 h-6 rounded-full text-[10px] font-bold transition-all ${
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
        <div className={`flex items-center gap-1.5 font-mono font-bold text-base ${timerColor}`}>
          <Clock size={15} className={timerColor} />
          {fmt(timeLeft)}
          {timeLeft < 300 && (
            <span className="text-xs font-semibold text-red-500 animate-pulse ml-1">Low time!</span>
          )}
        </div>

        {/* Right */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowHelp(!showHelp)}
            className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors"
          >
            <HelpCircle size={16} />
          </button>
          <button
            onClick={() => setFullscreen(!fullscreen)}
            className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors"
          >
            {fullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
          <button
            onClick={() => setShowSubmitModal(true)}
            className="flex items-center gap-1.5 bg-blue-600 text-white font-semibold text-sm px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Send size={13} /> Submit All
          </button>
        </div>
      </header>

      {/* ── Body: problem | editor ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Problem panel */}
        <div className="w-[42%] border-r border-gray-200 flex flex-col overflow-hidden">
          <ProblemPanel problem={problem} />
        </div>

        {/* Editor */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <CodeEditorPane
            key={`${problem.id}-${lang}`}
            code={codes[problem.id][lang]}
            onCodeChange={handleCodeChange}
            language={lang}
            onLanguageChange={handleLangChange}
            problem={problem}
            starterCode={problem.starterCode[lang]}
            readOnly={false}
            showLanguageSwitcher
            toolbarSlot={toolbarSlot}
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
          <span className="hidden sm:inline text-gray-200">|</span>
          <span className="hidden sm:inline">Auto-saved</span>
          <span className="hidden sm:inline text-gray-200">|</span>
          <span className="text-emerald-600 font-medium">{solvedCount}/{PROBLEMS.length} solved</span>
        </div>
        <div className="flex items-center gap-4 text-xs text-gray-400">
          <button className="flex items-center gap-1 hover:text-gray-600">
            <AlertCircle size={11} /> Report Issue
          </button>
          <span>v2.4.0</span>
        </div>
      </div>

      {/* ── Submit modal ── */}
      {showSubmitModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <Send size={18} className="text-blue-600" />
              </div>
              <div>
                <h2 className="font-bold text-gray-900 text-lg">Submit Assessment</h2>
                <p className="text-gray-400 text-xs">This action cannot be undone.</p>
              </div>
            </div>

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
                    <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${DIFF[p.difficulty]}`}>
                      {p.difficulty}
                    </span>
                  </div>
                  <span className={`text-xs font-semibold ${solved[p.id] ? 'text-emerald-600' : 'text-gray-400'}`}>
                    {solved[p.id] ? 'Solved' : 'Unsolved'}
                  </span>
                </div>
              ))}
            </div>

            {!allSolved && (
              <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
                <AlertTriangle size={13} className="text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700">
                  <strong>{PROBLEMS.length - solvedCount}</strong> problem(s) unsolved. Your current code for each will still be submitted.
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
                Confirm &amp; Submit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Help panel ── */}
      {showHelp && (
        <div className="fixed bottom-10 right-4 w-60 bg-white border border-gray-200 rounded-2xl shadow-xl p-4 z-50">
          <div className="flex items-center justify-between mb-3">
            <p className="font-semibold text-gray-900 text-sm">Shortcuts</p>
            <button onClick={() => setShowHelp(false)} className="text-gray-400 hover:text-gray-600">
              <X size={13} />
            </button>
          </div>
          <ul className="space-y-2 text-xs text-gray-600">
            {[
              ['Tab',     'Indent 2 spaces'],
              ['⬅ ➡',    'Switch problem'],
            ].map(([key, desc]) => (
              <li key={key} className="flex items-center justify-between gap-2">
                <span>{desc}</span>
                <kbd className="bg-gray-100 border border-gray-200 rounded px-1.5 py-0.5 font-mono text-xs">
                  {key}
                </kbd>
              </li>
            ))}
          </ul>
          <p className="text-xs text-gray-400 mt-3 leading-relaxed">
            Code is executed on Judge0 CE. Results reflect actual runtime output.
          </p>
        </div>
      )}
    </div>
  )
}
