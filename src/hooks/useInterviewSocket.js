/**
 * useInterviewSocket — manages the WebSocket connection to the backend.
 *
 * Used by:
 *   CandidateInterviewPage — sends code_update, signal, chat messages
 *   LiveSession            — receives code_update, signal, chat, snapshot
 *
 * Usage:
 *   const { ws, connected, lastMessage, send } = useInterviewSocket(sessionId)
 */
import { useEffect, useRef, useState, useCallback } from 'react'

const WS_BASE = import.meta.env.VITE_WS_URL || 'ws://localhost:8000'
const RECONNECT_DELAY_MS = 3000
const MAX_RECONNECTS = 5

export function useInterviewSocket(sessionId) {
  const wsRef            = useRef(null)
  const reconnectCount   = useRef(0)
  const reconnectTimer   = useRef(null)
  const [connected,    setConnected]    = useState(false)
  const [lastMessage,  setLastMessage]  = useState(null)

  const connect = useCallback(() => {
    if (!sessionId) return
    const token = localStorage.getItem('access_token')
    if (!token) return

    const url = `${WS_BASE}/ws/${sessionId}?token=${token}`
    const ws  = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => {
      setConnected(true)
      reconnectCount.current = 0
    }

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
        setLastMessage(msg)
      } catch { /* ignore malformed */ }
    }

    ws.onclose = () => {
      setConnected(false)
      wsRef.current = null
      if (reconnectCount.current < MAX_RECONNECTS) {
        reconnectCount.current++
        reconnectTimer.current = setTimeout(connect, RECONNECT_DELAY_MS)
      }
    }

    ws.onerror = () => ws.close()
  }, [sessionId])

  useEffect(() => {
    connect()
    return () => {
      clearTimeout(reconnectTimer.current)
      wsRef.current?.close()
    }
  }, [connect])

  const send = useCallback((message) => {
    const ws = wsRef.current
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message))
    }
  }, [])

  return { ws: wsRef.current, connected, lastMessage, send }
}
