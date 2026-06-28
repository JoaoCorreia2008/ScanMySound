const axios = require('axios')
const { spotifyClientId, spotifyClientSecret } = require('../config')
const { getRecommendationQuery, getEmotionProfile } = require('../services/recommendationService')

let cachedToken = null
let cachedTokenExpiresAt = 0

async function getClientCredentialsToken() {
  if (!spotifyClientId || !spotifyClientSecret) {
    return null
  }

  if (cachedToken && Date.now() < cachedTokenExpiresAt - 60_000) {
    return cachedToken
  }

  const credentials = Buffer.from(`${spotifyClientId}:${spotifyClientSecret}`).toString('base64')

  const response = await axios.post(
    'https://accounts.spotify.com/api/token',
    new URLSearchParams({ grant_type: 'client_credentials' }).toString(),
    {
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    },
  )

  cachedToken = response.data.access_token
  cachedTokenExpiresAt = Date.now() + (response.data.expires_in || 3600) * 1000
  return cachedToken
}

async function fetchPlaylistsByEmotion(emotion) {
  const token = await getClientCredentialsToken()
  if (!token) {
    return []
  }

  const profile = getEmotionProfile(emotion)
  const query = getRecommendationQuery(profile.emotion)

  let response
  try {
    response = await axios.get('https://api.spotify.com/v1/search', {
      headers: { Authorization: 'Bearer ' + token },
      params: { q: query, type: 'playlist', limit: 10 },
    })
  } catch (error) {
    const status = error?.response?.status
    const data = error?.response?.data
    console.warn('Spotify search failed:', status, data ? JSON.stringify(data) : error.message)
    return []
  }

  const items = response?.data?.playlists?.items || []
  return items
    .filter((playlist) => playlist && playlist.id && playlist.name)
    .map((playlist) => ({
      id: playlist.id,
      name: playlist.name,
      url: playlist.external_urls?.spotify || null,
      image: playlist.images?.[0]?.url || null,
      uri: playlist.uri || null,
      owner: playlist.owner?.display_name || playlist.owner?.id || null,
      description: playlist.description || profile.description,
      trackCount: playlist.tracks?.total || 0,
    }))
}

module.exports = {
  fetchPlaylistsByEmotion,
  getClientCredentialsToken,
}
