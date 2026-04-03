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
    <div className="p-6">
      <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wider mb-4">
        AI Responses
      </h2>

      {allResponses.length === 0 ? (
        <div className="text-neutral-700 text-sm py-8 text-center">
          Click a mode button to generate a response...
        </div>
      ) : (
        <div className="space-y-4">
          {allResponses.map((resp, i) => (
            <div key={i} className="bg-[#0a0a0a] border border-neutral-800 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="px-2 py-0.5 bg-white/10 text-white rounded text-xs font-medium">
                  {resp.mode.replace(/_/g, ' ')}
                </span>
                {resp.intent && (
                  <span className="px-2 py-0.5 bg-neutral-800 text-neutral-400 rounded text-xs">
                    {resp.intent}
                  </span>
                )}
                {resp.latencyMs > 0 && (
                  <span className="px-2 py-0.5 bg-white/5 text-neutral-400 rounded text-xs">
                    {resp.latencyMs}ms
                  </span>
                )}
                {resp.isStreaming && (
                  <span className="flex items-center gap-1 text-xs text-neutral-300">
                    <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                    streaming
                  </span>
                )}
              </div>

              <div className="prose prose-invert prose-sm max-w-none prose-p:text-neutral-300 prose-headings:text-white prose-code:text-neutral-200 prose-strong:text-white">
                <ReactMarkdown>{resp.content || ''}</ReactMarkdown>
                {resp.isStreaming && <span className="animate-pulse text-white">|</span>}
              </div>
            </div>
          ))}
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  )
}
