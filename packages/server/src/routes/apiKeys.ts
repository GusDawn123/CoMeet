import { Router } from 'express'
import crypto from 'crypto'
import { prisma } from '../db'
import { config } from '../config'
import { authenticate } from '../middleware/auth'

const router = Router()
router.use(authenticate)

router.post('/', async (req, res) => {
  try {
    const { name, expiresInDays } = req.body

    if (!name) {
      res.status(400).json({ error: 'name is required' })
      return
    }

    const rawKey = crypto.randomBytes(32).toString('hex')
    const fullKey = `${config.apiKeyPrefix}${rawKey}`
    const keyHash = crypto.createHash('sha256').update(fullKey).digest('hex')
    const keyPrefix = fullKey.substring(0, 11)

    const expiresAt = expiresInDays
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
      : null

    const apiKey = await prisma.apiKey.create({
      data: {
        userId: req.user!.userId,
        name,
        keyHash,
        keyPrefix,
        expiresAt
      }
    })

    // Full key is only returned on creation; it cannot be retrieved later
    res.status(201).json({
      id: apiKey.id,
      name: apiKey.name,
      key: fullKey,
      keyPrefix,
      expiresAt: apiKey.expiresAt?.toISOString() || null,
      createdAt: apiKey.createdAt.toISOString()
    })
  } catch (error) {
    console.error('[ApiKeys] Create error:', error)
    res.status(500).json({ error: 'Failed to create API key' })
  }
})

router.get('/', async (req, res) => {
  const keys = await prisma.apiKey.findMany({
    where: { userId: req.user!.userId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      lastUsedAt: true,
      expiresAt: true,
      createdAt: true,
      revokedAt: true
    }
  })

  res.json({ keys })
})

router.delete('/:id', async (req, res) => {
  try {
    const key = await prisma.apiKey.findFirst({
      where: { id: req.params.id, userId: req.user!.userId }
    })

    if (!key) {
      res.status(404).json({ error: 'API key not found' })
      return
    }

    await prisma.apiKey.update({
      where: { id: key.id },
      data: { revokedAt: new Date() }
    })

    res.json({ message: 'API key revoked' })
  } catch (error) {
    console.error('[ApiKeys] Delete error:', error)
    res.status(500).json({ error: 'Failed to revoke API key' })
  }
})

export { router as apiKeysRouter }
