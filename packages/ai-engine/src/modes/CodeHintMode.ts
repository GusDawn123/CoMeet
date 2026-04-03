import type { LLMRouter } from '../LLMRouter'
import { CODE_HINT_PROMPT, buildCodeHintMessage } from '../prompts/index'

export class CodeHintMode {
  constructor(private llmRouter: LLMRouter) {}

  async *generateStream(
    imagePaths?: string[],
    questionContext?: string,
    questionSource?: 'screenshot' | 'transcript' | null,
    transcriptContext?: string
  ): AsyncGenerator<string> {
    try {
      const message = buildCodeHintMessage(
        questionContext || null,
        questionSource || null,
        transcriptContext || null
      )
      yield* this.llmRouter.streamChat(message, imagePaths, undefined, CODE_HINT_PROMPT)
    } catch (error) {
      console.error('[CodeHintMode] Stream failed:', error)
      yield "I couldn't detect any code in the screenshot. Try screenshotting your code editor directly."
    }
  }
}
