import type { LLMRouter } from '../LLMRouter'
import { FOLLOWUP_PROMPT } from '../prompts/index'

export class FollowUpMode {
  constructor(private llmRouter: LLMRouter) {}

  async *generateStream(
    previousAnswer: string,
    refinementRequest: string,
    context?: string
  ): AsyncGenerator<string> {
    try {
      const message = `PREVIOUS ANSWER:\n${previousAnswer}\n\nUSER REQUEST:\n${refinementRequest}`
      yield* this.llmRouter.streamChat(message, undefined, context, FOLLOWUP_PROMPT)
    } catch (error) {
      console.error('[FollowUpMode] Stream failed:', error)
      yield ''
    }
  }
}
