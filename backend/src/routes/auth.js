const express = require('express')
const jwt = require('jsonwebtoken')
const prisma = require('../lib/prisma')
const { buildSpotifyAuthorizeUrl, exchangeCodeForToken, fetchSpotifyProfile } = require('../lib/spotify')
const { jwtExpiresIn, jwtSecret, frontendUrl, spotifyConfigured } = require('../config')
const { requireAuth } = require('../middleware/auth')
const { ensureDemoUser, buildDemoAuthResponse } = require('../lib/demoAuth')

const router = express.Router()

router.get('/login', async (_req, res, next) => {
  try {
    if (!spotifyConfigured) {
      const user = await ensureDemoUser()
      const payload = buildDemoAuthResponse(user)

      if (frontendUrl) {
        const redirectParams = new URLSearchParams({
          token: payload.token,
          demo: '1',
          userId: user.id,
          displayName: user.displayName,
          spotifyId: user.spotifyId,
        })
        return res.redirect(`${frontendUrl}/?${redirectParams.toString()}`)
      }

      return res.json(payload)
    }

    return res.redirect(buildSpotifyAuthorizeUrl())
  } catch (error) {
    return next(error)
  }
})

router.post('/demo', async (_req, res, next) => {
  try {
    const user = await ensureDemoUser()
    return res.json(buildDemoAuthResponse(user))
  } catch (error) {
    return next(error)
  }
})

router.get('/callback', async (req, res, next) => {
  try {
    if (!spotifyConfigured) {
      return res.status(400).json({
        error: 'Spotify OAuth is not configured. Use /api/auth/login for demo mode.',
      })
    }

    const { code } = req.query

    if (!code) {
      return res.status(400).json({ error: 'Missing Spotify authorization code.' })
    }

    const { accessToken, refreshToken, expiresIn } = await exchangeCodeForToken(code)
    const profile = await fetchSpotifyProfile(accessToken)

    const user = await prisma.user.upsert({
      where: { spotifyId: profile.spotifyId },
      update: {
        email: profile.email,
        displayName: profile.displayName,
        avatarUrl: profile.imageUrl,
        spotifyAccessToken: accessToken,
        spotifyRefreshToken: refreshToken || null,
        tokenExpiresAt: new Date(Date.now() + expiresIn * 1000),
        lastLoginAt: new Date(),
      },
      create: {
        spotifyId: profile.spotifyId,
        email: profile.email,
        displayName: profile.displayName,
        avatarUrl: profile.imageUrl,
        spotifyAccessToken: accessToken,
        spotifyRefreshToken: refreshToken || null,
        tokenExpiresAt: new Date(Date.now() + expiresIn * 1000),
        lastLoginAt: new Date(),
        preferences: {
          theme: 'dark',
          autoplay: true,
          notificationLevel: 'high',
        },
      },
    })

    const appToken = jwt.sign(
      {
        sub: user.id,
        spotifyId: user.spotifyId,
      },
      jwtSecret,
      { expiresIn: jwtExpiresIn },
    )

    if (frontendUrl) {
      const redirectParams = new URLSearchParams({
        token: appToken,
        accessToken,
        refreshToken: refreshToken || '',
        expiresIn: String(expiresIn),
        userId: user.id,
        displayName: user.displayName,
        spotifyId: user.spotifyId,
      })

      return res.redirect(`${frontendUrl}/?${redirectParams.toString()}`)
    }

    return res.json({
      token: appToken,
      accessToken,
      refreshToken,
      expiresIn,
      user,
    })
  } catch (error) {
    return next(error)
  }
})

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        _count: {
          select: {
            emotions: true,
            recommendations: true,
            sessions: true,
          },
        },
      },
    })

    if (!user) {
      return res.status(404).json({ error: 'User not found.' })
    }

    return res.json({ user })
  } catch (error) {
    return next(error)
  }
})

router.post('/logout', requireAuth, async (req, res, next) => {
  try {
    await prisma.session.updateMany({
      where: {
        userId: req.user.id,
        endedAt: null,
      },
      data: {
        endedAt: new Date(),
      },
    })

    return res.status(204).send()
  } catch (error) {
    return next(error)
  }
})

module.exports = router
