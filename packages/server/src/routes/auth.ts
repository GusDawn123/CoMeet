import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { prisma } from '../db'
import { config } from '../config'
import { authRateLimit } from '../middleware/rateLimit'
import type { JwtPayload } from '@comeet/shared'

const router = Router()

function generateTokens(userId: string, email: string) {
  const accessToken = jwt.sign(
    { userId, email, type: 'access' } satisfies JwtPayload,
    config.jwtSecret,
    { expiresIn: config.accessTokenExpiry }
  )
  const refreshToken = jwt.sign(
    { userId, email, type: 'refresh' } satisfies JwtPayload,
    config.jwtRefreshSecret,
    { expiresIn: config.refreshTokenExpiry }
  )
  return { accessToken, refreshToken }
}

router.post('/register', authRateLimit, async (req, res) => {
  try {
    const { email, name, password } = req.body

    if (!email || !name || !password) {
      res.status(400).json({ error: 'email, name, and password are required' })
      return
    }

    if (password.length < 8) {
      res.status(400).json({ error: 'Password must be at least 8 characters' })
      return
    }

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      res.status(409).json({ error: 'Email already registered' })
      return
    }

    const passwordHash = await bcrypt.hash(password, config.bcryptRounds)
    const user = await prisma.user.create({
      data: { email, name, passwordHash }
    })

    await prisma.userSettings.create({
      data: { userId: user.id }
    })

    const tokens = generateTokens(user.id, user.email)

    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    })

    res.status(201).json({
      user: { id: user.id, email: user.email, name: user.name, isAdmin: user.isAdmin, createdAt: user.createdAt.toISOString(), updatedAt: user.updatedAt.toISOString() },
      tokens: { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken }
    })
  } catch (error) {
    console.error('[Auth] Register error:', error)
    res.status(500).json({ error: 'Registration failed' })
  }
})

router.post('/login', authRateLimit, async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      res.status(400).json({ error: 'email and password are required' })
      return
    }

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      res.status(401).json({ error: 'Invalid credentials' })
      return
    }

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) {
      res.status(401).json({ error: 'Invalid credentials' })
      return
    }

    const tokens = generateTokens(user.id, user.email)

    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    })

    res.json({
      user: { id: user.id, email: user.email, name: user.name, isAdmin: user.isAdmin, createdAt: user.createdAt.toISOString(), updatedAt: user.updatedAt.toISOString() },
      tokens: { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken }
    })
  } catch (error) {
    console.error('[Auth] Login error:', error)
    res.status(500).json({ error: 'Login failed' })
  }
})

router.post('/refresh', async (req, res) => {
  try {
    const token = req.cookies?.refreshToken || req.body?.refreshToken
    if (!token) {
      res.status(401).json({ error: 'No refresh token provided' })
      return
    }

    const payload = jwt.verify(token, config.jwtRefreshSecret) as JwtPayload
    if (payload.type !== 'refresh') {
      res.status(401).json({ error: 'Invalid token type' })
      return
    }

    const user = await prisma.user.findUnique({ where: { id: payload.userId } })
    if (!user) {
      res.status(401).json({ error: 'User not found' })
      return
    }

    const tokens = generateTokens(user.id, user.email)

    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    })

    res.json({ tokens: { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken } })
  } catch {
    res.status(401).json({ error: 'Invalid refresh token' })
  }
})

router.get('/me', async (req, res) => {
  if (!req.user) {
    res.status(401).json({ error: 'Not authenticated' })
    return
  }

  const user = await prisma.user.findUnique({ where: { id: req.user.userId } })
  if (!user) {
    res.status(404).json({ error: 'User not found' })
    return
  }

  res.json({
    user: { id: user.id, email: user.email, name: user.name, isAdmin: user.isAdmin, createdAt: user.createdAt.toISOString(), updatedAt: user.updatedAt.toISOString() }
  })
})

export { router as authRouter }
