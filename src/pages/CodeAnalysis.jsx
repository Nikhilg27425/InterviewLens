import React, { useState } from 'react'
import { Download, ShieldAlert, ExternalLink, ChevronLeft, ChevronRight, Copy, Maximize2, AlertTriangle } from 'lucide-react'

const CANDIDATE_CODE = `function calculateTotal(price, tax, di
  const taxAmount = price * (tax / 100
  const subtotal = price + taxAmount;

  // Apply discount logic
  if (discount > 0) {
    const discountAmount = subtotal *
    return subtotal - discountAmount;
  }

  return subtotal;
}

const checkout = (cartItems) => {
  return cartItems.reduce((acc, item)
    return acc + calculateTotal(item.p
  }, 0);
};`

const MATCH_CODE = `function getFinalPrice(amount, vatRat
  let vatValue = amount * (vatRate /
  let totalWithVat = amount + vatValu

  // Standard discount calculation
  if (premiumDiscount > 0) {
    let discVal = totalWithVat * (the
    return totalWithVat - discVal;
  }

  return totalWithVat;
}

const processBasket = (items) => {
  let runningTotal = 0;
  for (let i = 0; i < items.length; i
    runningTotal += getFinalPrice(item
  }
  return runningTotal;
};`

const auditTrail = [
  { time: '10:42 AM', user: 'System Analyst', action: 'Scan initiated via Real-time Monitoring', dot: 'gray' },
  { time: '10:43 AM', user: 'System Analyst', action: '84.2% Risk Signal triggered', dot: 'red' },
  { time: '10:45 AM', user: 'Sarah Jenkins', action: 'Viewed comparison report', dot: 'blue' },
]

