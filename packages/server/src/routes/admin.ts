import { Router, type Request, type Response, type NextFunction } from 'express'
import { prisma } from '../db'
import { authenticate } from '../middleware/auth'

const router = Router()

async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    res.status(401).json({ error: 'Not authenticated' })
    return
  }

  const user = await prisma.user.findUnique({ where: { id: req.user.userId } })

  if (!user?.isAdmin) {
    res.status(403).json({ error: 'Admin access required' })
    return
  }

  next()
}

router.use(authenticate, requireAdmin)

router.get('/users', async (_req, res) => {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      isAdmin: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { meetings: true, apiKeys: true } }
    },
    orderBy: { createdAt: 'desc' }
  })

  res.json({ users })
})

router.get('/users/:id', async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
    select: {
      id: true,
      email: true,
      name: true,
      isAdmin: true,
      createdAt: true,
      updatedAt: true,
      settings: {
        select: {
          language: true,
          theme: true
        }
      },
      meetings: {
        select: {
          id: true,
          title: true,
          status: true,
          startedAt: true,
          endedAt: true,
          _count: { select: { segments: true, aiResponses: true } }
        },
        orderBy: { startedAt: 'desc' },
        take: 20
      },
      _count: { select: { meetings: true, apiKeys: true } }
    }
  })

  if (!user) {
    res.status(404).json({ error: 'User not found' })
    return
  }

  res.json({ user })
})

router.get('/stats', async (_req, res) => {
  const [userCount, meetingCount, activeCount, segmentCount, aiCount] = await Promise.all([
    prisma.user.count(),
    prisma.meeting.count(),
    prisma.meeting.count({ where: { status: 'active' } }),
    prisma.transcriptSegment.count(),
    prisma.aIResponse.count()
  ])

  res.json({
    stats: {
      users: userCount,
      meetings: meetingCount,
      activeMeetings: activeCount,
      transcriptSegments: segmentCount,
      aiResponses: aiCount
    }
  })
})

router.get('/logs', async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 200)

  const [recentMeetings, recentResponses] = await Promise.all([
    prisma.meeting.findMany({
      select: {
        id: true,
        title: true,
        status: true,
        startedAt: true,
        endedAt: true,
        user: { select: { email: true, name: true } }
      },
      orderBy: { startedAt: 'desc' },
      take: limit
    }),
    prisma.aIResponse.findMany({
      select: {
        id: true,
        mode: true,
        intent: true,
        latencyMs: true,
        provider: true,
        createdAt: true,
        meeting: {
          select: { title: true, user: { select: { email: true } } }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    })
  ])

  res.json({ recentMeetings, recentResponses })
})

router.delete('/users/:id', async (req, res) => {
  const target = await prisma.user.findUnique({ where: { id: req.params.id } })

  if (!target) {
    res.status(404).json({ error: 'User not found' })
    return
  }

  if (target.isAdmin) {
    res.status(403).json({ error: 'Cannot delete admin users' })
    return
  }

  await prisma.user.delete({ where: { id: req.params.id } })
  res.json({ success: true })
})

export { router as adminRouter }
