import { EventEmitter } from 'events'
import { LLMRouter } from './LLMRouter'
import { SessionTracker } from './SessionTracker'
import { WhatToAnswerMode } from './modes/WhatToAnswerMode'
import { ClarifyMode } from './modes/ClarifyMode'
import { CodeHintMode } from './modes/CodeHintMode'
import { BrainstormMode } from './modes/BrainstormMode'
import { FollowUpMode } from './modes/FollowUpMode'
import { RecapMode } from './modes/RecapMode'
import { FollowUpQuestionsMode } from './modes/FollowUpQuestionsMode'
import { prepareTranscriptForWhatToAnswer } from './TranscriptCleaner'
import { buildTemporalContext } from './TemporalContextBuilder'
import { classifyIntent } from './IntentClassifier'

export type IntelligenceMode =
  | 'idle' | 'what_to_say' | 'follow_up' | 'recap'
  | 'clarify' | 'code_hint' | 'brainstorm' | 'follow_up_questions'

export class IntelligenceEngine extends EventEmitter {
  private activeMode: IntelligenceMode = 'idle'
  private currentGenerationId: number = 0

  private whatToAnswerMode: WhatToAnswerMode
  private clarifyMode: ClarifyMode
  private codeHintMode: CodeHintMode
  private brainstormMode: BrainstormMode
  private followUpMode: FollowUpMode
  private recapMode: RecapMode
  private followUpQuestionsMode: FollowUpQuestionsMode

  constructor(
    private llmRouter: LLMRouter,
    private session: SessionTracker
  ) {
    super()
    this.whatToAnswerMode = new WhatToAnswerMode(llmRouter)
    this.clarifyMode = new ClarifyMode(llmRouter)
    this.codeHintMode = new CodeHintMode(llmRouter)
    this.brainstormMode = new BrainstormMode(llmRouter)
    this.followUpMode = new FollowUpMode(llmRouter)
    this.recapMode = new RecapMode(llmRouter)
    this.followUpQuestionsMode = new FollowUpQuestionsMode(llmRouter)
    console.log('[IntelligenceEngine] Initialized with all mode LLMs')
  }

  async runWhatShouldISay(language?: string): Promise<string | null> {
    this.setMode('what_to_say')
    const generationId = ++this.currentGenerationId
    const startTime = Date.now()

    try {
      const contextItems = this.session.getContext(180)
      const transcriptTurns = contextItems.map(item => ({
        role: item.role,
        text: item.text,
        timestamp: item.timestamp
      }))
      const preparedTranscript = prepareTranscriptForWhatToAnswer(transcriptTurns, 12)

      const lastInterviewerTurn = this.session.getLastInterviewerTurn()
      const intentResult = await classifyIntent(
        lastInterviewerTurn,
        preparedTranscript,
        this.session.getAssistantResponseHistory().length
      )

      console.log(`[IntelligenceEngine] Intent: ${intentResult.intent} (${(intentResult.confidence * 100).toFixed(0)}%)`)

      const temporalContext = buildTemporalContext(
        contextItems,
        this.session.getAssistantResponseHistory(),
        180
      )

      let finalTranscript = preparedTranscript
      if (language) {
        finalTranscript = `<preferred_language>${language}</preferred_language>\n\n${finalTranscript}`
      }

      const stream = this.whatToAnswerMode.generateStream(
        finalTranscript, temporalContext, intentResult
      )

      let fullAnswer = ''
      let firstTokenEmitted = false
      for await (const token of stream) {
        if (this.currentGenerationId !== generationId) {
          console.log('[IntelligenceEngine] what_to_say stream aborted')
          this.setMode('idle')
          return null
        }
        if (!firstTokenEmitted) {
          const latencyMs = Date.now() - startTime
          this.emit('first_token_latency', latencyMs)
          firstTokenEmitted = true
        }
        this.emit('suggested_answer_token', token)
        fullAnswer += token
      }

      if (!fullAnswer || fullAnswer.trim().length < 5) {
        fullAnswer = "Could you repeat that? I want to make sure I address your question properly."
      }

      this.session.addAssistantMessage(fullAnswer)
      this.emit('suggested_answer', fullAnswer, intentResult.intent, this.llmRouter.getActiveProvider())
      this.setMode('idle')
      return fullAnswer

    } catch (error) {
      console.error('[IntelligenceEngine] what_to_say error:', error)
      this.emit('error', error, 'what_to_say')
      this.setMode('idle')
      return "Could you repeat that? I want to make sure I address your question properly."
    }
  }

