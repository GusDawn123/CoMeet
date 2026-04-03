import type { LLMRouter } from '../LLMRouter'
import { WHAT_TO_ANSWER_PROMPT } from '../prompts/index'
import type { TemporalContext } from '../TemporalContextBuilder'
import { formatTemporalContextForPrompt } from '../TemporalContextBuilder'
import type { IntentResult } from '../IntentClassifier'

export class WhatToAnswerMode {
  constructor(private llmRouter: LLMRouter) {}

  async *generateStream(
    cleanedTranscript: string,
    temporalContext?: TemporalContext,
    intentResult?: IntentResult,
    imagePaths?: string[]
  ): AsyncGenerator<string> {
    try {
      const contextParts: string[] = []

      if (intentResult) {
        contextParts.push(`<intent_and_shape>\nDETECTED INTENT: ${intentResult.intent}\nANSWER SHAPE: ${intentResult.answerShape}\n</intent_and_shape>`)
      }

      if (temporalContext?.hasRecentResponses) {
        contextParts.push(formatTemporalContextForPrompt(temporalContext))
      }

      const extraContext = contextParts.join('\n\n')
      const fullMessage = extraContext
        ? `${extraContext}\n\nCONVERSATION:\n${cleanedTranscript}`
        : cleanedTranscript

      yield* this.llmRouter.streamChat(fullMessage, imagePaths, undefined, WHAT_TO_ANSWER_PROMPT)
    } catch (error) {
      console.error('[WhatToAnswerMode] Stream failed:', error)
      yield "Could you repeat that? I want to make sure I address your question properly."
    }
  }
}
