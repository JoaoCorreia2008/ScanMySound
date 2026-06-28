const express = require('express')
const prisma = require('../lib/prisma')
const { normalizeEmotion, SUPPORTED_EMOTIONS, formatConfidence } = require('../services/recommendationService')
const { requireSession } = require('../middleware/auth')

const router = express.Router()

router.post('/', requireSession, async (req, res, next) => {
  try {
    const { emotion, confidence = 0, source = 'webcam', metadata = {} } = req.body
    const normalized = normalizeEmotion(emotion)

    if (!SUPPORTED_EMOTIONS.includes(normalized)) {
      return res.status(400).json({ error: 'Unsupported emotion.' })
    }

    const created = await prisma.emotionHistory.create({
      data: {
        sessionId: req.sessionId,
        emotion: normalized.toUpperCase(),
        confidence: formatConfidence(confidence),
        source,
        metadata,
      },
    })

    return res.status(201).json(created)
  } catch (error) {
    return next(error)
  }
})

router.get('/history', requireSession, async (req, res, next) => {
  try {
    const limit = Number.parseInt(req.query.limit || '20', 10)

    const history = await prisma.emotionHistory.findMany({
      take: Number.isNaN(limit) ? 20 : Math.min(limit, 100),
      where: { sessionId: req.sessionId },
      orderBy: { createdAt: 'desc' },
    })

    const summary = history.reduce(
      (accumulator, entry) => {
        const key = entry.emotion.toLowerCase()
        accumulator.counts[key] = (accumulator.counts[key] || 0) + 1
        accumulator.averageConfidence += entry.confidence || 0
        return accumulator
      },
      { counts: {}, averageConfidence: 0 },
    )

    summary.averageConfidence = history.length
      ? Number((summary.averageConfidence / history.length).toFixed(2))
      : 0

    return res.json({ history, summary })
  } catch (error) {
    return next(error)
  }
})

router.get('/summary', requireSession, async (req, res, next) => {
  try {
    const since = new Date()
    since.setDate(since.getDate() - 30)

    const history = await prisma.emotionHistory.findMany({
      where: {
        sessionId: req.sessionId,
        createdAt: { gte: since },
      },
      orderBy: { createdAt: 'desc' },
    })

    const counts = history.reduce((accumulator, entry) => {
      const key = entry.emotion.toLowerCase()
      accumulator[key] = (accumulator[key] || 0) + 1
      return accumulator
    }, {})

    const averageConfidence = history.length
      ? Number((history.reduce((total, entry) => total + (entry.confidence || 0), 0) / history.length).toFixed(2))
      : 0

    return res.json({
      totalScans: history.length,
      averageConfidence,
      counts,
    })
  } catch (error) {
    return next(error)
  }
})

module.exports = router
