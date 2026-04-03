import { GoogleGenerativeAI } from '@google/generative-ai'
import OpenAI from 'openai'
import { ASSIST_PROMPT } from './prompts/index'

const GEMINI_MODEL = 'gemini-2.5-flash'
const OPENAI_MODEL = 'gpt-4o'
const GROQ_MODEL = 'llama-3.3-70b-versatile'

export interface LLMRouterConfig {
  geminiKey?: string
  openaiKey?: string
  groqKey?: string
}

export class LLMRouter {
  private geminiClient: GoogleGenerativeAI | null = null
  private openaiClient: OpenAI | null = null
  private groqClient: any = null
  private activeProvider: string | null = null

  constructor(config: LLMRouterConfig) {
    if (config.geminiKey) this.setGeminiKey(config.geminiKey)
    if (config.openaiKey) this.setOpenaiKey(config.openaiKey)
    if (config.groqKey) this.setGroqKey(config.groqKey)
  }

  setGeminiKey(key: string): void {
    this.geminiClient = new GoogleGenerativeAI(key)
    console.log('[LLMRouter] Gemini client initialized')
  }

  setOpenaiKey(key: string): void {
    this.openaiClient = new OpenAI({ apiKey: key })
    console.log('[LLMRouter] OpenAI client initialized')
  }

  async setGroqKey(key: string): Promise<void> {
    try {
      const Groq = (await import('groq-sdk')).default
      this.groqClient = new Groq({ apiKey: key })
      console.log('[LLMRouter] Groq client initialized')
    } catch {
      console.warn('[LLMRouter] groq-sdk not available, Groq disabled')
    }
  }

  hasGemini(): boolean { return !!this.geminiClient }
  hasOpenai(): boolean { return !!this.openaiClient }
  hasGroq(): boolean { return !!this.groqClient }
  getActiveProvider(): string | null { return this.activeProvider }

  async *streamChat(
    message: string,
    imagePaths?: string[],
    context?: string,
    systemPromptOverride?: string
  ): AsyncGenerator<string, void, unknown> {
    const systemPrompt = systemPromptOverride || ASSIST_PROMPT
    const userContent = context
      ? `CONTEXT:\n${context}\n\nUSER QUESTION:\n${message}`
      : message

    if (this.geminiClient) {
      try {
        this.activeProvider = 'gemini'
        yield* this.streamWithGemini(userContent, systemPrompt)
        return
      } catch (e: any) {
        console.warn('[LLMRouter] Gemini streaming failed:', e.message)
      }
    }

    if (this.openaiClient) {
      try {
        this.activeProvider = 'openai'
        yield* this.streamWithOpenai(userContent, systemPrompt)
        return
      } catch (e: any) {
        console.warn('[LLMRouter] OpenAI streaming failed:', e.message)
      }
    }

    if (this.groqClient) {
      try {
        this.activeProvider = 'groq'
        yield* this.streamWithGroq(userContent, systemPrompt)
        return
      } catch (e: any) {
        console.warn('[LLMRouter] Groq streaming failed:', e.message)
      }
    }

    this.activeProvider = null
    throw new Error('No LLM provider available. Configure at least one API key.')
  }

  async chat(
    message: string,
    imagePaths?: string[],
    context?: string,
    systemPromptOverride?: string
  ): Promise<string> {
    let full = ''
    for await (const token of this.streamChat(message, imagePaths, context, systemPromptOverride)) {
      full += token
    }
    return full
  }

  private async *streamWithGemini(
    userContent: string,
    systemPrompt: string
  ): AsyncGenerator<string, void, unknown> {
    if (!this.geminiClient) throw new Error('Gemini client not initialized')

    const model = this.geminiClient.getGenerativeModel({
      model: GEMINI_MODEL,
      systemInstruction: systemPrompt
    })

    const parts: any[] = [{ text: userContent }]

    const result = await model.generateContentStream({
      contents: [{ role: 'user', parts }]
    })

    for await (const chunk of result.stream) {
      const text = chunk.text()
      if (text) yield text
    }
  }

  private async *streamWithOpenai(
    userContent: string,
    systemPrompt: string,
    modelOverride?: string
  ): AsyncGenerator<string, void, unknown> {
    if (!this.openaiClient) throw new Error('OpenAI client not initialized')

    const stream = await this.openaiClient.chat.completions.create({
      model: modelOverride || OPENAI_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent }
      ],
      stream: true,
      temperature: 0.25,
      max_tokens: 4096
    })

    for await (const chunk of stream) {
      const delta = chunk.choices?.[0]?.delta?.content
      if (delta) yield delta
    }
  }

  private async *streamWithGroq(
    userContent: string,
    systemPrompt: string
  ): AsyncGenerator<string, void, unknown> {
    if (!this.groqClient) throw new Error('Groq client not initialized')

    const stream = await this.groqClient.chat.completions.create({
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent }
      ],
      stream: true,
      temperature: 0.4,
      max_tokens: 8192
    })

    for await (const chunk of stream) {
      const delta = chunk.choices?.[0]?.delta?.content
      if (delta) yield delta
    }
  }
}
