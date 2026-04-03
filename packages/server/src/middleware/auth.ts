import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { prisma } from '../db'
import { config } from '../config'
import type { JwtPayload } from '@comeet/shared'

declare global {
  namespace Express {
    interface Request {
      user?: { userId: string; email: string }
    }
  }
}

export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing authorization header' })
    return
  }

  const token = authHeader.slice(7)

  if (token.startsWith(config.apiKeyPrefix)) {
    const keyHash = crypto.createHash('sha256').update(token).digest('hex')
    const apiKey = await prisma.apiKey.findUnique({
      where: { keyHash },
      include: { user: true }
    })

    if (!apiKey || apiKey.revokedAt) {
      res.status(401).json({ error: 'Invalid or revoked API key' })
      return
    }

    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      res.status(401).json({ error: 'API key expired' })
      return
    }

    await prisma.apiKey.update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() }
    })

    req.user = { userId: apiKey.userId, email: apiKey.user.email }
    next()
    return
  }

  try {
    const payload = jwt.verify(token, config.jwtSecret) as JwtPayload
    if (payload.type !== 'access') {
      res.status(401).json({ error: 'Invalid token type' })
      return
    }
    req.user = { userId: payload.userId, email: payload.email }
    next()
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' })
  }
}
