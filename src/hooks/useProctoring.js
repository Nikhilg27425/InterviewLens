/**
 * useProctoring — monitors all integrity signals during a candidate interview.
 *
 * Signals detected:
 *   tab_switch      — document.visibilitychange to hidden
 *   window_blur     — window loses focus
 *   window_focus    — window regains focus
 *   fullscreen_exit — browser exits fullscreen
 *   clipboard_paste — paste event
 *   clipboard_copy  — copy event
 *   large_paste     — paste of > 50 characters
 *   right_click     — contextmenu event
 *   devtools_open   — window resize to very small height (heuristic)
 *
 * Signals are buffered and flushed every 5 seconds via the REST batch endpoint
 * AND sent immediately over the WebSocket if the WS connection is available.
 *
 * Usage:
 *   const { signals } = useProctoring({ sessionId, elapsedSeconds, ws })
 */
import { useEffect, useRef, useCallback, useState } from 'react'
import { signalsAPI } from '../services/api'

const BATCH_INTERVAL_MS = 5000
const LARGE_PASTE_THRESHOLD = 50

export function useProctoring({ sessionId, elapsedSeconds, ws = null, enabled = true }) {
  const [signals, setSignals] = useState([])
  const bufferRef = useRef([])
  const flushTimer = useRef(null)

  const push = useCallback((type, detail = null) => {
    if (!enabled || !sessionId) return

    const signal = {
      session_id:      sessionId,
      signal_type:     type,
      detail:          detail ? JSON.stringify(detail) : null,
      elapsed_seconds: elapsedSeconds,
    }

    bufferRef.current.push(signal)
    setSignals((prev) => [...prev.slice(-49), { type, detail, elapsed_seconds: elapsedSeconds, ts: Date.now() }])

    // Also send immediately over WebSocket so interviewer sees it in real-time
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type:            'signal',
        signal_type:     type,
        detail,
        elapsed_seconds: elapsedSeconds,
      }))
    }
  }, [sessionId, elapsedSeconds, ws, enabled])

  // ── Flush buffer to REST API every 5s ──
  const flush = useCallback(async () => {
    if (!bufferRef.current.length) return
    const batch = [...bufferRef.current]
    bufferRef.current = []
    try {
      await signalsAPI.batch(batch)
    } catch {
      // Re-queue on failure
      bufferRef.current = [...batch, ...bufferRef.current]
    }
  }, [])

  useEffect(() => {
    if (!enabled) return
    flushTimer.current = setInterval(flush, BATCH_INTERVAL_MS)
    return () => {
      clearInterval(flushTimer.current)
      flush() // flush on unmount
    }
  }, [enabled, flush])

  // ── Tab visibility ──
  useEffect(() => {
    if (!enabled) return
    const handler = () => {
      if (document.hidden) {
        push('tab_switch', { to: 'hidden' })
      } else {
        push('window_focus', { from: 'hidden' })
      }
    }
    document.addEventListener('visibilitychange', handler)
    return () => document.removeEventListener('visibilitychange', handler)
  }, [enabled, push])

  // ── Window blur / focus ──
  useEffect(() => {
    if (!enabled) return
    const onBlur  = () => push('window_blur')
    const onFocus = () => push('window_focus')
    window.addEventListener('blur',  onBlur)
    window.addEventListener('focus', onFocus)
    return () => {
      window.removeEventListener('blur',  onBlur)
      window.removeEventListener('focus', onFocus)
    }
  }, [enabled, push])

  // ── Fullscreen exit ──
  useEffect(() => {
    if (!enabled) return
    const handler = () => {
      if (!document.fullscreenElement) push('fullscreen_exit')
    }
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [enabled, push])

  // ── Clipboard paste ──
  useEffect(() => {
    if (!enabled) return
    const handler = (e) => {
      const text = e.clipboardData?.getData('text') || ''
      if (text.length >= LARGE_PASTE_THRESHOLD) {
        push('large_paste', { length: text.length, preview: text.slice(0, 60) })
      } else {
        push('clipboard_paste', { length: text.length })
      }
    }
    document.addEventListener('paste', handler)
    return () => document.removeEventListener('paste', handler)
  }, [enabled, push])

  // ── Clipboard copy ──
  useEffect(() => {
    if (!enabled) return
    const handler = () => push('clipboard_copy')
    document.addEventListener('copy', handler)
    return () => document.removeEventListener('copy', handler)
  }, [enabled, push])

  // ── Right click ──
  useEffect(() => {
    if (!enabled) return
    const handler = (e) => {
      e.preventDefault()
      push('right_click')
    }
    document.addEventListener('contextmenu', handler)
    return () => document.removeEventListener('contextmenu', handler)
  }, [enabled, push])

  // ── DevTools heuristic (very narrow window height) ──
  useEffect(() => {
    if (!enabled) return
    const handler = () => {
      if (window.outerHeight - window.innerHeight > 200) {
        push('devtools_open', { outer: window.outerHeight, inner: window.innerHeight })
      }
    }
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [enabled, push])

  return { signals, flush }
}
