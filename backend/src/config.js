require('dotenv').config()

const port = Number.parseInt(process.env.PORT || '3001', 10)

const config = {
  env: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  port,
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  backendUrl: process.env.BACKEND_URL || `http://localhost:${port}`,
  databaseUrl: process.env.DATABASE_URL || 'postgresql://user:pass@host:5432/dbname?sslmode=require',
  spotifyClientId: process.env.SPOTIFY_CLIENT_ID || '',
  spotifyClientSecret: process.env.SPOTIFY_CLIENT_SECRET || '',
  spotifyScopes: [
    'user-read-email',
    'user-read-private',
    'playlist-read-private',
    'playlist-modify-private',
    'playlist-modify-public',
    'user-read-playback-state',
    'user-modify-playback-state',
  ].join(' '),
  spotifyConfigured: Boolean(
    process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET,
  ),
  rateLimitWindowMs: Number.parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
  rateLimitMax: Number.parseInt(process.env.RATE_LIMIT_MAX || '180', 10),
}

module.exports = config
