import type { AssistantResponse, ContextItem } from './TemporalContextBuilder'

export interface TranscriptSegment {
  role: 'interviewer' | 'user' | 'assistant'
  text: string
  timestamp: number
  isFinal?: boolean
  confidence?: number
}

const MAX_CONTEXT_ITEMS = 500
const MAX_ASSISTANT_HISTORY = 10

export class SessionTracker {
  private contextItems: ContextItem[] = []
  private fullTranscript: TranscriptSegment[] = []
  private assistantResponseHistory: AssistantResponse[] = []
  private lastInterimInterviewer: TranscriptSegment | null = null
  private detectedCodingQuestion: { question: string | null; source: 'transcript' | 'screenshot' | null } = { question: null, source: null }
  private sessionStartTime: number = Date.now()

  handleTranscript(segment: TranscriptSegment): ContextItem | null {
    this.fullTranscript.push(segment)

    if (!segment.isFinal && segment.role === 'interviewer') {
      this.lastInterimInterviewer = segment
      return null
    }

    this.lastInterimInterviewer = null

    const lastItem = this.contextItems[this.contextItems.length - 1]
    if (lastItem &&
      lastItem.role === segment.role &&
      lastItem.text === segment.text &&
      Math.abs(lastItem.timestamp - segment.timestamp) < 1000) {
      return null
    }

    if (segment.role !== 'interviewer' && segment.text.trim().length < 5) {
      return null
    }

    const item: ContextItem = {
      role: segment.role,
      text: segment.text,
      timestamp: segment.timestamp
    }

    this.contextItems.push(item)

    if (this.contextItems.length > MAX_CONTEXT_ITEMS) {
      this.contextItems = this.contextItems.slice(-MAX_CONTEXT_ITEMS)
    }

    if (segment.role === 'interviewer') {
      this.detectCodingQuestionFromText(segment.text)
    }

    return item
  }

  addAssistantMessage(text: string): void {
    const lastInterviewer = this.getLastInterviewerTurn()
    this.assistantResponseHistory.push({
      text,
      timestamp: Date.now(),
      questionContext: lastInterviewer || ''
    })

    if (this.assistantResponseHistory.length > MAX_ASSISTANT_HISTORY) {
      this.assistantResponseHistory = this.assistantResponseHistory.slice(-MAX_ASSISTANT_HISTORY)
    }

    this.contextItems.push({
      role: 'assistant',
      text: text.substring(0, 500),
      timestamp: Date.now()
    })
  }

  getAssistantResponseHistory(): AssistantResponse[] {
    return this.assistantResponseHistory
  }

  getLastAssistantMessage(): string | null {
    if (this.assistantResponseHistory.length === 0) return null
    return this.assistantResponseHistory[this.assistantResponseHistory.length - 1].text
  }

  getContext(lastSeconds: number = 120): ContextItem[] {
    const cutoff = Date.now() - (lastSeconds * 1000)
    return this.contextItems.filter(item => item.timestamp >= cutoff)
  }

  getFormattedContext(lastSeconds: number = 120): string {
    const items = this.getContext(lastSeconds)
    if (items.length === 0) return ''

    return items.map(item => {
      const label = item.role === 'interviewer' ? 'INTERVIEWER'
        : item.role === 'user' ? 'ME' : 'ASSISTANT'
      return `[${label}]: ${item.text}`
    }).join('\n')
  }

  getLastInterviewerTurn(): string | null {
    for (let i = this.contextItems.length - 1; i >= 0; i--) {
      if (this.contextItems[i].role === 'interviewer') {
        return this.contextItems[i].text
      }
    }
    return null
  }

  getFullTranscript(): TranscriptSegment[] {
    return this.fullTranscript
  }

  private detectCodingQuestionFromText(text: string): void {
    const codingPatterns = /\b(implement|write|code|solve|build|create|design|algorithm|function|class|method|leetcode|two sum|binary search|linked list|tree|graph|dynamic programming|lru|cache|sort|reverse|merge|stack|queue|hash map)\b/i
    if (codingPatterns.test(text) && text.length > 15) {
      this.detectedCodingQuestion = { question: text, source: 'transcript' }
      console.log(`[SessionTracker] Detected coding question: "${text.substring(0, 60)}..."`)
    }
  }

  setCodingQuestion(question: string, source: 'transcript' | 'screenshot'): void {
    this.detectedCodingQuestion = { question, source }
  }

  getDetectedCodingQuestion(): { question: string | null; source: 'transcript' | 'screenshot' | null } {
    return this.detectedCodingQuestion
  }

  reset(): void {
    this.contextItems = []
    this.fullTranscript = []
    this.assistantResponseHistory = []
    this.lastInterimInterviewer = null
    this.detectedCodingQuestion = { question: null, source: null }
    this.sessionStartTime = Date.now()
    console.log('[SessionTracker] Reset')
  }
}
