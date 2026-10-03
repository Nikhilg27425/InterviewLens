import React, { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, Plus, Trash2, Eye, EyeOff, Loader, Save, Play, CheckCircle, XCircle, AlertTriangle,
} from 'lucide-react'
import { problemsAPI, apiErrorMessage } from '../services/api'
import { LANGUAGES, runAllTestCases } from '../services/judge0'

// stdin-reading scaffolds so candidates only write the solution
const STARTER_TEMPLATES = {
  JavaScript: `const lines = require('fs').readFileSync(0, 'utf8').trim().split('\\n');

function solve(lines) {
  // TODO: implement
  return '';
}

console.log(solve(lines));
`,
  TypeScript: `const lines: string[] = require('fs').readFileSync(0, 'utf8').trim().split('\\n');

function solve(lines: string[]): string {
  // TODO: implement
  return '';
}

console.log(solve(lines));
`,
  Python: `import sys

def solve(lines):
    # TODO: implement
    return ""

print(solve(sys.stdin.read().strip().split("\\n")))
`,
  Java: `import java.util.*;
import java.io.*;

public class Main {
    static String solve(List<String> lines) {
        // TODO: implement
        return "";
    }

    public static void main(String[] args) throws IOException {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        List<String> lines = new ArrayList<>();
        String line;
        while ((line = br.readLine()) != null) lines.add(line);
        System.out.println(solve(lines));
    }
}
`,
  'C++': `#include <bits/stdc++.h>
using namespace std;

string solve(const vector<string>& lines) {
    // TODO: implement
    return "";
}

int main() {
    vector<string> lines;
    string line;
    while (getline(cin, line)) lines.push_back(line);
    cout << solve(lines) << endl;
}
`,
}

const EMPTY = {
  title: '',
  difficulty: 'Easy',
  points: 10,
  tags: '',
  description: '',
  constraints: [''],
  examples: [{ input: '', output: '', explanation: '' }],
  test_cases: [{ label: '', stdin: '', expected: '', is_hidden: false }],
  starter_code: { ...STARTER_TEMPLATES },
  custom_test_default: '',
}

const parse = (v, fallback) => { try { return JSON.parse(v) } catch { return fallback } }

function fromApi(p) {
  const constraints = parse(p.constraints, [])
  const examples = parse(p.examples, [])
  return {
    title: p.title,
    difficulty: p.difficulty,
    points: p.points,
    tags: parse(p.tags, []).join(', '),
    description: p.description,
    constraints: constraints.length ? constraints : [''],
    examples: examples.length ? examples.map((e) => ({ explanation: '', ...e })) : [{ input: '', output: '', explanation: '' }],
    test_cases: p.test_cases.map(({ label, stdin, expected, is_hidden }) => ({ label, stdin, expected, is_hidden })),
    starter_code: { ...parse(p.starter_code, {}) },
    custom_test_default: p.custom_test_default || '',
  }
}

function toApi(f) {
  return {
    title: f.title.trim(),
    difficulty: f.difficulty,
    points: Number(f.points) || 0,
    tags: JSON.stringify(f.tags.split(',').map((t) => t.trim()).filter(Boolean)),
    description: f.description,
    constraints: JSON.stringify(f.constraints.map((c) => c.trim()).filter(Boolean)),
    examples: JSON.stringify(
      f.examples.filter((e) => e.input.trim() || e.output.trim())
        .map(({ input, output, explanation }) => (explanation.trim() ? { input, output, explanation } : { input, output })),
    ),
    starter_code: JSON.stringify(Object.fromEntries(Object.entries(f.starter_code).filter(([, code]) => code?.trim()))),
    custom_test_default: f.custom_test_default || f.test_cases[0]?.stdin || null,
    test_cases: f.test_cases.filter((t) => t.expected.trim() || t.stdin.trim()),
  }
}

const card = 'bg-white rounded-2xl border border-gray-100 p-5'
const input = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
const mono = `${input} font-mono text-xs`

