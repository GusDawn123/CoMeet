import { Router } from 'express'
import { prisma } from '../db'
import { authenticate } from '../middleware/auth'

const router = Router()
router.use(authenticate)

router.get('/', async (req, res) => {
  let settings = await prisma.userSettings.findUnique({
    where: { userId: req.user!.userId }
  })

  if (!settings) {
    settings = await prisma.userSettings.create({
      data: { userId: req.user!.userId }
    })
  }

  res.json({
    settings: {
      id: settings.id,
      hasGeminiKey: !!settings.geminiKey,
      hasOpenaiKey: !!settings.openaiKey,
      hasGroqKey: !!settings.groqKey,
      hasDeepgramKey: !!settings.deepgramKey,
      language: settings.language,
      theme: settings.theme
    }
  })
})

router.patch('/', async (req, res) => {
  try {
    const { geminiKey, openaiKey, groqKey, deepgramKey, language, theme } = req.body

    const data: any = {}
    if (geminiKey !== undefined) data.geminiKey = geminiKey || null
    if (openaiKey !== undefined) data.openaiKey = openaiKey || null
    if (groqKey !== undefined) data.groqKey = groqKey || null
    if (deepgramKey !== undefined) data.deepgramKey = deepgramKey || null
    if (language !== undefined) data.language = language
    if (theme !== undefined) data.theme = theme

    const settings = await prisma.userSettings.upsert({
      where: { userId: req.user!.userId },
      update: data,
      create: { userId: req.user!.userId, ...data }
    })

    res.json({
      settings: {
        id: settings.id,
        hasGeminiKey: !!settings.geminiKey,
        hasOpenaiKey: !!settings.openaiKey,
        hasGroqKey: !!settings.groqKey,
        hasDeepgramKey: !!settings.deepgramKey,
        language: settings.language,
        theme: settings.theme
      }
    })
  } catch (error) {
    console.error('[Settings] Update error:', error)
    res.status(500).json({ error: 'Failed to update settings' })
  }
})

export { router as settingsRouter }
