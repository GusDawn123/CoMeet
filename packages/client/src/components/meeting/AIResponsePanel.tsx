import { useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import { useMeetingStore } from '../../store/meetingStore'

export function AIResponsePanel() {
  const currentResponse = useMeetingStore(s => s.currentResponse)
  const responses = useMeetingStore(s => s.responses)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [currentResponse?.content, responses])

  const allResponses = [...responses, ...(currentResponse ? [currentResponse] : [])]

  return (
    <div className="p-5">
      <div className="flex items-center gap-2 mb-5">
        <div className="w-1.5 h-1.5 rounded-full bg-violet-400" />
        <h2 className="text-xs font-semibold text-neutral-400 uppercase tracking-widest">
          AI Response
        </h2>
      </div>

      {allResponses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-10 h-10 rounded-full border border-neutral-800 flex items-center justify-center mb-3">
            <svg className="w-5 h-5 text-neutral-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
            </svg>
          </div>
          <p className="text-neutral-600 text-sm">Select a mode to get started</p>
        </div>
      ) : (
        <div className="space-y-4">
          {allResponses.map((resp, i) => (
            <div key={i} className="rounded-xl border border-neutral-800/50 bg-neutral-900/50 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2.5 border-b border-neutral-800/50 bg-neutral-900/30">
                <span className="px-2 py-0.5 bg-violet-500/15 text-violet-300 rounded text-[10px] font-semibold uppercase tracking-wider">
                  {resp.mode.replace(/_/g, ' ')}
                </span>
                {resp.intent && (
                  <span className="px-2 py-0.5 bg-neutral-800/50 text-neutral-500 rounded text-[10px]">
                    {resp.intent}
                  </span>
                )}
                {resp.isStreaming && (
                  <span className="flex items-center gap-1.5 text-[10px] text-emerald-400 ml-auto">
                    <span className="w-1 h-1 bg-emerald-400 rounded-full animate-pulse" />
                    streaming
                  </span>
                )}
                {resp.latencyMs > 0 && (
                  <span className="text-[10px] text-neutral-600 ml-auto">
                    {resp.latencyMs}ms
                  </span>
                )}
              </div>

              <div className="px-4 py-3 prose prose-invert prose-sm max-w-none prose-p:text-neutral-300 prose-headings:text-white prose-code:text-violet-300 prose-code:bg-violet-500/10 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-strong:text-white prose-pre:bg-neutral-950 prose-pre:border prose-pre:border-neutral-800">
                <ReactMarkdown>{resp.content || ''}</ReactMarkdown>
                {resp.isStreaming && <span className="animate-pulse text-violet-300">|</span>}
              </div>
            </div>
          ))}
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  )
}
