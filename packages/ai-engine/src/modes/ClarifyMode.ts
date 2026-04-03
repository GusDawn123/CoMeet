import type { LLMRouter } from '../LLMRouter'
import { CLARIFY_PROMPT } from '../prompts/index'

export class ClarifyMode {
  constructor(private llmRouter: LLMRouter) {}

  async *generateStream(context: string): AsyncGenerator<string> {
    try {
      yield* this.llmRouter.streamChat(context, undefined, undefined, CLARIFY_PROMPT)
    } catch (error) {
      console.error('[ClarifyMode] Stream failed:', error)
      yield "Could you give me a bit more context on the constraints?"
    }
  }
}
