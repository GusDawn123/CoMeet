import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import express from 'express'
import request from 'supertest'
import cookieParser from 'cookie-parser'
import { PrismaClient } from '@prisma/client'
import { authRouter } from '../routes/auth'
import { authenticate } from '../middleware/auth'

const prisma = new PrismaClient()
const app = express()
app.use(express.json())
app.use(cookieParser())
app.use('/api/auth', authRouter)
app.get('/api/auth/me', authenticate, (req, res) => {
  res.json({ user: req.user })
})

describe('Auth Routes', () => {
  beforeEach(async () => {
    await prisma.userSettings.deleteMany()
    await prisma.apiKey.deleteMany()
    await prisma.user.deleteMany()
  })

  afterAll(async () => {
    await prisma.userSettings.deleteMany()
    await prisma.apiKey.deleteMany()
    await prisma.user.deleteMany()
    await prisma.$disconnect()
  })

  describe('POST /api/auth/register', () => {
    it('creates a new user and returns tokens', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'test@example.com', name: 'Test User', password: 'password123' })

      expect(res.status).toBe(201)
      expect(res.body.user.email).toBe('test@example.com')
      expect(res.body.user.name).toBe('Test User')
      expect(res.body.tokens.accessToken).toBeDefined()
      expect(res.body.tokens.refreshToken).toBeDefined()
    })

    it('rejects duplicate email', async () => {
      await request(app)
        .post('/api/auth/register')
        .send({ email: 'dup@example.com', name: 'First', password: 'password123' })

      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'dup@example.com', name: 'Second', password: 'password123' })

      expect(res.status).toBe(409)
    })

    it('rejects short passwords', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'test@example.com', name: 'Test', password: '123' })

      expect(res.status).toBe(400)
    })

    it('rejects missing fields', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'test@example.com' })

      expect(res.status).toBe(400)
    })
  })

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      await request(app)
        .post('/api/auth/register')
        .send({ email: 'login@example.com', name: 'Login User', password: 'password123' })
    })

    it('logs in with correct credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'login@example.com', password: 'password123' })

      expect(res.status).toBe(200)
      expect(res.body.tokens.accessToken).toBeDefined()
    })

    it('rejects wrong password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'login@example.com', password: 'wrongpassword' })

      expect(res.status).toBe(401)
    })

    it('rejects non-existent email', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nouser@example.com', password: 'password123' })

      expect(res.status).toBe(401)
    })
  })

  describe('POST /api/auth/refresh', () => {
    it('returns new tokens with valid refresh token', async () => {
      const registerRes = await request(app)
        .post('/api/auth/register')
        .send({ email: 'refresh@example.com', name: 'Refresh', password: 'password123' })

      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: registerRes.body.tokens.refreshToken })

      expect(res.status).toBe(200)
      expect(res.body.tokens.accessToken).toBeDefined()
    })
  })

  describe('GET /api/auth/me', () => {
    it('returns user info with valid access token', async () => {
      const registerRes = await request(app)
        .post('/api/auth/register')
        .send({ email: 'me@example.com', name: 'Me User', password: 'password123' })

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${registerRes.body.tokens.accessToken}`)

      expect(res.status).toBe(200)
      expect(res.body.user.userId).toBeDefined()
    })

    it('rejects without token', async () => {
      const res = await request(app).get('/api/auth/me')
      expect(res.status).toBe(401)
    })
  })
})
