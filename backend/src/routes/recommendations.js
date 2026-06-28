const express = require('express')
const prisma = require('../lib/prisma')
const { fetchPlaylistsByEmotion } = require('../lib/spotify')
const { normalizeEmotion, getRecommendationQuery } = require('../services/recommendationService')
const { requireSession } = require('../middleware/auth')

const router = express.Router()

router.get('/history', requireSession, async (req, res, next) => {
  try {
    const recommendations = await prisma.playlistRecommendation.findMany({
      where: { sessionId: req.sessionId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    return res.json({ recommendations })
  } catch (error) {
    return next(error)
  }
})

router.get('/:emotion', requireSession, async (req, res, next) => {
  try {
    const emotion = normalizeEmotion(req.params.emotion)
    const playlists = (await fetchPlaylistsByEmotion(emotion, null)).filter((p) => p && p.id)

    if (playlists.length) {
      try {
        await prisma.playlistRecommendation.createMany({
          data: playlists.map((playlist) => ({
            sessionId: req.sessionId,
            emotion: emotion.toUpperCase(),
            query: getRecommendationQuery(emotion),
            spotifyPlaylistId: playlist.id,
            playlistName: playlist.name || 'Untitled',
            playlistUrl: playlist.url || null,
            imageUrl: playlist.image || null,
            metadata: {
              owner: playlist.owner || null,
              trackCount: playlist.trackCount || 0,
            },
          })),
          skipDuplicates: true,
        })
      } catch (dbError) {
        console.warn('Não foi possível guardar recomendações:', dbError.message)
      }
    }

    return res.json({
      emotion,
      query: getRecommendationQuery(emotion),
      playlists,
    })
  } catch (error) {
    return next(error)
  }
})

module.exports = router
