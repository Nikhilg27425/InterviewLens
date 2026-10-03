import React, { useState } from 'react'
import { Mail, Eye, RotateCw, Link2, Check, X, Loader, AlertTriangle } from 'lucide-react'
import { sessionsAPI, apiErrorMessage } from '../services/api'

/** One-line description of the last invite delivery attempt. */
export function inviteStatusText(invite, session) {
  if (invite) {
    if (invite.sent) return { tone: 'ok', text: `Invite emailed to ${session.candidate_email}` }
    if (invite.mode === 'outbox') {
      return { tone: 'warn', text: 'Email isn’t configured on the server — the invite was saved to the outbox. Preview it or share the link.' }
    }
    return { tone: 'error', text: `Email failed: ${invite.detail || 'unknown error'}` }
  }
  if (session?.invite_sent_at) {
    return { tone: 'muted', text: `Invite last sent ${new Date(session.invite_sent_at).toLocaleString()}` }
  }
  return { tone: 'muted', text: 'No invite sent yet' }
}

const TONE = {
  ok: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  warn: 'text-amber-700 bg-amber-50 border-amber-200',
  error: 'text-red-700 bg-red-50 border-red-200',
  muted: 'text-gray-500 bg-gray-50 border-gray-200',
}

export function InvitePreviewModal({ sessionId, onClose }) {
  const [preview, setPreview] = useState(null)
  const [error, setError] = useState('')

  React.useEffect(() => {
    sessionsAPI.invitePreview(sessionId)
      .then(({ data }) => setPreview(data))
      .catch((err) => setError(apiErrorMessage(err, 'Could not load the preview.')))
  }, [sessionId])

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between px-5 py-4 border-b border-gray-100">
          <div className="min-w-0">
            <p className="text-xs text-gray-400">Email preview</p>
            <p className="font-semibold text-gray-900 truncate">{preview?.subject || '…'}</p>
            {preview && <p className="text-xs text-gray-500">To: {preview.to}</p>}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <div className="flex-1 overflow-hidden bg-gray-100">
          {error ? (
            <p className="p-6 text-sm text-red-600">{error}</p>
          ) : !preview ? (
            <div className="p-10 flex justify-center"><Loader className="animate-spin text-blue-600" /></div>
          ) : (
            <iframe title="Invite email" sandbox="" srcDoc={preview.html} className="w-full h-[65vh] border-0" />
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Invite status + actions for a session.
 * `invite` is the delivery result from the latest create/resend response, if any.
 */
export default function InviteControls({ session, invite: initialInvite = null, onSessionChange, compact = false }) {
  const [invite, setInvite] = useState(initialInvite)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  if (!session?.candidate_email) {
    return <p className="text-xs text-gray-400">Add a candidate email to send an invite.</p>
  }

  const closed = ['completed', 'cancelled'].includes(session.status)
  const link = `${window.location.origin}/candidate/login?${new URLSearchParams({
    email: session.candidate_email, token: session.access_token,
  })}`
  const status = inviteStatusText(invite, session)

  const resend = async () => {
    setBusy(true)
    setError('')
    try {
      const { data } = await sessionsAPI.resendInvite(session.id)
      setInvite(data.invite)
      onSessionChange?.(data)
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not send the invite.'))
    } finally {
      setBusy(false)
    }
  }

  const copy = () => {
    navigator.clipboard.writeText(link).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const btn = 'inline-flex items-center gap-1.5 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50'

  return (
    <div className="space-y-2">
      <div className={`flex items-start gap-2 border rounded-lg px-3 py-2 text-xs ${TONE[status.tone]}`}>
        {status.tone === 'error' ? <AlertTriangle size={13} className="flex-shrink-0 mt-0.5" /> : <Mail size={13} className="flex-shrink-0 mt-0.5" />}
        <span>{status.text}</span>
      </div>
      <div className={`flex flex-wrap gap-2 ${compact ? '' : 'pt-1'}`}>
        <button type="button" onClick={() => setShowPreview(true)} className={btn}>
          <Eye size={12} /> Preview email
        </button>
        {!closed && (
          <button type="button" onClick={resend} disabled={busy} className={btn}>
            {busy ? <Loader size={12} className="animate-spin" /> : <RotateCw size={12} />}
            {session.invite_sent_at || invite ? 'Resend invite' : 'Send invite'}
          </button>
        )}
        <button type="button" onClick={copy} className={btn}>
          {copied ? <Check size={12} className="text-emerald-600" /> : <Link2 size={12} />}
          {copied ? 'Copied' : 'Copy invite link'}
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      {showPreview && <InvitePreviewModal sessionId={session.id} onClose={() => setShowPreview(false)} />}
    </div>
  )
}
