import type { LLMRouter } from '../LLMRouter'
import { BRAINSTORM_PROMPT } from '../prompts/index'

export class BrainstormMode {
  constructor(private llmRouter: LLMRouter) {}

  async *generateStream(context: string, imagePaths?: string[]): AsyncGenerator<string> {
    try {
      yield* this.llmRouter.streamChat(context, imagePaths, undefined, BRAINSTORM_PROMPT)
    } catch (error) {
      console.error('[BrainstormMode] Stream failed:', error)
      yield "I couldn't generate brainstorm approaches. Make sure your question is visible and try again."
    }
  }
}
