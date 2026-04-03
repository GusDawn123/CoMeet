import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import express from 'express'
import request from 'supertest'
import cookieParser from 'cookie-parser'
import { PrismaClient } from '@prisma/client'
import { authRouter } from '../routes/auth'
import { apiKeysRouter } from '../routes/apiKeys'

const prisma = new PrismaClient()
const app = express()
app.use(express.json())
app.use(cookieParser())
app.use('/api/auth', authRouter)
app.use('/api/api-keys', apiKeysRouter)

let accessToken: string

describe('API Keys Routes', () => {
  beforeEach(async () => {
    await prisma.aIResponse.deleteMany()
    await prisma.transcriptSegment.deleteMany()
    await prisma.meeting.deleteMany()
    await prisma.apiKey.deleteMany()
    await prisma.userSettings.deleteMany()
    await prisma.user.deleteMany()

    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'keys@example.com', name: 'Keys User', password: 'password123' })
    accessToken = res.body.tokens.accessToken
  })

  afterAll(async () => {
    await prisma.apiKey.deleteMany()
    await prisma.userSettings.deleteMany()
    await prisma.user.deleteMany()
    await prisma.$disconnect()
  })

  describe('POST /api/api-keys', () => {
    it('creates a new API key', async () => {
      const res = await request(app)
        .post('/api/api-keys')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Test Key' })

      expect(res.status).toBe(201)
      expect(res.body.key).toMatch(/^cm_/)
      expect(res.body.keyPrefix).toMatch(/^cm_/)
      expect(res.body.name).toBe('Test Key')
    })

    it('creates key with expiration', async () => {
      const res = await request(app)
        .post('/api/api-keys')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Expiring Key', expiresInDays: 30 })

      expect(res.status).toBe(201)
      expect(res.body.expiresAt).toBeDefined()
    })

    it('rejects without name', async () => {
      const res = await request(app)
        .post('/api/api-keys')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({})

      expect(res.status).toBe(400)
    })

    it('rejects without auth', async () => {
      const res = await request(app)
        .post('/api/api-keys')
        .send({ name: 'No Auth' })

      expect(res.status).toBe(401)
    })
  })

  describe('GET /api/api-keys', () => {
    it('lists all API keys', async () => {
      await request(app)
        .post('/api/api-keys')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Key 1' })

      await request(app)
        .post('/api/api-keys')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Key 2' })

      const res = await request(app)
        .get('/api/api-keys')
        .set('Authorization', `Bearer ${accessToken}`)

      expect(res.status).toBe(200)
      expect(res.body.keys).toHaveLength(2)
      // Should not expose full key
      expect(res.body.keys[0].key).toBeUndefined()
    })
  })

  describe('DELETE /api/api-keys/:id', () => {
    it('revokes an API key', async () => {
      const createRes = await request(app)
        .post('/api/api-keys')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'To Revoke' })

      const res = await request(app)
        .delete(`/api/api-keys/${createRes.body.id}`)
        .set('Authorization', `Bearer ${accessToken}`)

      expect(res.status).toBe(200)

      // Verify it's revoked
      const listRes = await request(app)
        .get('/api/api-keys')
        .set('Authorization', `Bearer ${accessToken}`)

      expect(listRes.body.keys[0].revokedAt).toBeDefined()
    })
  })

  describe('API key authentication', () => {
    it('can authenticate with a generated API key', async () => {
      const createRes = await request(app)
        .post('/api/api-keys')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Auth Test Key' })

      const apiKey = createRes.body.key

      // Use the API key to list keys
      const res = await request(app)
        .get('/api/api-keys')
        .set('Authorization', `Bearer ${apiKey}`)

      expect(res.status).toBe(200)
    })
  })
})
