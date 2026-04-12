import WebSocket from 'ws'

type TranscriptCallback = (text: string, isFinal: boolean, speaker: number) => void

const DEEPGRAM_WS_URL = 'wss://api.deepgram.com/v1/listen'

export class DeepgramService {
  private ws: WebSocket | null = null
  private apiKey: string
  private onTranscript: TranscriptCallback

  constructor(apiKey: string, onTranscript: TranscriptCallback) {
    this.apiKey = apiKey
    this.onTranscript = onTranscript
  }

  async connect(): Promise<void> {
    const params = new URLSearchParams({
      model: 'nova-3',
      smart_format: 'true',
      interim_results: 'true',
      utterance_end_ms: '1500',
      vad_events: 'true',
      diarize: 'true'
    })

    const url = `${DEEPGRAM_WS_URL}?${params.toString()}`

    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Deepgram connection timeout')), 10_000)

      this.ws = new WebSocket(url, {
        headers: { Authorization: `Token ${this.apiKey}` }
      })

      this.ws.on('open', () => {
        clearTimeout(timeout)
        console.log('[Deepgram] Connected (diarize=true)')
        resolve()
      })

      this.ws.on('message', (data: WebSocket.Data) => {
        try {
          const result = JSON.parse(data.toString())
          if (result.type !== 'Results') return

          const alt = result.channel?.alternatives?.[0]
          const text = alt?.transcript?.trim()
          if (!text) return

          const words = alt?.words || []
          const speakerId = words.length > 0 ? (words[0].speaker ?? 0) : 0

          this.onTranscript(text, result.is_final, speakerId)
        } catch (err) {
          console.error('[Deepgram] Parse error:', (err as Error).message)
        }
      })

      this.ws.on('error', (err: Error) => {
        clearTimeout(timeout)
        console.error('[Deepgram] Error:', err.message)
        reject(err)
      })

      this.ws.on('close', () => {
        console.log('[Deepgram] Disconnected')
        this.ws = null
      })
    })
  }

  sendAudio(buffer: Buffer): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(buffer)
    }
  }

  isReady(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }

  close(): void {
    if (this.ws) {
      try {
        this.ws.send(JSON.stringify({ type: 'CloseStream' }))
        this.ws.close()
      } catch { /* ignore */ }
      this.ws = null
    }
  }
}
