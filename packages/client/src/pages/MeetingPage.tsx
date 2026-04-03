import { useEffect, useCallback, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useMeetingStore } from '../store/meetingStore'
import { useMeetingSocket } from '../hooks/useMeetingSocket'
import { useAudioCapture } from '../hooks/useAudioCapture'
import { TranscriptPanel } from '../components/meeting/TranscriptPanel'
import { AIResponsePanel } from '../components/meeting/AIResponsePanel'
import { ModeToolbar } from '../components/meeting/ModeToolbar'

export function MeetingPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { isActive, isRecording, setMeeting, setRecording, reset } = useMeetingStore()
  const { sendAudio, triggerMode, cancel, endMeeting } = useMeetingSocket(id || null)

  const onAudioChunk = useCallback((base64Data: string) => {
    sendAudio(base64Data)
  }, [sendAudio])

  const { isCapturing, start: startCapture, stop: stopCapture } = useAudioCapture({ onAudioChunk })
  const [micError, setMicError] = useState<string | null>(null)

  useEffect(() => {
    if (id) setMeeting(id)
    return () => reset()
  }, [id, setMeeting, reset])

  const toggleRecording = async () => {
    setMicError(null)
    if (isCapturing) {
      stopCapture()
      setRecording(false)
    } else {
      try {
        await startCapture()
        setRecording(true)
      } catch (err: any) {
        console.error('Failed to start audio capture:', err)
        if (err?.name === 'NotAllowedError') {
          setMicError('Microphone permission denied. Please allow mic access in your browser settings.')
        } else if (err?.name === 'NotFoundError') {
          setMicError('No microphone found. Please connect a mic and try again.')
        } else {
          setMicError('Failed to access microphone. Please open this app in a full browser window (not embedded preview).')
        }
      }
    }
  }

  const handleEndMeeting = () => {
    stopCapture()
    setRecording(false)
    endMeeting()
    setTimeout(() => navigate('/dashboard'), 2000)
  }

  return (
    <div className="h-screen flex flex-col bg-black">
      <header className="h-14 border-b border-neutral-800 flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="text-neutral-500 hover:text-white text-sm"
          >
            &larr; Back
          </button>
          <h1 className="font-medium text-white">Meeting</h1>
          {isActive && (
            <span className="flex items-center gap-1.5 text-xs text-white">
              <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
              Live
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleRecording}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              isCapturing
                ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
            }`}
          >
            {isCapturing ? 'Stop Mic' : 'Start Mic'}
          </button>
          <button
            onClick={handleEndMeeting}
            className="px-4 py-1.5 bg-white hover:bg-neutral-200 text-black rounded-lg text-sm font-medium transition-colors"
          >
            End Meeting
          </button>
        </div>
      </header>

      {micError && (
        <div className="px-6 py-3 bg-red-500/10 border-b border-red-500/20 text-red-400 text-sm flex items-center justify-between">
          <span>{micError}</span>
          <button onClick={() => setMicError(null)} className="text-red-500 hover:text-red-300 ml-4">&times;</button>
        </div>
      )}

      <ModeToolbar onTrigger={triggerMode} onCancel={cancel} />

      <div className="flex-1 flex overflow-hidden">
        <div className="w-1/2 border-r border-neutral-800 overflow-auto">
          <TranscriptPanel />
        </div>

        <div className="w-1/2 overflow-auto">
          <AIResponsePanel />
        </div>
      </div>
    </div>
  )
}