function CodePanel({ title, badge, code, lang }) {
  return (
    <div className="flex-1 flex flex-col overflow-hidden rounded-xl border border-gray-700 min-w-0">
      <div className="bg-gray-800 px-4 py-2.5 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-gray-400 text-xs">📂</span>
          <span className="text-gray-300 text-xs font-semibold uppercase tracking-wide">{title}</span>
        </div>
        <span className="text-gray-400 text-xs font-mono">{lang}</span>
      </div>
      <div className="flex-1 bg-gray-900 overflow-auto scrollbar-thin p-4 font-mono text-xs text-gray-300">
        {code.split('\n').map((line, i) => (
          <div key={i} className="flex gap-3 leading-5">
            <span className="text-gray-600 w-4 text-right flex-shrink-0 select-none">{i + 1}</span>
            <span className={`whitespace-pre ${
              line.includes('//') ? 'text-gray-500' :
              line.includes('function') || line.includes('const') || line.includes('let') || line.includes('return') || line.includes('for') || line.includes('if') ? 'text-blue-400' :
              line.includes('=>') ? 'text-yellow-300' :
              'text-gray-300'
            }`}>{line}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function CodeAnalysis() {
  const [viewMode, setViewMode] = useState('Split')

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-gray-900">Code Similarity Analysis</h1>
            <span className="bg-red-100 text-red-600 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
              <AlertTriangle size={11} /> Risk Signal Detected
            </span>
          </div>
          <p className="text-gray-500 text-sm">
            Comparing Candidate ID: <span className="font-mono font-semibold text-gray-700">#7721-SM</span> against global technical repositories and historical interview data.
          </p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <button className="flex items-center gap-2 border border-gray-200 rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            <Download size={14} /> Export Report
          </button>
          <button className="flex items-center gap-2 bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-semibold hover:bg-blue-700">
            <ShieldAlert size={14} /> Mark as Suspicious
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Left: similarity breakdown */}
        <div className="space-y-4">
          {/* Score card */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-gray-500 text-sm font-mono">&gt;_</span>
              <h2 className="font-semibold text-gray-900">Similarity Breakdown</h2>
            </div>
            <div className="text-center mb-6">
              <p className="text-5xl font-extrabold text-red-500">84.2%</p>
              <p className="text-xs font-bold text-red-400 tracking-widest uppercase mt-1">HIGH RISK SIGNAL</p>
            </div>
            <div className="space-y-4">
              {[
                { label: 'Structural Similarity', desc: 'Logic flow and control structure', score: 91 },
                { label: 'Variable Mapping', desc: 'Renamed variables and constants', score: 78 },
                { label: 'Snippet Matching', desc: 'Identical small code blocks', score: 64 },
              ].map(({ label, desc, score }) => (
                <div key={label}>
                  <div className="flex justify-between items-baseline mb-1">
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{label}</p>
                      <p className="text-xs text-gray-400">{desc}</p>
                    </div>
                    <span className="text-red-500 font-bold text-sm ml-2 flex-shrink-0">{score}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-600 rounded-full" style={{ width: `${score}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Visual */}
          <div className="rounded-2xl overflow-hidden">
            <img
              src="https://images.unsplash.com/photo-1614854262318-831574f15f1f?w=400&q=80"
              alt="Code analysis visualization"
              className="w-full h-40 object-cover"
            />
          </div>

          {/* Analysis details */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-start gap-2 mb-3">
              <AlertTriangle size={15} className="text-orange-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm font-semibold text-gray-900">Analysis Details</p>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed mb-4">
              The candidate's solution for{' '}
              <span className="font-semibold">"Dynamic Checkout Logic"</span> shows high structural correlation with a publicly available repository. Manual review may be required.
            </p>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400 font-medium">Source Detected:</span>
              <a href="#" className="text-blue-600 font-semibold flex items-center gap-1 hover:underline">
                GitHub Repository <ExternalLink size={12} />
              </a>
            </div>
          </div>

          {/* Compliance disclaimer */}
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-start gap-3">
            <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-white text-xs font-bold">i</span>
            </div>
            <div>
              <p className="text-xs font-bold text-gray-900 mb-1">COMPLIANCE DISCLAIMER</p>
              <p className="text-xs text-gray-500 leading-relaxed">
                This automated similarity analysis is a support tool. A high similarity score indicates a 'Risk Signal' and does not confirm plagiarism. Manual review by a subject matter expert is required before any formal hiring decision is finalized.
              </p>
            </div>
          </div>
        </div>

        {/* Right: diff comparison */}
        <div className="lg:col-span-2 space-y-4">
          {/* Diff panel */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-semibold text-gray-900">Split-Screen Diff Comparison</h2>
                <p className="text-xs text-gray-400 mt-0.5">Side-by-side visualization of identified suspicious logic clusters.</p>
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

            {/* Cluster navigation */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>▽</span>
                <span>Showing:</span>
                <span className="font-semibold text-gray-800">2 Clusters Found</span>
              </div>
              <div className="flex items-center gap-2">
                <button className="flex items-center gap-1 text-xs font-medium text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg px-2.5 py-1 hover:bg-gray-50">
                  <ChevronLeft size={12} /> Prev Match
                </button>
                <button className="flex items-center gap-1 text-xs font-medium text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg px-2.5 py-1 hover:bg-gray-50">
                  Next Match <ChevronRight size={12} />
                </button>
                <button className="text-gray-400 hover:text-gray-600 border border-gray-200 rounded-lg p-1.5">
                  <Copy size={13} />
                </button>
                <button className="text-gray-400 hover:text-gray-600 border border-gray-200 rounded-lg p-1.5">
                  <Maximize2 size={13} />
                </button>
              </div>
            </div>

            {/* Side-by-side code */}
            <div className="flex gap-3 h-72">
              <CodePanel
                title="Candidate Input"
                badge="JavaScript"
                code={CANDIDATE_CODE}
                lang="JAVASCRIPT"
              />
              <CodePanel
                title="Database Match: GitHub/User/Retail-JS"
                badge="JavaScript"
                code={MATCH_CODE}
                lang="JAVASCRIPT"
              />
            </div>

            {/* Legend */}
            <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-blue-500 rounded-full" /> Candidate Logic
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-orange-400 rounded-full" /> External Reference Match
                </span>
              </div>
              <span className="text-gray-400 italic">Structural alignment: Higher than 80% of typical baseline variations.</span>
            </div>
          </div>

          {/* Audit trail */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Audit Trail</h2>
            <div className="space-y-3">
              {auditTrail.map(({ time, user, action, dot }) => (
                <div key={`${time}-${user}`} className="flex items-center gap-4 text-sm">
                  <span className="text-gray-400 font-mono text-xs w-16 flex-shrink-0">{time}</span>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dot === 'red' ? 'bg-red-500' : dot === 'blue' ? 'bg-blue-500' : 'bg-gray-400'}`} />
                    <span className="font-medium text-gray-700">{user}</span>
                  </div>
                  <span className="text-gray-400 flex-shrink-0">—</span>
                  <span className="text-gray-600">{action}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
