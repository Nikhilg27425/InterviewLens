import React from 'react'
import { Link } from 'react-router-dom'
import { Play, BookOpen, Mail, Video, ShieldAlert, ClipboardCheck } from 'lucide-react'

const STEPS = [
  {
    icon: BookOpen, title: 'Build your problem bank',
    body: <>Add problems under <Link to="/problems" className="text-blue-600 font-semibold">Problem Bank</Link>. Programs read stdin and print to stdout; mark some test cases <b>hidden</b> so they only run on final submission. Use “Validate with a reference solution” to prove your tests are correct.</>,
  },
  {
    icon: Play, title: 'Create an interview',
    body: <>Click <b>Start Live Session</b>, pick problems in the order you want, optionally schedule it, and keep “Email the invite” on. The candidate receives a one-click join link and an access token.</>,
  },
  {
    icon: Video, title: 'Run the session',
    body: <>Open the live session before the candidate begins. You’ll see their camera, their code as they type, every run result, and proctoring signals. Chat is two-way.</>,
  },
  {
    icon: ClipboardCheck, title: 'Evaluate',
    body: <>End the session, then score it and write notes on the interview report. Submissions, similarity reports and the behavioral timeline are all there.</>,
  },
]

const FAQ = [
  ['The candidate says they never got the email.',
    'Open the interview report → Candidate access → Resend invite, or Copy invite link and send it yourself. If the server has no SMTP settings, emails are only saved to the outbox (see below).'],
  ['What do proctoring signals mean?',
    'Signals like tab switches or large pastes are neutral events, not verdicts. Review them in context — the compliance note on the report applies.'],
  ['A problem can’t be deleted.',
    'Problems with candidate submissions, or used by an upcoming/live interview, are protected. Edit them instead.'],
  ['The candidate refreshed the page.',
    'Their code is saved in their browser and restored automatically; the timer keeps running from the server’s start time.'],
]

export default function Help() {
  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Help Center</h1>
        <p className="text-gray-500 text-sm mt-0.5">Everything you need to run a great interview</p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {STEPS.map(({ icon: Icon, title, body }, i) => (
          <div key={title} className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center"><Icon size={16} /></div>
              <p className="font-semibold text-gray-900">{i + 1}. {title}</p>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">{body}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-center gap-2 mb-2">
          <Mail size={16} className="text-blue-600" />
          <h2 className="font-semibold text-gray-900">Sending real emails</h2>
        </div>
        <p className="text-sm text-gray-600 mb-3">
          Without SMTP settings, invites are written to <code className="bg-gray-100 px-1 rounded">backend/outbox/</code> and can be previewed in the app.
          To deliver them, add these to <code className="bg-gray-100 px-1 rounded">backend/.env</code> and restart the backend:
        </p>
        <pre className="bg-gray-900 text-gray-100 text-xs rounded-lg p-4 overflow-x-auto">{`SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=you@gmail.com
SMTP_PASSWORD=your-16-char-app-password
EMAIL_FROM=InterviewLens <you@gmail.com>`}</pre>
        <p className="text-xs text-gray-400 mt-2">Gmail requires 2-step verification and an App Password. Any SMTP provider works (SendGrid, Mailgun, Amazon SES, Mailtrap for testing).</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-center gap-2 mb-3">
          <ShieldAlert size={16} className="text-blue-600" />
          <h2 className="font-semibold text-gray-900">Common questions</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {FAQ.map(([q, a]) => (
            <div key={q} className="py-3">
              <p className="text-sm font-semibold text-gray-800">{q}</p>
              <p className="text-sm text-gray-600 mt-1">{a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
