export interface AssistantResponse {
  text: string
  timestamp: number
  questionContext: string
}

export interface ContextItem {
  role: 'interviewer' | 'user' | 'assistant'
  text: string
  timestamp: number
}

export interface TemporalContext {
  recentTranscript: string
  previousResponses: string[]
  roleContext: 'responding_to_interviewer' | 'responding_to_user' | 'general'
  toneSignals: ToneSignal[]
  hasRecentResponses: boolean
}

export interface ToneSignal {
  type: 'formal' | 'casual' | 'technical' | 'conversational'
  confidence: number
}

function extractToneSignals(responses: AssistantResponse[]): ToneSignal[] {
  const signals: ToneSignal[] = []
  if (responses.length === 0) return signals

  const combinedText = responses.map(r => r.text).join(' ').toLowerCase()

  const technicalPatterns = [
    /\b(implement|architecture|api|function|component|module|database|algorithm)\b/g,
    /```[\s\S]*?```/g,
    /\b(async|await|promise|callback)\b/g
  ]
  const technicalMatches = technicalPatterns.reduce((sum, p) =>
    sum + (combinedText.match(p)?.length || 0), 0)
  if (technicalMatches > 2) {
    signals.push({ type: 'technical', confidence: Math.min(technicalMatches / 5, 1) })
  }

  const formalPatterns = [
    /\b(therefore|consequently|furthermore|moreover|regarding)\b/g,
    /\b(I would recommend|It is important to note)\b/gi
  ]
  const formalMatches = formalPatterns.reduce((sum, p) =>
    sum + (combinedText.match(p)?.length || 0), 0)
  if (formalMatches > 1) {
    signals.push({ type: 'formal', confidence: Math.min(formalMatches / 3, 1) })
  }

  const casualPatterns = [
    /\b(so basically|you know|pretty much|kind of|sort of)\b/gi,
    /\b(honestly|actually|literally)\b/gi
  ]
  const casualMatches = casualPatterns.reduce((sum, p) =>
    sum + (combinedText.match(p)?.length || 0), 0)
  if (casualMatches > 1) {
    signals.push({ type: 'casual', confidence: Math.min(casualMatches / 3, 1) })
  }

  return signals
}

function detectRoleContext(
  contextItems: ContextItem[]
): 'responding_to_interviewer' | 'responding_to_user' | 'general' {
  const recent = contextItems.slice(-5)
  if (recent.length === 0) return 'general'
  for (let i = recent.length - 1; i >= 0; i--) {
    if (recent[i].role === 'interviewer') return 'responding_to_interviewer'
    if (recent[i].role === 'user') return 'responding_to_user'
  }
  return 'general'
}

function formatPreviousResponses(responses: AssistantResponse[], maxResponses: number = 3): string[] {
  if (responses.length === 0) return []
  const recent = responses.slice(-maxResponses)
  return recent.map(r => r.text.length > 200 ? r.text.substring(0, 200) + '...' : r.text)
}

function formatTranscript(items: ContextItem[]): string {
  return items.map(item => {
    if (item.role === 'interviewer') return `[INTERVIEWER – IMPORTANT]: ${item.text}`
    else if (item.role === 'user') return `[ME]: ${item.text}`
    else return `[ASSISTANT (MY PREVIOUS RESPONSE)]: ${item.text}`
  }).join('\n')
}

export function buildTemporalContext(
  contextItems: ContextItem[],
  assistantHistory: AssistantResponse[],
  windowSeconds: number = 180
): TemporalContext {
  const now = Date.now()
  const cutoff = now - (windowSeconds * 1000)
  const recentItems = contextItems.filter(item => item.timestamp >= cutoff)
  const recentResponses = assistantHistory.filter(r => r.timestamp >= cutoff)

  return {
    recentTranscript: formatTranscript(recentItems),
    previousResponses: formatPreviousResponses(recentResponses),
    roleContext: detectRoleContext(recentItems),
    toneSignals: extractToneSignals(recentResponses),
    hasRecentResponses: recentResponses.length > 0
  }
}

export function formatTemporalContextForPrompt(ctx: TemporalContext): string {
  const parts: string[] = []

  if (ctx.previousResponses.length > 0) {
    parts.push(`<previous_responses_to_avoid_repeating>`)
    ctx.previousResponses.forEach((resp, i) => {
      parts.push(`Response ${i + 1}: "${resp}"`)
    })
    parts.push(`</previous_responses_to_avoid_repeating>`)
  }

  if (ctx.toneSignals.length > 0) {
    const primary = ctx.toneSignals.sort((a, b) => b.confidence - a.confidence)[0]
    parts.push(`<tone_guidance>Maintain ${primary.type} tone to stay consistent.</tone_guidance>`)
  }

  if (ctx.roleContext !== 'general') {
    const roleDesc = ctx.roleContext === 'responding_to_interviewer'
      ? "You are responding to the interviewer's question."
      : 'You are helping the user formulate their response.'
    parts.push(`<role_context>${roleDesc}</role_context>`)
  }

  return parts.join('\n')
}
