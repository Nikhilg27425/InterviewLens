/**
 * useWebRTC — one-way camera stream from candidate to interviewer, signaled
 * over the interview WebSocket.
 *
 * Negotiation:
 *   - The candidate always makes the offer. It (re)offers when its socket
 *     connects, when an interviewer joins the room, and when an interviewer
 *     sends `webrtc_request` (sent by the interviewer on connect).
 *   - Every offer carries an `offer_id`; answers and ICE candidates echo it so
 *     messages from a superseded negotiation are ignored.
 *   - Remote ICE candidates are queued until the remote description is set.
 *
 * Usage:
 *   // Candidate (sender):
 *   const { localStream, startVideo, stopVideo, connectionState } =
 *     useWebRTC({ role: 'candidate', send, subscribe, connected })
 *
 *   // Interviewer (receiver):
 *   const { remoteStream, connectionState } =
 *     useWebRTC({ role: 'interviewer', send, subscribe, connected })
 */
import { useState, useEffect, useRef, useCallback } from 'react'

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
}

const OFFER_DEBOUNCE_MS = 300

export function useWebRTC({ role, send, subscribe, connected }) {
  const [localStream, setLocalStream]         = useState(null)
  const [remoteStream, setRemoteStream]       = useState(null)
  const [connectionState, setConnectionState] = useState('new')

  const pcRef          = useRef(null)
  const offerIdRef     = useRef(null)
  const pendingIceRef  = useRef([])
  const localStreamRef = useRef(null)
  const offerTimerRef  = useRef(null)

  const closePeer = useCallback(() => {
    if (pcRef.current) {
      pcRef.current.onicecandidate = null
      pcRef.current.ontrack = null
      pcRef.current.onconnectionstatechange = null
      pcRef.current.close()
      pcRef.current = null
    }
    pendingIceRef.current = []
  }, [])

  const createPeer = useCallback((offerId) => {
    closePeer()
    const pc = new RTCPeerConnection(ICE_SERVERS)
    pcRef.current = pc
    offerIdRef.current = offerId

    pc.onconnectionstatechange = () => setConnectionState(pc.connectionState)
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        send({ type: 'webrtc_ice_candidate', offer_id: offerId, candidate: event.candidate.toJSON() })
      }
    }
    pc.ontrack = (event) => {
      setRemoteStream(event.streams[0] || new MediaStream([event.track]))
    }
    setConnectionState('connecting')
    return pc
  }, [closePeer, send])

  const flushPendingIce = useCallback(async (pc) => {
    const queued = pendingIceRef.current
    pendingIceRef.current = []
    for (const c of queued) {
      try { await pc.addIceCandidate(new RTCIceCandidate(c)) } catch { /* stale */ }
    }
  }, [])

  // ── Candidate: make a fresh offer (debounced to coalesce triggers) ──
  const makeOffer = useCallback(() => {
    clearTimeout(offerTimerRef.current)
    offerTimerRef.current = setTimeout(async () => {
      const stream = localStreamRef.current
      if (!stream) return
      const offerId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      const pc = createPeer(offerId)
      stream.getTracks().forEach((track) => pc.addTrack(track, stream))
      try {
        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)
        send({ type: 'webrtc_offer', offer_id: offerId, offer: pc.localDescription.toJSON() })
      } catch (err) {
        console.error('[webrtc] failed to create offer', err)
      }
    }, OFFER_DEBOUNCE_MS)
  }, [createPeer, send])

  // ── Candidate: acquire camera ──
  const startVideo = useCallback(async () => {
    if (localStreamRef.current) return localStreamRef.current
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
      audio: false,
    })
    localStreamRef.current = stream
    setLocalStream(stream)
    return stream
  }, [])

  const stopVideo = useCallback(() => {
    clearTimeout(offerTimerRef.current)
    localStreamRef.current?.getTracks().forEach((t) => t.stop())
    localStreamRef.current = null
    setLocalStream(null)
    closePeer()
    setConnectionState('closed')
  }, [closePeer])

  // Candidate offers once both the socket and the camera are ready
  useEffect(() => {
    if (role === 'candidate' && connected && localStream) makeOffer()
  }, [role, connected, localStream, makeOffer])

  // Interviewer asks any already-present candidate for a fresh offer
  useEffect(() => {
    if (role === 'interviewer' && connected) send({ type: 'webrtc_request' })
  }, [role, connected, send])

  // ── Signaling messages ──
  useEffect(() => {
    if (!subscribe) return undefined
    return subscribe(async (msg) => {
      // Only react to the other side
      if (msg.role && msg.role === role) return

      try {
        if (role === 'candidate') {
          if (msg.type === 'webrtc_request' ||
              (msg.type === 'user_joined' && msg.role === 'interviewer')) {
            makeOffer()
          } else if (msg.type === 'webrtc_answer') {
            const pc = pcRef.current
            if (!pc || msg.offer_id !== offerIdRef.current || pc.signalingState !== 'have-local-offer') return
            await pc.setRemoteDescription(new RTCSessionDescription(msg.answer))
            await flushPendingIce(pc)
          }
        } else {
          if (msg.type === 'webrtc_offer') {
            const pc = createPeer(msg.offer_id)
            await pc.setRemoteDescription(new RTCSessionDescription(msg.offer))
            await flushPendingIce(pc)
            const answer = await pc.createAnswer()
            await pc.setLocalDescription(answer)
            send({ type: 'webrtc_answer', offer_id: msg.offer_id, answer: pc.localDescription.toJSON() })
          } else if (msg.type === 'user_left' && msg.role === 'candidate') {
            closePeer()
            setRemoteStream(null)
            setConnectionState('disconnected')
          }
        }

        if (msg.type === 'webrtc_ice_candidate' && msg.candidate) {
          if (msg.offer_id !== offerIdRef.current) return
          const pc = pcRef.current
          if (pc?.remoteDescription) {
            await pc.addIceCandidate(new RTCIceCandidate(msg.candidate))
          } else {
            pendingIceRef.current.push(msg.candidate)
          }
        }
      } catch (err) {
        console.error(`[webrtc:${role}] signaling error`, err)
      }
    })
  }, [subscribe, role, send, makeOffer, createPeer, closePeer, flushPendingIce])

  // Cleanup on unmount
  useEffect(() => () => {
    clearTimeout(offerTimerRef.current)
    localStreamRef.current?.getTracks().forEach((t) => t.stop())
    closePeer()
  }, [closePeer])

  return { localStream, remoteStream, connectionState, startVideo, stopVideo }
}
