import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Clock, Play, RotateCcw, Settings, Maximize2, Send, HelpCircle, AlertCircle } from 'lucide-react'
import Logo from '../components/Logo'

const STARTER_CODE = `function twoSum(nums, target) {
  // Create a hash map to store indices of numbers
  const map = new Map();

  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];

    // If the complement is in our map, we found the pair
    if (map.has(complement)) {
      return [map.get(complement), i];
    }

    // Otherwise, store the current number and its index
    map.set(nums[i], i);
  }

  return [];
};`

const LANGUAGES = ['JavaScript', 'Python', 'TypeScript', 'Java', 'C++']

export default function CandidateInterview() {
  const [timeLeft, setTimeLeft] = useState(59 * 60 + 59)
  const [code, setCode] = useState(STARTER_CODE)
  const [activeTab, setActiveTab] = useState('Console')
  const [lang, setLang] = useState('JavaScript')
  const [showHelp, setShowHelp] = useState(true)

  useEffect(() => {
    const t = setInterval(() => setTimeLeft((s) => (s > 0 ? s - 1 : 0)), 1000)
    return () => clearInterval(t)
  }, [])

  const fmt = (s) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Top bar */}
      <header className="h-14 border-b border-gray-200 flex items-center justify-between px-6 flex-shrink-0">
        <div className="flex items-center gap-4">
          <Logo size="sm" />
          <div className="flex items-center gap-2 bg-gray-100 text-gray-600 rounded-lg px-3 py-1.5 text-sm">
            📄 Senior Frontend Engineer Assessment
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-700">
            <Clock size={14} className="text-gray-500" />
            {fmt(timeLeft)}
          </div>
          <button className="flex items-center gap-2 bg-blue-600 text-white font-semibold text-sm px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
            <Send size={14} />
            Submit Solution
          </button>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold">
            JD
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: problem statement */}
        <div className="w-[42%] border-r border-gray-200 flex flex-col overflow-y-auto">
          <div className="p-6">
            {/* Tags */}
            <div className="flex items-center gap-2 mb-4">
              <span className="bg-green-100 text-green-700 text-xs font-bold px-2.5 py-1 rounded-full">Easy</span>
              <span className="text-gray-500 text-sm font-medium">15 Points</span>
            </div>

            <h1 className="text-2xl font-bold text-gray-900 mb-4">1. Two Sum</h1>

            <p className="text-gray-700 text-sm leading-relaxed mb-6">
              Given an array of integers <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono">nums</code> and an integer <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono">target</code>, return indices of the two numbers such that they add up to <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono">target</code>. You may assume that each input would have exactly one solution, and you may not use the same element twice. You can return the answer in any order.
            </p>

            {/* Example */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-blue-500">ℹ</span>
                <p className="text-sm font-semibold text-gray-800">Example 1:</p>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 font-mono text-sm space-y-1 text-gray-700">
                <p><span className="text-gray-400">Input:</span></p>
                <p className="ml-2">nums = [2, 7, 11, 15], target = 9</p>
                <p className="mt-2"><span className="text-gray-400">Output:</span></p>
                <p className="ml-2">[0, 1]</p>
                <p className="mt-2"><span className="text-gray-400">Explanation:</span></p>
                <p className="ml-2 text-xs">Because nums[0] + nums[1] == 9, we return [0, 1].</p>
              </div>
            </div>

            {/* Constraints */}
            <div>
              <p className="font-semibold text-gray-900 mb-3 text-sm">Constraints:</p>
              <ul className="space-y-1.5">
                {[
                  '2 <= nums.length <= 10⁴',
                  '-10⁹ <= nums[i] <= 10⁹',
                  '-10⁹ <= target <= 10⁹',
                  'Only one valid answer exists.',
                ].map((c) => (
                  <li key={c} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="text-gray-400 mt-0.5">•</span>
                    <code className="font-mono text-xs bg-gray-50 px-1 py-0.5 rounded">{c}</code>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Right: editor + output */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Editor toolbar */}
          <div className="border-b border-gray-200 px-4 py-2 flex items-center justify-between flex-shrink-0 bg-white">
            <div className="flex items-center gap-3">
              {/* Language selector */}
              <div className="flex border border-gray-200 rounded-lg overflow-hidden">
                {LANGUAGES.map((l) => (
                  <button
                    key={l}
                    onClick={() => setLang(l)}
                    className={`px-3 py-1.5 text-xs font-medium transition-colors ${lang === l ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
                  >
                    {l}
                  </button>
                ))}
              </div>
              <button className="text-gray-400 hover:text-gray-600">
                <Settings size={15} />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button className="text-gray-400 hover:text-gray-600">
                <RotateCcw size={15} />
              </button>
              <button className="text-gray-400 hover:text-gray-600">
                <Maximize2 size={15} />
              </button>
            </div>
          </div>

          {/* Code editor area */}
          <div className="flex-1 bg-gray-900 overflow-auto scrollbar-thin relative">
            <div className="p-4 font-mono text-sm">
              {code.split('\n').map((line, i) => (
                <div key={i} className="flex gap-4 leading-6 group">
                  <span className="text-gray-600 text-xs w-6 text-right flex-shrink-0 select-none pt-0.5">
                    {i + 1}
                  </span>
                  <span className={`whitespace-pre ${
                    line.includes('//') ? 'text-gray-500' :
                    line.includes('function') || line.includes('const') || line.includes('return') || line.includes('for') || line.includes('if') ? 'text-blue-400' :
                    line.includes('new Map') || line.includes('.has') || line.includes('.get') || line.includes('.set') ? 'text-yellow-300' :
                    'text-gray-300'
                  }`}>
                    {line}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Output panel */}
          <div className="h-48 flex-shrink-0 border-t border-gray-200 bg-white flex flex-col">
            {/* Tabs */}
            <div className="flex items-center justify-between px-4 pt-2 border-b border-gray-100">
              <div className="flex gap-4">
                {['Test Cases', 'Console'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`pb-2 text-sm font-medium border-b-2 transition-colors ${activeTab === tab ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
              <button className="flex items-center gap-1.5 bg-gray-100 text-gray-700 text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-gray-200 transition-colors">
                <Play size={11} />
                Run Code
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 font-mono text-sm">
              <p className="text-green-500 font-semibold mb-2 flex items-center gap-2">
                <span>✓</span> Compiled successfully.
              </p>
              <p className="text-gray-500 text-xs">Output:</p>
              <p className="text-gray-900 font-mono">[0, 1]</p>
              <p className="text-gray-500 text-xs mt-1">Runtime: 42ms</p>
            </div>
          </div>
        </div>
      </div>

      {/* Status bar */}
      <div className="h-8 bg-white border-t border-gray-200 flex items-center justify-between px-6">
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 bg-green-500 rounded-full" />
            Proctoring Active
          </span>
          <span className="text-gray-300">|</span>
          <span className="flex items-center gap-1.5">
            <span className="text-gray-400">✓</span>
            Auto-saved 2m ago
          </span>
        </div>
        <div className="flex items-center gap-4 text-xs text-gray-400">
          <button className="flex items-center gap-1 hover:text-gray-600">
            <AlertCircle size={12} /> Report Issue
          </button>
          <span>v2.4.0-stable</span>
        </div>
      </div>

      {/* Help tooltip */}
      {showHelp && (
        <div className="fixed bottom-12 right-6 w-64 bg-white border border-gray-200 rounded-2xl shadow-xl p-4 z-50">
          <div className="flex items-start gap-2 mb-2">
            <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
              <Play size={10} className="text-blue-600" fill="#2563EB" />
            </div>
            <p className="font-semibold text-gray-900 text-sm">Need help?</p>
          </div>
          <p className="text-xs text-gray-500 leading-relaxed mb-3">
            You can run your code as many times as you want against our test cases.
          </p>
          <div className="flex items-center justify-between">
            <button className="text-blue-600 text-xs font-semibold flex items-center gap-1 hover:underline">
              View FAQ <span>›</span>
            </button>
            <button onClick={() => setShowHelp(false)} className="text-xs text-gray-400 hover:text-gray-600">
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
