/**
 * useInterviewSocket — manages the WebSocket connection to the backend.
 *
 * Used by:
 *   CandidateInterviewPage — sends code_update, signal, chat messages
 *   LiveSession            — receives code_update, signal, chat, snapshot
 *
 * Usage:
 *   const { connected, send, subscribe } = useInterviewSocket(sessionId)
 *   useEffect(() => subscribe((msg) => { ... }), [subscribe])
 *
 * Every message is delivered to every subscriber — unlike a single
 * `lastMessage` state value, nothing is lost when messages arrive in bursts.
 */
import { useEffect, useRef, useState, useCallback } from 'react'
import { getAuthToken, WS_BASE } from '../services/api'

const RECONNECT_DELAY_MS = 3000
const MAX_RECONNECTS = 10
// Server close codes that retrying cannot fix (bad token / not a participant / no session)
const FATAL_CLOSE_CODES = new Set([4001, 4003, 4004])

export function useInterviewSocket(sessionId) {
  const wsRef          = useRef(null)
  const listenersRef   = useRef(new Set())
  const [connected, setConnected] = useState(false)
  const [lastMessage, setLastMessage] = useState(null)

  useEffect(() => {
    if (!sessionId) return
    const token = getAuthToken()
    if (!token) return

    let disposed = false
    let reconnects = 0
    let timer = null

    const connect = () => {
      const ws = new WebSocket(`${WS_BASE}/ws/${sessionId}?token=${encodeURIComponent(token)}`)
      wsRef.current = ws

      ws.onopen = () => {
        reconnects = 0
        setConnected(true)
      }

      ws.onmessage = (event) => {
        let msg
        try { msg = JSON.parse(event.data) } catch { return }
        setLastMessage(msg)
        listenersRef.current.forEach((fn) => {
          try { fn(msg) } catch (err) { console.error('[WebSocket] listener error', err) }
        })
      }

      ws.onclose = (event) => {
        if (wsRef.current === ws) wsRef.current = null
        setConnected(false)
        if (disposed || FATAL_CLOSE_CODES.has(event.code)) return
        if (reconnects < MAX_RECONNECTS) {
          reconnects++
          timer = setTimeout(connect, RECONNECT_DELAY_MS)
        }
      }
    }

    connect()

    return () => {
      disposed = true
      clearTimeout(timer)
      wsRef.current?.close()
      wsRef.current = null
    }
  }, [sessionId])

  const send = useCallback((message) => {
    const ws = wsRef.current
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message))
      return true
    }
    return false
  }, [])

  const subscribe = useCallback((fn) => {
    listenersRef.current.add(fn)
    return () => listenersRef.current.delete(fn)
  }, [])

  return { connected, lastMessage, send, subscribe }
}
