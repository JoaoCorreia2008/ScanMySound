const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const rateLimit = require('express-rate-limit')
const config = require('./config')
const { requestLogger } = require('./lib/logger')
const { notFound, errorHandler } = require('./middleware/errorHandler')
const { ensureSession } = require('./middleware/auth')
const emotionRoutes = require('./routes/emotions')
const recommendationRoutes = require('./routes/recommendations')
const sessionRoutes = require('./routes/sessions')

const app = express()

const allowedOrigins = new Set([config.frontendUrl, 'http://localhost:5173'])

const apiLimiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  limit: config.rateLimitMax,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
})

app.set('trust proxy', 1)
app.use(helmet())
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin)) {
        return callback(null, true)
      }
      return callback(new Error('CORS origin not allowed'))
    },
    credentials: true,
  }),
)
app.use(express.json({ limit: '1mb' }))
app.use(requestLogger)
app.use('/api', apiLimiter)

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'scanmysound-api',
    timestamp: new Date().toISOString(),
    env: config.env,
  })
})

app.use(ensureSession)
app.use('/api/emotions', emotionRoutes)
app.use('/api/recommendations', recommendationRoutes)
app.use('/api/sessions', sessionRoutes)

app.use(notFound)
app.use(errorHandler)

module.exports = app
