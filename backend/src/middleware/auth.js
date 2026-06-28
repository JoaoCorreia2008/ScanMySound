const prisma = require('../lib/prisma')

function getSessionIdFromRequest(req) {
  const header = req.headers['x-session-id']
  if (typeof header === 'string' && header.trim()) {
    return header.trim()
  }
  if (req.query && req.query.sessionId) {
    return String(req.query.sessionId)
  }
  return null
}

async function ensureSession(req, _res, next) {
  const sessionId = getSessionIdFromRequest(req)

  if (!sessionId) {
    req.sessionId = null
    return next()
  }

  try {
    const session = await prisma.session.upsert({
      where: { id: sessionId },
      update: {},
      create: {
        id: sessionId,
        device: req.headers['user-agent'] || 'browser',
      },
    })
    req.sessionId = session.id
  } catch (_error) {
    req.sessionId = sessionId
  }

  return next()
}

function requireSession(req, res, next) {
  if (!req.sessionId) {
    return res.status(400).json({ error: 'X-Session-Id header is required.' })
  }
  return next()
}

module.exports = {
  ensureSession,
  requireSession,
  getSessionIdFromRequest,
}
