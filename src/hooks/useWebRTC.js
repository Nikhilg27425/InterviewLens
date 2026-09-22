/**
 * useWebRTC - Manages WebRTC peer connection for video streaming
 * 
 * Usage:
 *   // Candidate (sender):
 *   const { localStream, startVideo, stopVideo, connectionState } = useWebRTC(send, lastMessage, 'candidate')
 *   
 *   // Interviewer (receiver):
 *   const { remoteStream, connectionState } = useWebRTC(send, lastMessage, 'interviewer')
 */
import { useState, useEffect, useRef, useCallback } from 'react'

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ]
}

export function useWebRTC(sendMessage, lastMessage, role) {
  const [localStream, setLocalStream] = useState(null)
  const [remoteStream, setRemoteStream] = useState(null)
  const [connectionState, setConnectionState] = useState('new') // new, connecting, connected, disconnected, failed
  const peerConnection = useRef(null)
  const localStreamRef = useRef(null)

  // Keep localStreamRef in sync with localStream state
  useEffect(() => {
    localStreamRef.current = localStream
  }, [localStream])

  // Initialize peer connection
  const initializePeerConnection = useCallback(() => {
    if (peerConnection.current) return peerConnection.current

    console.log(`[${role}] Initializing peer connection`)
    const pc = new RTCPeerConnection(ICE_SERVERS)
    peerConnection.current = pc

    // Monitor connection state
    pc.onconnectionstatechange = () => {
      setConnectionState(pc.connectionState)
      console.log(`[${role}] WebRTC connection state:`, pc.connectionState)
    }

    // Monitor ICE connection state (more detailed)
    pc.oniceconnectionstatechange = () => {
      console.log(`[${role}] ICE connection state:`, pc.iceConnectionState)
    }

    // Monitor ICE gathering state
    pc.onicegatheringstatechange = () => {
      console.log(`[${role}] ICE gathering state:`, pc.iceGatheringState)
    }

    // Handle incoming ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log(`[${role}] Sending ICE candidate`)
        sendMessage({
          type: 'webrtc_ice_candidate',
          candidate: event.candidate.toJSON()
        })
      } else {
        console.log(`[${role}] ICE gathering complete`)
      }
    }

    // Handle incoming remote stream (for interviewer)
    pc.ontrack = (event) => {
      console.log(`[${role}] Received remote track:`, event.track.kind)
      setRemoteStream(event.streams[0])
    }

    return pc
  }, [sendMessage, role])

  // Start local video (candidate only)
  const startVideo = useCallback(async () => {
    try {
      console.log('[candidate] Requesting camera access...')
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        },
        audio: false // Audio handled separately or add if needed
      })

      console.log('[candidate] Camera access granted, got stream')
      setLocalStream(stream)

      // Add tracks to peer connection
      const pc = initializePeerConnection()
      stream.getTracks().forEach(track => {
        console.log('[candidate] Adding track to peer connection:', track.kind)
        pc.addTrack(track, stream)
      })

      // Create and send offer
      console.log('[candidate] Creating WebRTC offer...')
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)

      sendMessage({
        type: 'webrtc_offer',
        offer: offer
      })

      console.log('[candidate] Sent WebRTC offer to interviewer')
    } catch (error) {
      console.error('[candidate] Failed to start video:', error)
      throw error
    }
  }, [sendMessage, initializePeerConnection])

  // Stop video
  const stopVideo = useCallback(() => {
    const stream = localStreamRef.current
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setLocalStream(null)
    }
    if (peerConnection.current) {
      peerConnection.current.close()
      peerConnection.current = null
    }
    setConnectionState('closed')
  }, []) // No dependencies - uses ref instead

  // Handle WebSocket messages
  useEffect(() => {
    if (!lastMessage) return

    const handleWebRTCMessage = async () => {
      console.log(`[${role}] Received message:`, lastMessage.type)
      const pc = initializePeerConnection()

      try {
        if (lastMessage.type === 'webrtc_offer' && role === 'interviewer') {
          // Interviewer receives offer from candidate
          console.log('[interviewer] Received WebRTC offer from candidate')
          await pc.setRemoteDescription(new RTCSessionDescription(lastMessage.offer))
          const answer = await pc.createAnswer()
          await pc.setLocalDescription(answer)

          sendMessage({
            type: 'webrtc_answer',
            answer: answer
          })

          console.log('[interviewer] Sent WebRTC answer')
        }

        else if (lastMessage.type === 'webrtc_answer' && role === 'candidate') {
          // Candidate receives answer from interviewer
          console.log('[candidate] Received WebRTC answer from interviewer')
          await pc.setRemoteDescription(new RTCSessionDescription(lastMessage.answer))
          console.log('[candidate] Set remote description successfully')
        }

        else if (lastMessage.type === 'webrtc_ice_candidate') {
          // Both parties receive ICE candidates
          console.log(`[${role}] Received ICE candidate`)
          if (lastMessage.candidate) {
            await pc.addIceCandidate(new RTCIceCandidate(lastMessage.candidate))
            console.log(`[${role}] Added ICE candidate successfully`)
          }
        }
      } catch (error) {
        console.error(`[${role}] WebRTC signaling error:`, error)
      }
    }

    handleWebRTCMessage()
  }, [lastMessage, role, sendMessage, initializePeerConnection])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      const stream = localStreamRef.current
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }
      if (peerConnection.current) {
        peerConnection.current.close()
      }
    }
  }, []) // Run only on unmount

  return {
    localStream,
    remoteStream,
    connectionState,
    startVideo,
    stopVideo,
  }
}