  async runClarify(): Promise<string | null> {
    this.setMode('clarify')
    const generationId = ++this.currentGenerationId
    const startTime = Date.now()

    try {
      const context = this.session.getFormattedContext(180) ||
        '[No transcript yet. Generate a scoping question for the upcoming problem.]'

      let full = ''
      let firstTokenEmitted = false
      const stream = this.clarifyMode.generateStream(context)
      for await (const token of stream) {
        if (this.currentGenerationId !== generationId) break
        if (!firstTokenEmitted) {
          this.emit('first_token_latency', Date.now() - startTime)
          firstTokenEmitted = true
        }
        this.emit('suggested_answer_token', token)
        full += token
      }

      if (full) {
        this.session.addAssistantMessage(full)
        this.emit('suggested_answer', full, 'clarify', this.llmRouter.getActiveProvider())
      }
      this.setMode('idle')
      return full

    } catch (error) {
      this.emit('error', error, 'clarify')
      this.setMode('idle')
      return null
    }
  }

  async runCodeHint(problemStatement?: string): Promise<string | null> {
    this.setMode('code_hint')
    const generationId = ++this.currentGenerationId
    const startTime = Date.now()

    try {
      const sessionQuestion = this.session.getDetectedCodingQuestion()
      const questionContext = problemStatement ?? sessionQuestion.question ?? undefined
      const questionSource = problemStatement ? 'screenshot' as const : sessionQuestion.source
      const transcriptContext = !questionContext ? this.session.getFormattedContext(180) : undefined

      let full = ''
      let firstTokenEmitted = false
      const stream = this.codeHintMode.generateStream(
        undefined, questionContext, questionSource, transcriptContext
      )
      for await (const token of stream) {
        if (this.currentGenerationId !== generationId) break
        if (!firstTokenEmitted) {
          this.emit('first_token_latency', Date.now() - startTime)
          firstTokenEmitted = true
        }
        this.emit('suggested_answer_token', token)
        full += token
      }

      if (!full || full.trim().length < 5) {
        full = "I couldn't detect any code context. Try providing more details."
      }

      this.session.addAssistantMessage(full)
      this.emit('suggested_answer', full, 'code_hint', this.llmRouter.getActiveProvider())
      this.setMode('idle')
      return full

    } catch (error) {
      this.emit('error', error, 'code_hint')
      this.setMode('idle')
      return null
    }
  }

  async runBrainstorm(problemStatement?: string): Promise<string | null> {
    this.setMode('brainstorm')
    const generationId = ++this.currentGenerationId
    const startTime = Date.now()

    try {
      let context = this.session.getFormattedContext(180)
      const resolvedProblem = problemStatement?.trim() ||
        this.session.getDetectedCodingQuestion().question?.trim()

      if (!context.trim() && !resolvedProblem) {
        this.setMode('idle')
        const msg = "Nothing to brainstorm. Make sure your question is visible or spoken aloud."
        this.emit('suggested_answer', msg, 'brainstorm', null)
        return msg
      }

      if (resolvedProblem) {
        context = `<problem_statement>\n${resolvedProblem}\n</problem_statement>\n\n${context}`
      }

      let full = ''
      let firstTokenEmitted = false
      const stream = this.brainstormMode.generateStream(context)
      for await (const token of stream) {
        if (this.currentGenerationId !== generationId) break
        if (!firstTokenEmitted) {
          this.emit('first_token_latency', Date.now() - startTime)
          firstTokenEmitted = true
        }
        this.emit('suggested_answer_token', token)
        full += token
      }

      if (full) {
        this.session.addAssistantMessage(full)
        this.emit('suggested_answer', full, 'brainstorm', this.llmRouter.getActiveProvider())
      }
      this.setMode('idle')
      return full

    } catch (error) {
      this.emit('error', error, 'brainstorm')
      this.setMode('idle')
      return null
    }
  }

