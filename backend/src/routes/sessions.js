const express = require('express')
const prisma = require('../lib/prisma')
const { requireSession } = require('../middleware/auth')

const router = express.Router()

router.post('/start', requireSession, async (req, res, next) => {
  try {
    const { device, userAgent } = req.body

    const session = await prisma.session.update({
      where: { id: req.sessionId },
      data: {
        device: device || req.headers['user-agent'] || 'browser',
        userAgent: userAgent || req.headers['user-agent'] || null,
        startedAt: new Date(),
        endedAt: null,
        status: 'ACTIVE',
      },
    })

    return res.json({ session })
  } catch (error) {
    return next(error)
  }
})

router.patch('/end', requireSession, async (req, res, next) => {
  try {
    const session = await prisma.session.update({
      where: { id: req.sessionId },
      data: {
        endedAt: new Date(),
        status: 'ENDED',
      },
    })

    return res.json({ session })
  } catch (error) {
    return next(error)
  }
})

router.get('/active', requireSession, async (req, res, next) => {
  try {
    const session = await prisma.session.findUnique({
      where: { id: req.sessionId },
    })

    return res.json({ session })
  } catch (error) {
    return next(error)
  }
})

router.get('/history', requireSession, async (req, res, next) => {
  try {
    const session = await prisma.session.findUnique({
      where: { id: req.sessionId },
      include: {
        emotions: { orderBy: { createdAt: 'desc' }, take: 50 },
      },
    })

    return res.json({ session })
  } catch (error) {
    return next(error)
  }
})

module.exports = router
