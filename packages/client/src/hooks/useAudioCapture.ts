import { useCallback, useRef, useState } from 'react'

interface UseAudioCaptureOptions {
  onAudioChunk: (base64Data: string) => void
}

export function useAudioCapture({ onAudioChunk }: UseAudioCaptureOptions) {
  const [isCapturing, setIsCapturing] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const micStreamRef = useRef<MediaStream | null>(null)
  const systemStreamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)

  const start = useCallback(async () => {
    try {
      const micStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true }
      })
      micStreamRef.current = micStream

      let mixedStream: MediaStream
      try {
        const systemStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true
        })
        systemStreamRef.current = systemStream

        systemStream.getVideoTracks().forEach(t => t.stop())

        const ctx = new AudioContext()
        audioContextRef.current = ctx
        const dest = ctx.createMediaStreamDestination()

        const micSource = ctx.createMediaStreamSource(micStream)
        micSource.connect(dest)

        const systemSource = ctx.createMediaStreamSource(new MediaStream(systemStream.getAudioTracks()))
        systemSource.connect(dest)

        mixedStream = dest.stream
        console.log('[AudioCapture] Capturing mic + system audio')
      } catch {
        mixedStream = micStream
        console.log('[AudioCapture] Capturing mic only (no system audio)')
      }

      const mediaRecorder = new MediaRecorder(mixedStream, {
        mimeType: 'audio/webm;codecs=opus'
      })
      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.ondataavailable = async (event) => {
        if (event.data.size > 0) {
          const buffer = await event.data.arrayBuffer()
          const base64 = btoa(
            new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
          )
          onAudioChunk(base64)
        }
      }

      mediaRecorder.start(250)
      setIsCapturing(true)
    } catch (err) {
      console.error('[AudioCapture] Failed to start:', err)
      throw err
    }
  }, [onAudioChunk])

  const stop = useCallback(() => {
    mediaRecorderRef.current?.stop()
    mediaRecorderRef.current = null

    micStreamRef.current?.getTracks().forEach(t => t.stop())
    micStreamRef.current = null

    systemStreamRef.current?.getTracks().forEach(t => t.stop())
    systemStreamRef.current = null

    audioContextRef.current?.close()
    audioContextRef.current = null

    setIsCapturing(false)
  }, [])

  return { isCapturing, start, stop }
}
