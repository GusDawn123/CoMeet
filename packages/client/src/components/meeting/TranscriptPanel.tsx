import { useEffect, useRef } from 'react'
import { useMeetingStore } from '../../store/meetingStore'

export function TranscriptPanel() {
  const transcript = useMeetingStore(s => s.transcript)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [transcript])

  return (
    <div className="p-5">
      <div className="flex items-center gap-2 mb-5">
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        <h2 className="text-xs font-semibold text-neutral-400 uppercase tracking-widest">
          Transcript
        </h2>
      </div>

      {transcript.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-10 h-10 rounded-full border border-neutral-800 flex items-center justify-center mb-3">
            <svg className="w-5 h-5 text-neutral-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
            </svg>
          </div>
          <p className="text-neutral-600 text-sm">Start your microphone to begin</p>
        </div>
      ) : (
        <div className="space-y-1">
          {transcript.map((entry, i) => {
            const isUser = entry.speaker !== 'interviewer'
            return (
              <div
                key={i}
                className={`flex gap-3 px-3 py-2 rounded-lg ${
                  isUser ? 'bg-sky-500/5' : 'bg-transparent'
                }`}
              >
                <span className={`text-[10px] font-bold uppercase mt-0.5 w-10 shrink-0 tracking-wider ${
                  isUser ? 'text-sky-400' : 'text-orange-400/70'
                }`}>
                  {isUser ? 'You' : 'Them'}
                </span>
                <p className={`text-sm leading-relaxed ${
                  isUser ? 'text-neutral-200' : 'text-neutral-400'
                }`}>
                  {entry.text}
                </p>
              </div>
            )
          })}
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  )
}
