import { useEffect, useRef } from 'react'
import { useMeetingStore } from '../../store/meetingStore'

export function TranscriptPanel() {
  const transcript = useMeetingStore(s => s.transcript)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [transcript])

  return (
    <div className="p-6">
      <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wider mb-4">
        Live Transcript
      </h2>

      {transcript.length === 0 ? (
        <div className="text-neutral-700 text-sm py-8 text-center">
          Start your microphone to begin transcribing...
        </div>
      ) : (
        <div className="space-y-3">
          {transcript.map((entry, i) => (
            <div key={i} className="flex gap-3">
              <span className={`text-xs font-medium uppercase mt-0.5 w-24 shrink-0 ${
                entry.speaker === 'interviewer' ? 'text-neutral-400' : 'text-white'
              }`}>
                {entry.speaker === 'interviewer' ? 'Them' : 'You'}
              </span>
              <p className="text-sm text-neutral-300 leading-relaxed">{entry.text}</p>
            </div>
          ))}
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  )
}