  async runFollowUp(intent: string, userRequest?: string): Promise<string | null> {
    const lastMsg = this.session.getLastAssistantMessage()
    if (!lastMsg) return null

    this.setMode('follow_up')
    const generationId = ++this.currentGenerationId
    const startTime = Date.now()

    try {
      const context = this.session.getFormattedContext(60)
      let full = ''
      let firstTokenEmitted = false
      const stream = this.followUpMode.generateStream(lastMsg, userRequest || intent, context)
      for await (const token of stream) {
        if (this.currentGenerationId !== generationId) break
        if (!firstTokenEmitted) {
          this.emit('first_token_latency', Date.now() - startTime)
          firstTokenEmitted = true
        }
        this.emit('suggested_answer_token', token)
        full += token
      }

      if (full) {
        this.session.addAssistantMessage(full)
        this.emit('suggested_answer', full, 'follow_up', this.llmRouter.getActiveProvider())
      }
      this.setMode('idle')
      return full

    } catch (error) {
      this.emit('error', error, 'follow_up')
      this.setMode('idle')
      return null
    }
  }

  async runRecap(): Promise<string | null> {
    this.setMode('recap')
    const generationId = ++this.currentGenerationId
    const startTime = Date.now()

    try {
      const context = this.session.getFormattedContext(300)
      if (!context) {
        this.setMode('idle')
        return null
      }

      let full = ''
      let firstTokenEmitted = false
      const stream = this.recapMode.generateStream(context)
      for await (const token of stream) {
        if (this.currentGenerationId !== generationId) break
        if (!firstTokenEmitted) {
          this.emit('first_token_latency', Date.now() - startTime)
          firstTokenEmitted = true
        }
        this.emit('suggested_answer_token', token)
        full += token
      }

      if (full) {
        this.emit('suggested_answer', full, 'recap', this.llmRouter.getActiveProvider())
      }
      this.setMode('idle')
      return full

    } catch (error) {
      this.emit('error', error, 'recap')
      this.setMode('idle')
      return null
    }
  }

  async runFollowUpQuestions(): Promise<string | null> {
    this.setMode('follow_up_questions')
    const generationId = ++this.currentGenerationId
    const startTime = Date.now()

    try {
      const context = this.session.getFormattedContext(120)
      if (!context) {
        this.setMode('idle')
        return null
      }

      let full = ''
      let firstTokenEmitted = false
      const stream = this.followUpQuestionsMode.generateStream(context)
      for await (const token of stream) {
        if (this.currentGenerationId !== generationId) break
        if (!firstTokenEmitted) {
          this.emit('first_token_latency', Date.now() - startTime)
          firstTokenEmitted = true
        }
        this.emit('suggested_answer_token', token)
        full += token
      }

      if (full) {
        this.emit('suggested_answer', full, 'follow_up_questions', this.llmRouter.getActiveProvider())
      }
      this.setMode('idle')
      return full

    } catch (error) {
      this.emit('error', error, 'follow_up_questions')
      this.setMode('idle')
      return null
    }
  }

  private setMode(mode: IntelligenceMode): void {
    if (this.activeMode !== mode) {
      this.activeMode = mode
      this.emit('mode_changed', mode)
    }
  }

  getActiveMode(): IntelligenceMode { return this.activeMode }

  reset(): void {
    this.activeMode = 'idle'
    this.currentGenerationId++
    console.log('[IntelligenceEngine] Reset (generation aborted)')
  }
}
