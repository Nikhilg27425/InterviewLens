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
    if (!sessionId) {
      console.log('[WebSocket] No session ID provided')
      return
    }
    const token = localStorage.getItem('access_token')
    if (!token) {
      console.log('[WebSocket] No access token found')
      return
    }

    const url = `${WS_BASE}/ws/${sessionId}?token=${token}`
    console.log('[WebSocket] Connecting to:', url)
    const ws  = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => {
      console.log('[WebSocket] Connected successfully')
      setConnected(true)
      reconnectCount.current = 0
    }

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
        console.log('[WebSocket] Received message:', msg.type)
        setLastMessage(msg)
      } catch { /* ignore malformed */ }
    }

    ws.onclose = () => {
      console.log('[WebSocket] Connection closed')
      setConnected(false)
      wsRef.current = null
      if (reconnectCount.current < MAX_RECONNECTS) {
        reconnectCount.current++
        console.log(`[WebSocket] Reconnecting... (${reconnectCount.current}/${MAX_RECONNECTS})`)
        reconnectTimer.current = setTimeout(connect, RECONNECT_DELAY_MS)
      }
    }

    ws.onerror = (error) => {
      console.error('[WebSocket] Error:', error)
      ws.close()
    }
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
