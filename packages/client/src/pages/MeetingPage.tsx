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
  const { isActive, isRecording, connectionStatus, setMeeting, setRecording, reset } = useMeetingStore()
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
      <header className="h-12 border-b border-neutral-800/50 flex items-center justify-between px-5 shrink-0 bg-neutral-950/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="text-neutral-600 hover:text-neutral-300 text-xs transition-colors"
          >
            &larr; Back
          </button>
          <div className="w-px h-4 bg-neutral-800" />
          <h1 className="text-sm font-medium text-neutral-300">Meeting</h1>
          {connectionStatus === 'connecting' && (
            <span className="flex items-center gap-1.5 text-[10px] text-amber-400 font-medium">
              <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse" />
              Connecting...
            </span>
          )}
          {connectionStatus === 'connected' && (
            <span className="flex items-center gap-1.5 text-[10px] text-amber-400 font-medium">
              <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse" />
              Initializing...
            </span>
          )}
          {connectionStatus === 'ready' && (
            <span className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-medium">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
              Ready
            </span>
          )}
          {isCapturing && (
            <span className="text-[10px] text-sky-400/60 font-mono">recording</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleRecording}
            disabled={connectionStatus !== 'ready' && !isCapturing}
            className={`px-3 py-1 rounded-md text-[11px] font-medium transition-all ${
              isCapturing
                ? 'bg-red-500/15 text-red-400 hover:bg-red-500/25 ring-1 ring-red-500/20'
                : connectionStatus !== 'ready'
                  ? 'bg-neutral-800/30 text-neutral-600 cursor-not-allowed'
                  : 'bg-neutral-800/60 text-neutral-400 hover:bg-neutral-700 hover:text-neutral-200'
            }`}
          >
            {isCapturing ? 'Stop Mic' : connectionStatus !== 'ready' ? 'Connecting...' : 'Start Mic'}
          </button>
          <button
            onClick={handleEndMeeting}
            className="px-3 py-1 bg-white hover:bg-neutral-200 text-black rounded-md text-[11px] font-medium transition-colors"
          >
            End Meeting
          </button>
        </div>
      </header>

      {micError && (
        <div className="px-5 py-2.5 bg-red-500/5 border-b border-red-500/10 text-red-400 text-xs flex items-center justify-between">
          <span>{micError}</span>
          <button onClick={() => setMicError(null)} className="text-red-500 hover:text-red-300 ml-4 text-sm">&times;</button>
        </div>
      )}

      <ModeToolbar onTrigger={triggerMode} onCancel={cancel} />

      <div className="flex-1 flex overflow-hidden">
        <div className="w-1/2 border-r border-neutral-800/30 overflow-auto">
          <TranscriptPanel />
        </div>
        <div className="w-1/2 overflow-auto">
          <AIResponsePanel />
        </div>
      </div>
    </div>
  )
}
