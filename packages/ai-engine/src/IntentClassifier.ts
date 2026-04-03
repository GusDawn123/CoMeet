export type ConversationIntent =
  | 'clarification'
  | 'follow_up'
  | 'deep_dive'
  | 'behavioral'
  | 'example_request'
  | 'summary_probe'
  | 'coding'
  | 'general'

export interface IntentResult {
  intent: ConversationIntent
  confidence: number
  answerShape: string
}

const INTENT_ANSWER_SHAPES: Record<ConversationIntent, string> = {
  clarification: 'Give a direct, focused 1-2 sentence clarification. No setup, no context-setting.',
  follow_up: 'Continue the narrative naturally. 1-2 sentences. No recap of what was already said.',
  deep_dive: 'Provide a structured but concise explanation. Use concrete specifics, not abstract concepts.',
  behavioral: 'Lead with a specific example or story. Use the STAR pattern implicitly. Focus on actions and outcomes.',
  example_request: 'Provide ONE concrete, detailed example. Make it realistic and specific.',
  summary_probe: 'Confirm the summary briefly and add one clarifying point if needed.',
  coding: 'Provide a FULL, complete, working and production-ready code implementation. Start with a brief approach description, then the fully runnable code block, then a concise explanation of why this approach works.',
  general: 'Respond naturally based on context. Keep it conversational and direct.'
}

function detectIntentByPattern(lastInterviewerTurn: string): IntentResult | null {
  const text = lastInterviewerTurn.toLowerCase().trim()

  if (/(write code|program|implement|function for|algorithm|how to code|setup a .* project|using .* library|debug this|snippet|boilerplate|optimize|refactor|best practice for .* code|utility method|component for|logic for|solve|lru|binary|tree|graph|sort|search|linked list|array|stack|queue|hash|leetcode|two sum|reverse|merge|dynamic programming)/i.test(text)) {
    return { intent: 'coding', confidence: 0.9, answerShape: INTENT_ANSWER_SHAPES.coding }
  }

  if (/(give me an example|tell me about a time|describe a situation|when have you|share an experience|how did you handle|walk me through a project|leadership|conflict|challenge you faced|difficult teammate)/i.test(text)) {
    return { intent: 'behavioral', confidence: 0.9, answerShape: INTENT_ANSWER_SHAPES.behavioral }
  }

  if (/(can you explain|what do you mean|clarify|could you elaborate|what does that mean|how so|in what way)/i.test(text)) {
    return { intent: 'clarification', confidence: 0.9, answerShape: INTENT_ANSWER_SHAPES.clarification }
  }

  if (/(what happened|then what|and after that|what.s next|how did that go|what was the result|and then)/i.test(text)) {
    return { intent: 'follow_up', confidence: 0.85, answerShape: INTENT_ANSWER_SHAPES.follow_up }
  }

  if (/(tell me more|dive deeper|explain further|walk me through|how does that work|why did you|can you go deeper|more detail)/i.test(text)) {
    return { intent: 'deep_dive', confidence: 0.85, answerShape: INTENT_ANSWER_SHAPES.deep_dive }
  }

  if (/(for example|concrete example|specific instance|like what|such as|give me a case)/i.test(text)) {
    return { intent: 'example_request', confidence: 0.85, answerShape: INTENT_ANSWER_SHAPES.example_request }
  }

  if (/(so to summarize|in summary|so basically|so you.re saying|let me make sure|so what you.re telling me)/i.test(text)) {
    return { intent: 'summary_probe', confidence: 0.85, answerShape: INTENT_ANSWER_SHAPES.summary_probe }
  }

  if (/(what is|what are|what's|how does|how do|difference between|compare|explain|define|describe|tell me about)\b/i.test(text)) {
    return { intent: 'deep_dive', confidence: 0.8, answerShape: INTENT_ANSWER_SHAPES.deep_dive }
  }

  if (/(design a|architect|scale|load balancer|database schema|microservice|distributed|system design|high availability)/i.test(text)) {
    return { intent: 'coding', confidence: 0.85, answerShape: INTENT_ANSWER_SHAPES.coding }
  }

  return null
}

function detectIntentByContext(
  recentTranscript: string,
  assistantMessageCount: number
): IntentResult {
  if (assistantMessageCount >= 2) {
    const lines = recentTranscript.split('\n')
    const interviewerLines = lines.filter(l => l.includes('[INTERVIEWER'))
    const lastInterviewerLine = interviewerLines[interviewerLines.length - 1] || ''
    if (lastInterviewerLine.length < 50 && assistantMessageCount >= 2) {
      return { intent: 'follow_up', confidence: 0.7, answerShape: INTENT_ANSWER_SHAPES.follow_up }
    }
  }
  return { intent: 'general', confidence: 0.5, answerShape: INTENT_ANSWER_SHAPES.general }
}

export async function classifyIntent(
  lastInterviewerTurn: string | null,
  recentTranscript: string,
  assistantMessageCount: number
): Promise<IntentResult> {
  if (lastInterviewerTurn) {
    const patternResult = detectIntentByPattern(lastInterviewerTurn)
    if (patternResult) {
      console.log(`[IntentClassifier] Regex matched: "${patternResult.intent}" for "${lastInterviewerTurn.substring(0, 60)}..."`)
      return patternResult
    }
  }

  const contextResult = detectIntentByContext(recentTranscript, assistantMessageCount)
  console.log(`[IntentClassifier] Context fallback: "${contextResult.intent}"`)
  return contextResult
}

export function getAnswerShapeGuidance(intent: ConversationIntent): string {
  return INTENT_ANSWER_SHAPES[intent]
}

export function warmupIntentClassifier(): void {
  console.log('[IntentClassifier] Initialized (regex + context tiers)')
}