export default function ProblemEditor() {
  const { id } = useParams()
  const isNew = !id || id === 'new'
  const navigate = useNavigate()
  const [form, setForm] = useState(isNew ? EMPTY : null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [lang, setLang] = useState('Python')
  const [preview, setPreview] = useState(false)

  // Reference-solution check
  const [refLang, setRefLang] = useState('Python')
  const [refCode, setRefCode] = useState('')
  const [checking, setChecking] = useState(false)
  const [checkResults, setCheckResults] = useState(null)

  useEffect(() => {
    if (isNew) return
    problemsAPI.get(id)
      .then(({ data }) => setForm(fromApi(data)))
      .catch((err) => setError(apiErrorMessage(err, 'Could not load the problem.')))
  }, [id, isNew])

  if (!form) {
    return (
      <div className="p-10 flex justify-center">
        {error ? <p className="text-sm text-red-600">{error}</p> : <Loader className="animate-spin text-blue-600" />}
      </div>
    )
  }

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }))
  const setItem = (key, i, patch) =>
    setForm((f) => ({ ...f, [key]: f[key].map((x, j) => (j === i ? (typeof x === 'string' ? patch : { ...x, ...patch }) : x)) }))
  const addItem = (key, item) => setForm((f) => ({ ...f, [key]: [...f[key], item] }))
  const removeItem = (key, i) => setForm((f) => ({ ...f, [key]: f[key].filter((_, j) => j !== i) }))

  const save = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const body = toApi(form)
      const { data } = isNew ? await problemsAPI.create(body) : await problemsAPI.update(id, body)
      if (isNew) navigate(`/problems/${data.id}`, { replace: true })
      else setForm(fromApi(data))
      setError('')
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not save the problem.'))
    } finally {
      setSaving(false)
    }
  }

  const runCheck = async () => {
    setChecking(true)
    setCheckResults(null)
    try {
      const cases = toApi(form).test_cases
      const results = await runAllTestCases({ code: refCode, language: refLang, testCases: cases })
      setCheckResults(results.map((r, i) => ({ ...r, hidden: cases[i].is_hidden })))
    } catch (err) {
      setCheckResults([{ passed: false, statusLabel: 'Error', error: err.message }])
    } finally {
      setChecking(false)
    }
  }

  const passedCount = checkResults?.filter((r) => r.passed).length ?? 0

  return (
    <form onSubmit={save} className="p-6 space-y-5 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Link to="/problems" className="p-2 rounded-lg text-gray-400 hover:bg-gray-100"><ArrowLeft size={18} /></Link>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-gray-900 truncate">{isNew ? 'New problem' : form.title || 'Edit problem'}</h1>
            <p className="text-gray-500 text-sm">Candidates read from stdin and print to stdout; output is compared exactly (trimmed).</p>
          </div>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 flex-shrink-0"
        >
          {saving ? <Loader size={14} className="animate-spin" /> : <Save size={14} />}
          {isNew ? 'Create problem' : 'Save changes'}
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600">
          <AlertTriangle size={15} className="flex-shrink-0 mt-0.5" /> {error}
        </div>
      )}

      {/* Basics */}
      <section className={`${card} space-y-4`}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-gray-600 mb-1">Title</label>
            <input value={form.title} onChange={(e) => set('title', e.target.value)} required placeholder="Two Sum" className={input} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Difficulty</label>
            <select value={form.difficulty} onChange={(e) => set('difficulty', e.target.value)} className={input}>
              {['Easy', 'Medium', 'Hard'].map((d) => <option key={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Points</label>
            <input type="number" min={0} max={1000} value={form.points} onChange={(e) => set('points', e.target.value)} className={input} />
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Tags <span className="font-normal text-gray-400">(comma separated)</span></label>
          <input value={form.tags} onChange={(e) => set('tags', e.target.value)} placeholder="arrays, hash map" className={input} />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-semibold text-gray-600">Description <span className="font-normal text-gray-400">(basic HTML allowed: &lt;code&gt;, &lt;br/&gt;, &lt;b&gt;)</span></label>
            <button type="button" onClick={() => setPreview((p) => !p)} className="text-xs font-semibold text-blue-600 hover:underline">
              {preview ? 'Edit' : 'Preview'}
            </button>
          </div>
          {preview ? (
            <div className="min-h-[140px] border border-gray-200 rounded-lg p-3 text-sm text-gray-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: form.description }} />
          ) : (
            <textarea value={form.description} onChange={(e) => set('description', e.target.value)} required rows={6} className={input}
              placeholder="Given an array of integers nums and an integer target, return the indices of the two numbers that add up to target." />
          )}
        </div>
      </section>

      {/* Examples + constraints */}
      <div className="grid md:grid-cols-2 gap-5">
        <section className={`${card} space-y-3`}>
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Examples</h2>
            <button type="button" onClick={() => addItem('examples', { input: '', output: '', explanation: '' })} className="text-xs font-semibold text-blue-600 flex items-center gap-1"><Plus size={12} /> Add</button>
          </div>
          {form.examples.map((ex, i) => (
            <div key={i} className="border border-gray-100 rounded-xl p-3 space-y-2 relative">
              <button type="button" onClick={() => removeItem('examples', i)} className="absolute top-2 right-2 text-gray-300 hover:text-red-500"><Trash2 size={13} /></button>
              <input value={ex.input} onChange={(e) => setItem('examples', i, { input: e.target.value })} placeholder="Input: nums = [2,7,11,15], target = 9" className={mono} />
              <input value={ex.output} onChange={(e) => setItem('examples', i, { output: e.target.value })} placeholder="Output: [0,1]" className={mono} />
              <input value={ex.explanation} onChange={(e) => setItem('examples', i, { explanation: e.target.value })} placeholder="Explanation (optional)" className={input} />
            </div>
          ))}
        </section>

        <section className={`${card} space-y-3`}>
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Constraints</h2>
            <button type="button" onClick={() => addItem('constraints', '')} className="text-xs font-semibold text-blue-600 flex items-center gap-1"><Plus size={12} /> Add</button>
          </div>
          {form.constraints.map((c, i) => (
            <div key={i} className="flex gap-2">
              <input value={c} onChange={(e) => setItem('constraints', i, e.target.value)} placeholder="1 ≤ n ≤ 10⁵" className={mono} />
              <button type="button" onClick={() => removeItem('constraints', i)} className="text-gray-300 hover:text-red-500"><Trash2 size={13} /></button>
            </div>
          ))}
        </section>
      </div>

      {/* Test cases */}
      <section className={`${card} space-y-3`}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-900">Test cases</h2>
            <p className="text-xs text-gray-400">Hidden cases only run on final submission and are never sent to the candidate’s browser.</p>
          </div>
          <button type="button" onClick={() => addItem('test_cases', { label: '', stdin: '', expected: '', is_hidden: false })} className="text-xs font-semibold text-blue-600 flex items-center gap-1"><Plus size={12} /> Add case</button>
        </div>
        {form.test_cases.map((tc, i) => (
          <div key={i} className={`border rounded-xl p-3 ${tc.is_hidden ? 'border-gray-300 bg-gray-50' : 'border-gray-100'}`}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold text-gray-500 w-14">Case {i + 1}</span>
              <input value={tc.label} onChange={(e) => setItem('test_cases', i, { label: e.target.value })} placeholder="Label shown to the candidate (optional)" className={`${input} py-1.5`} />
              <button
                type="button"
                onClick={() => setItem('test_cases', i, { is_hidden: !tc.is_hidden })}
                className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg border flex-shrink-0 ${tc.is_hidden ? 'bg-gray-800 text-white border-gray-800' : 'text-gray-600 border-gray-200'}`}
              >
                {tc.is_hidden ? <><EyeOff size={12} /> Hidden</> : <><Eye size={12} /> Visible</>}
              </button>
              <button type="button" onClick={() => removeItem('test_cases', i)} className="text-gray-300 hover:text-red-500 flex-shrink-0"><Trash2 size={14} /></button>
            </div>
            <div className="grid md:grid-cols-2 gap-2">
              <textarea value={tc.stdin} onChange={(e) => setItem('test_cases', i, { stdin: e.target.value })} rows={3} placeholder="stdin" className={mono} />
              <textarea value={tc.expected} onChange={(e) => setItem('test_cases', i, { expected: e.target.value })} rows={3} placeholder="expected stdout" className={mono} required />
            </div>
          </div>
        ))}
      </section>

      {/* Starter code */}
      <section className={`${card} space-y-3`}>
        <div>
          <h2 className="font-semibold text-gray-900">Starter code</h2>
          <p className="text-xs text-gray-400">What the candidate sees when they open the problem. Keep the I/O scaffolding, leave the solution out.</p>
        </div>
        <div className="flex gap-1 border-b border-gray-100">
          {LANGUAGES.map((l) => (
            <button key={l} type="button" onClick={() => setLang(l)}
              className={`px-3 py-2 text-xs font-semibold border-b-2 -mb-px ${lang === l ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'}`}>
              {l}{form.starter_code[l]?.trim() ? '' : ' ·'}
            </button>
          ))}
        </div>
        <textarea
          value={form.starter_code[lang] || ''}
          onChange={(e) => set('starter_code', { ...form.starter_code, [lang]: e.target.value })}
          rows={14}
          spellCheck={false}
          className="w-full font-mono text-xs bg-gray-900 text-gray-100 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button type="button" onClick={() => set('starter_code', { ...form.starter_code, [lang]: STARTER_TEMPLATES[lang] })} className="text-xs text-gray-500 hover:text-gray-800">
          Reset {lang} to the default template
        </button>
      </section>

      {/* Reference solution check */}
      <section className={`${card} space-y-3`}>
        <div>
          <h2 className="font-semibold text-gray-900">Validate with a reference solution</h2>
          <p className="text-xs text-gray-400">Run a known-good solution against every test case (hidden included) before using this problem. Not saved.</p>
        </div>
        <div className="flex gap-2 items-center">
          <select value={refLang} onChange={(e) => setRefLang(e.target.value)} className={`${input} w-40`}>
            {LANGUAGES.map((l) => <option key={l}>{l}</option>)}
          </select>
          <button type="button" onClick={runCheck} disabled={checking || !refCode.trim()}
            className="flex items-center gap-2 bg-emerald-600 text-white rounded-lg px-3 py-2 text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50">
            {checking ? <Loader size={13} className="animate-spin" /> : <Play size={13} />} Run all tests
          </button>
          {checkResults && (
            <span className={`text-sm font-semibold ${passedCount === checkResults.length ? 'text-emerald-600' : 'text-red-600'}`}>
              {passedCount}/{checkResults.length} passed
            </span>
          )}
        </div>
        <textarea value={refCode} onChange={(e) => setRefCode(e.target.value)} rows={10} spellCheck={false}
          placeholder={`Paste a ${refLang} solution that reads stdin and prints the answer…`}
          className="w-full font-mono text-xs bg-gray-900 text-gray-100 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
        {checkResults && (
          <div className="space-y-1.5">
            {checkResults.map((r, i) => (
              <div key={i} className={`flex items-start gap-2 text-xs rounded-lg px-3 py-2 ${r.passed ? 'bg-emerald-50' : 'bg-red-50'}`}>
                {r.passed ? <CheckCircle size={13} className="text-emerald-600 mt-0.5" /> : <XCircle size={13} className="text-red-600 mt-0.5" />}
                <div className="min-w-0 flex-1">
                  <span className="font-semibold">Case {i + 1}{r.hidden ? ' (hidden)' : ''}: {r.statusLabel}</span>
                  {!r.passed && (
                    <pre className="mt-1 whitespace-pre-wrap text-gray-600">{r.error || `expected: ${r.expected}\ngot:      ${r.stdout}`}</pre>
                  )}
                </div>
                {r.time && <span className="text-gray-400">{r.time}</span>}
              </div>
            ))}
          </div>
        )}
      </section>
    </form>
  )
}
