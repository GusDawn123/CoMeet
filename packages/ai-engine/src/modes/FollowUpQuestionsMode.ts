import type { LLMRouter } from '../LLMRouter'
import { FOLLOW_UP_QUESTIONS_PROMPT } from '../prompts/index'

export class FollowUpQuestionsMode {
  constructor(private llmRouter: LLMRouter) {}

  async *generateStream(context: string): AsyncGenerator<string> {
    try {
      yield* this.llmRouter.streamChat(context, undefined, undefined, FOLLOW_UP_QUESTIONS_PROMPT)
    } catch (error) {
      console.error('[FollowUpQuestionsMode] Stream failed:', error)
      yield ''
    }
  }
}
