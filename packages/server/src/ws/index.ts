import type { Server } from 'http'
import { WebSocketServer, WebSocket } from 'ws'
import jwt from 'jsonwebtoken'
import { config } from '../config'
import { prisma } from '../db'
import { MeetingSessionManager } from '../services/MeetingSessionManager'
import type { ClientMessage, JwtPayload } from '@comeet/shared'
import type { IncomingMessage } from 'http'

const activeSessions = new Map<string, MeetingSessionManager>()

export function setupWebSocket(server: Server): void {
  const wss = new WebSocketServer({ server, path: '/ws' })

  wss.on('connection', async (ws: WebSocket, req: IncomingMessage) => {
    const url = new URL(req.url || '', `http://${req.headers.host}`)
    const token = url.searchParams.get('token')
    const meetingId = url.searchParams.get('meetingId')

    if (!token || !meetingId) {
      ws.close(4001, 'Missing token or meetingId')
      return
    }

    let userId: string
    try {
      const payload = jwt.verify(token, config.jwtSecret) as JwtPayload
      if (payload.type !== 'access') throw new Error('Invalid token type')
      userId = payload.userId
    } catch {
      ws.close(4001, 'Invalid token')
      return
    }

    const meeting = await prisma.meeting.findFirst({
      where: { id: meetingId, userId }
    })

    if (!meeting) {
      ws.close(4004, 'Meeting not found')
      return
    }

    const settings = await prisma.userSettings.findUnique({
      where: { userId }
    })

    const keys = {
      geminiKey: settings?.geminiKey || undefined,
      openaiKey: settings?.openaiKey || undefined,
      groqKey: settings?.groqKey || undefined,
      deepgramKey: settings?.deepgramKey || undefined
    }

    if (!keys.geminiKey && !keys.openaiKey && !keys.groqKey) {
      ws.send(JSON.stringify({ type: 'error', message: 'No LLM API keys configured. Add keys in Settings to enable AI responses.' }))
    }

    if (!keys.deepgramKey) {
      ws.send(JSON.stringify({ type: 'error', message: 'No Deepgram API key configured. Add one in Settings to enable live transcription.' }))
    }

    const session = new MeetingSessionManager(
      ws, meetingId, userId, keys, settings?.language || 'Python'
    )

    activeSessions.set(meetingId, session)
    await session.start()

    console.log(`[WS] Client connected to meeting ${meetingId}`)

    ws.on('message', async (data: Buffer) => {
      try {
        const message: ClientMessage = JSON.parse(data.toString())

        switch (message.type) {
          case 'audio_chunk':
            session.handleAudioChunk(message.data)
            break
          case 'trigger_mode':
            await session.triggerMode(message.mode)
            break
          case 'cancel':
            session.cancel()
            break
          case 'end_meeting':
            await session.endMeeting()
            break
        }
      } catch (err) {
        console.error('[WS] Message handling error:', err)
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }))
      }
    })

    ws.on('close', () => {
      session.cleanup()
      activeSessions.delete(meetingId)
      console.log(`[WS] Client disconnected from meeting ${meetingId}`)
    })

    ws.on('error', (err) => {
      console.error(`[WS] Error on meeting ${meetingId}:`, err.message)
      session.cleanup()
      activeSessions.delete(meetingId)
    })
  })

  console.log('[WS] WebSocket server initialized')
}
