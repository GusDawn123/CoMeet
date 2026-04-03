import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { createServer } from 'http'
import { config } from './config'
import { authRouter } from './routes/auth'
import { apiKeysRouter } from './routes/apiKeys'
import { meetingsRouter } from './routes/meetings'
import { settingsRouter } from './routes/settings'
import { adminRouter } from './routes/admin'
import { authenticate } from './middleware/auth'
import { apiRateLimit } from './middleware/rateLimit'
import { errorHandler } from './middleware/errorHandler'
import { setupWebSocket } from './ws/index'

const app = express()

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5174',
  credentials: true
}))
app.use(express.json({ limit: '10mb' }))
app.use(cookieParser())
app.use(apiRateLimit)

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.use('/api/auth', authRouter)
app.use('/api/api-keys', apiKeysRouter)
app.use('/api/meetings', meetingsRouter)
app.use('/api/settings', settingsRouter)
app.use('/api/admin', adminRouter)

app.get('/api/auth/me', authenticate, authRouter)

app.use(errorHandler)

const server = createServer(app)
setupWebSocket(server)

server.listen(config.port, () => {
  console.log(`\n  CoMeet API Server`)
  console.log(`  ─────────────────────────────`)
  console.log(`  REST:      http://localhost:${config.port}/api`)
  console.log(`  WebSocket: ws://localhost:${config.port}/ws`)
  console.log(`  Health:    http://localhost:${config.port}/api/health\n`)
})
