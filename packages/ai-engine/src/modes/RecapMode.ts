import type { LLMRouter } from '../LLMRouter'
import { RECAP_PROMPT } from '../prompts/index'

export class RecapMode {
  constructor(private llmRouter: LLMRouter) {}

  async *generateStream(context: string): AsyncGenerator<string> {
    try {
      yield* this.llmRouter.streamChat(`Conversation to recap:\n${context}`, undefined, undefined, RECAP_PROMPT)
    } catch (error) {
      console.error('[RecapMode] Stream failed:', error)
      yield 'Unable to generate recap.'
    }
  }
}
