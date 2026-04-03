import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import express from 'express'
import request from 'supertest'
import cookieParser from 'cookie-parser'
import { PrismaClient } from '@prisma/client'
import { authRouter } from '../routes/auth'
import { meetingsRouter } from '../routes/meetings'

const prisma = new PrismaClient()
const app = express()
app.use(express.json())
app.use(cookieParser())
app.use('/api/auth', authRouter)
app.use('/api/meetings', meetingsRouter)

let accessToken: string

describe('Meetings Routes', () => {
  beforeEach(async () => {
    await prisma.aIResponse.deleteMany()
    await prisma.transcriptSegment.deleteMany()
    await prisma.meeting.deleteMany()
    await prisma.apiKey.deleteMany()
    await prisma.userSettings.deleteMany()
    await prisma.user.deleteMany()

    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'meet@example.com', name: 'Meet User', password: 'password123' })
    accessToken = res.body.tokens.accessToken
  })

  afterAll(async () => {
    await prisma.aIResponse.deleteMany()
    await prisma.transcriptSegment.deleteMany()
    await prisma.meeting.deleteMany()
    await prisma.apiKey.deleteMany()
    await prisma.userSettings.deleteMany()
    await prisma.user.deleteMany()
    await prisma.$disconnect()
  })

  describe('POST /api/meetings', () => {
    it('creates a new meeting', async () => {
      const res = await request(app)
        .post('/api/meetings')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ title: 'Tech Interview' })

      expect(res.status).toBe(201)
      expect(res.body.meeting.title).toBe('Tech Interview')
      expect(res.body.meeting.status).toBe('active')
    })

    it('creates meeting with default title', async () => {
      const res = await request(app)
        .post('/api/meetings')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({})

      expect(res.status).toBe(201)
      expect(res.body.meeting.title).toContain('Meeting')
    })
  })

  describe('GET /api/meetings', () => {
    it('lists meetings', async () => {
      await request(app)
        .post('/api/meetings')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ title: 'Meeting 1' })

      await request(app)
        .post('/api/meetings')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ title: 'Meeting 2' })

      const res = await request(app)
        .get('/api/meetings')
        .set('Authorization', `Bearer ${accessToken}`)

      expect(res.status).toBe(200)
      expect(res.body.meetings).toHaveLength(2)
    })
  })

  describe('GET /api/meetings/:id', () => {
    it('returns meeting with details', async () => {
      const createRes = await request(app)
        .post('/api/meetings')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ title: 'Detail Meeting' })

      const res = await request(app)
        .get(`/api/meetings/${createRes.body.meeting.id}`)
        .set('Authorization', `Bearer ${accessToken}`)

      expect(res.status).toBe(200)
      expect(res.body.meeting.title).toBe('Detail Meeting')
      expect(res.body.meeting.segments).toBeDefined()
      expect(res.body.meeting.aiResponses).toBeDefined()
    })

    it('returns 404 for non-existent meeting', async () => {
      const res = await request(app)
        .get('/api/meetings/nonexistent')
        .set('Authorization', `Bearer ${accessToken}`)

      expect(res.status).toBe(404)
    })
  })

  describe('PATCH /api/meetings/:id', () => {
    it('updates meeting title', async () => {
      const createRes = await request(app)
        .post('/api/meetings')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ title: 'Original' })

      const res = await request(app)
        .patch(`/api/meetings/${createRes.body.meeting.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ title: 'Updated' })

      expect(res.status).toBe(200)
      expect(res.body.meeting.title).toBe('Updated')
    })

    it('ends a meeting', async () => {
      const createRes = await request(app)
        .post('/api/meetings')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ title: 'To End' })

      const res = await request(app)
        .patch(`/api/meetings/${createRes.body.meeting.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ status: 'ended' })

      expect(res.status).toBe(200)
      expect(res.body.meeting.status).toBe('ended')
      expect(res.body.meeting.endedAt).toBeDefined()
    })
  })

  describe('DELETE /api/meetings/:id', () => {
    it('deletes a meeting', async () => {
      const createRes = await request(app)
        .post('/api/meetings')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ title: 'To Delete' })

      const res = await request(app)
        .delete(`/api/meetings/${createRes.body.meeting.id}`)
        .set('Authorization', `Bearer ${accessToken}`)

      expect(res.status).toBe(200)

      // Verify deleted
      const getRes = await request(app)
        .get(`/api/meetings/${createRes.body.meeting.id}`)
        .set('Authorization', `Bearer ${accessToken}`)

      expect(getRes.status).toBe(404)
    })
  })
})
