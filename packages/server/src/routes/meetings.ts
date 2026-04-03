import { Router } from 'express'
import { prisma } from '../db'
import { authenticate } from '../middleware/auth'

const router = Router()
router.use(authenticate)

router.post('/', async (req, res) => {
  try {
    const { title } = req.body
    const meeting = await prisma.meeting.create({
      data: {
        userId: req.user!.userId,
        title: title || `Meeting ${new Date().toLocaleString()}`
      }
    })

    res.status(201).json({ meeting })
  } catch (error) {
    console.error('[Meetings] Create error:', error)
    res.status(500).json({ error: 'Failed to create meeting' })
  }
})

router.get('/', async (req, res) => {
  const meetings = await prisma.meeting.findMany({
    where: { userId: req.user!.userId },
    orderBy: { startedAt: 'desc' },
    include: {
      _count: {
        select: { segments: true, aiResponses: true }
      }
    }
  })

  res.json({ meetings })
})

router.get('/:id', async (req, res) => {
  const meeting = await prisma.meeting.findFirst({
    where: { id: req.params.id, userId: req.user!.userId },
    include: {
      segments: { orderBy: { timestamp: 'asc' } },
      aiResponses: { orderBy: { createdAt: 'asc' } }
    }
  })

  if (!meeting) {
    res.status(404).json({ error: 'Meeting not found' })
    return
  }

  res.json({ meeting })
})

router.patch('/:id', async (req, res) => {
  try {
    const { title, status, summary } = req.body

    const meeting = await prisma.meeting.findFirst({
      where: { id: req.params.id, userId: req.user!.userId }
    })

    if (!meeting) {
      res.status(404).json({ error: 'Meeting not found' })
      return
    }

    const data: any = {}
    if (title !== undefined) data.title = title
    if (status === 'ended') {
      data.status = 'ended'
      data.endedAt = new Date()
    }
    if (summary !== undefined) data.summary = summary

    const updated = await prisma.meeting.update({
      where: { id: meeting.id },
      data
    })

    res.json({ meeting: updated })
  } catch (error) {
    console.error('[Meetings] Update error:', error)
    res.status(500).json({ error: 'Failed to update meeting' })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    const meeting = await prisma.meeting.findFirst({
      where: { id: req.params.id, userId: req.user!.userId }
    })

    if (!meeting) {
      res.status(404).json({ error: 'Meeting not found' })
      return
    }

    await prisma.meeting.delete({ where: { id: meeting.id } })
    res.json({ message: 'Meeting deleted' })
  } catch (error) {
    console.error('[Meetings] Delete error:', error)
    res.status(500).json({ error: 'Failed to delete meeting' })
  }
})

export { router as meetingsRouter }
