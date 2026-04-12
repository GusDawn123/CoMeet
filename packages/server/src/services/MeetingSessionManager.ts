import type { WebSocket } from 'ws'
import { IntelligenceEngine, LLMRouter, SessionTracker } from '@comeet/ai-engine'
import type { AIMode, ServerMessage } from '@comeet/shared'
import { DeepgramService } from './DeepgramService'
import { prisma } from '../db'

export class MeetingSessionManager {
  private engine: IntelligenceEngine
  private session: SessionTracker
  private llmRouter: LLMRouter
  private deepgram: DeepgramService | null = null
  private meetingId: string
  private userId: string
  private ws: WebSocket
  private audioBuffer: Buffer[] = []
  private deepgramReady = false

  constructor(
    ws: WebSocket,
    meetingId: string,
    userId: string,
    keys: { geminiKey?: string; openaiKey?: string; groqKey?: string; deepgramKey?: string },
    private language: string = 'Python'
  ) {
    this.ws = ws
    this.meetingId = meetingId
    this.userId = userId

    this.llmRouter = new LLMRouter({
      geminiKey: keys.geminiKey || undefined,
      openaiKey: keys.openaiKey || undefined,
      groqKey: keys.groqKey || undefined
    })

    this.session = new SessionTracker()
    this.engine = new IntelligenceEngine(this.llmRouter, this.session)

    this.engine.on('mode_changed', (mode: string) => {
      if (mode !== 'idle') this.send({ type: 'ai_start', mode: mode as AIMode })
    })

    this.engine.on('suggested_answer_token', (token: string) => {
      this.send({ type: 'ai_token', token })
    })

    this.engine.on('suggested_answer', (answer: string, intent: string, provider: string | null) => {
      this.send({ type: 'ai_done', mode: this.engine.getActiveMode() as AIMode, intent, latencyMs: 0 })
      prisma.aIResponse.create({
        data: { meetingId, mode: this.engine.getActiveMode(), intent, response: answer, provider, latencyMs: 0 }
      }).catch(err => console.error('[Session] DB save error:', err))
    })

    this.engine.on('first_token_latency', (ms: number) => {
      console.log(`[Session] First token: ${ms}ms`)
    })

    this.engine.on('error', (error: Error) => {
      this.send({ type: 'ai_error', message: error.message || 'AI generation failed' })
    })

    if (keys.deepgramKey) {
      this.deepgram = new DeepgramService(keys.deepgramKey, (text, isFinal, speakerId) => {
        const speaker = speakerId === 0 ? 'user' : 'interviewer'
        this.send({ type: 'transcript', speaker, text, timestamp: Date.now() })

        if (isFinal) {
          this.session.handleTranscript({
            role: speaker === 'user' ? 'user' : 'interviewer',
            text, timestamp: Date.now(), isFinal: true
          })
          prisma.transcriptSegment.create({
            data: { meetingId, speaker, text, isFinal: true }
          }).catch(err => console.error('[Session] DB save error:', err))
        }
      })
    }

    console.log(`[Session] Created: meeting=${meetingId}, deepgram=${!!keys.deepgramKey}, llm=${!!(keys.geminiKey || keys.openaiKey || keys.groqKey)}`)
  }

  async start(): Promise<void> {
    if (this.deepgram) {
      try {
        await this.deepgram.connect()
        this.deepgramReady = true
        console.log(`[Session] Deepgram ready, flushing ${this.audioBuffer.length} buffered chunks`)
        // Flush any audio that arrived while Deepgram was connecting
        for (const chunk of this.audioBuffer) {
          this.deepgram.sendAudio(chunk)
        }
        this.audioBuffer = []
      } catch (err) {
        console.error('[Session] Deepgram failed:', (err as Error).message)
        this.audioBuffer = []
        this.send({ type: 'error', message: `Deepgram connection failed: ${(err as Error).message}` })
      }
    }
  }

  handleAudioChunk(base64Data: string): void {
    if (!this.deepgram) return
    const buffer = Buffer.from(base64Data, 'base64')
    if (!this.deepgramReady) {
      // Buffer audio until Deepgram is connected
      this.audioBuffer.push(buffer)
      return
    }
    this.deepgram.sendAudio(buffer)
  }

  async triggerMode(mode: AIMode): Promise<void> {
    switch (mode) {
      case 'what_to_say': await this.engine.runWhatShouldISay(this.language); break
      case 'clarify': await this.engine.runClarify(); break
      case 'code_hint': await this.engine.runCodeHint(); break
      case 'brainstorm': await this.engine.runBrainstorm(); break
      case 'follow_up': await this.engine.runFollowUp('continue'); break
      case 'recap': await this.engine.runRecap(); break
      case 'follow_up_questions': await this.engine.runFollowUpQuestions(); break
    }
  }

  cancel(): void {
    this.engine.reset()
  }

  async endMeeting(): Promise<string | null> {
    let summary: string | null = null
    try { summary = await this.engine.runRecap() } catch { /* ignore */ }

    await prisma.meeting.update({
      where: { id: this.meetingId },
      data: { status: 'ended', endedAt: new Date(), summary }
    })

    this.send({ type: 'meeting_ended', summary })
    this.cleanup()
    return summary
  }

  cleanup(): void {
    this.deepgram?.close()
    this.engine.removeAllListeners()
    console.log(`[Session] Cleaned up: ${this.meetingId}`)
  }

  private send(message: ServerMessage): void {
    if (this.ws.readyState === 1) {
      this.ws.send(JSON.stringify(message))
    }
  }
}
