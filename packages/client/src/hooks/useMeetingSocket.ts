import { useCallback, useEffect, useRef } from 'react'
import { useAuthStore } from '../store/authStore'
import { useMeetingStore } from '../store/meetingStore'
import type { ClientMessage, ServerMessage, AIMode } from '@comeet/shared'

export function useMeetingSocket(meetingId: string | null) {
  const wsRef = useRef<WebSocket | null>(null)
  const accessToken = useAuthStore(s => s.accessToken)
  const {
    setActive, setConnectionStatus, addTranscript, startResponse,
    appendToken, finishResponse, setError
  } = useMeetingStore()

  useEffect(() => {
    if (!meetingId || !accessToken) return

    setConnectionStatus('connecting')

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.host
    const ws = new WebSocket(`${protocol}//${host}/ws?token=${accessToken}&meetingId=${meetingId}`)
    wsRef.current = ws

    ws.onopen = () => {
      console.log('[WS] Connected, waiting for Deepgram...')
      setActive(true)
      setConnectionStatus('connected')
    }

    ws.onmessage = (event) => {
      const message: ServerMessage = JSON.parse(event.data)

      switch (message.type) {
        case 'ready':
          console.log('[WS] Server ready — Deepgram connected')
          setConnectionStatus('ready')
          break
        case 'transcript':
          addTranscript({ speaker: message.speaker, text: message.text, timestamp: message.timestamp })
          break
        case 'ai_start':
          startResponse(message.mode)
          break
        case 'ai_token':
          appendToken(message.token)
          break
        case 'ai_done':
          finishResponse(message.intent, message.latencyMs)
          break
        case 'ai_error':
          setError(message.message)
          break
        case 'meeting_ended':
          setActive(false)
          break
        case 'error':
          console.error('[WS] Server error:', message.message)
          setError(message.message)
          break
      }
    }

    ws.onclose = () => {
      console.log('[WS] Disconnected')
      setActive(false)
      setConnectionStatus('disconnected')
    }

    ws.onerror = (err) => {
      console.error('[WS] Error:', err)
      setConnectionStatus('disconnected')
    }

    return () => {
      ws.close()
      wsRef.current = null
    }
  }, [meetingId, accessToken, setActive, setConnectionStatus, addTranscript, startResponse, appendToken, finishResponse, setError])

  const send = useCallback((message: ClientMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message))
    }
  }, [])

  const sendAudio = useCallback((data: string) => {
    send({ type: 'audio_chunk', data })
  }, [send])

  const triggerMode = useCallback((mode: AIMode) => {
    send({ type: 'trigger_mode', mode })
  }, [send])

  const cancel = useCallback(() => {
    send({ type: 'cancel' })
  }, [send])

  const endMeeting = useCallback(() => {
    send({ type: 'end_meeting' })
  }, [send])

  return { sendAudio, triggerMode, cancel, endMeeting }
}
