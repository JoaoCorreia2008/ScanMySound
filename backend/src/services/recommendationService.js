const EMOTION_PROFILES = {
  happy: {
    query: 'upbeat pop dance feel good',
    description: 'uplifting, bright, and celebratory',
    genres: ['pop', 'dance pop', 'happy'],
  },
  sad: {
    query: 'calm chill acoustic mellow',
    description: 'soft, reflective, and comforting',
    genres: ['acoustic', 'chill', 'sad'],
  },
  angry: {
    query: 'relaxing instrumental ambient',
    description: 'grounding and release-oriented',
    genres: ['instrumental', 'ambient', 'study'],
  },
  neutral: {
    query: 'focus study lo-fi instrumental',
    description: 'steady, clear, and distraction-free',
    genres: ['lo-fi', 'study', 'instrumental'],
  },
  surprised: {
    query: 'energetic playlists upbeat discovery',
    description: 'sparkling, curious, and high-energy',
    genres: ['indie pop', 'energy', 'discovery'],
  },
  fearful: {
    query: 'calming ambient meditation sleep',
    description: 'soothing and low-stimulation',
    genres: ['ambient', 'sleep', 'meditation'],
  },
}

const SUPPORTED_EMOTIONS = Object.keys(EMOTION_PROFILES)

function normalizeEmotion(emotion = 'neutral') {
  return String(emotion).trim().toLowerCase()
}

function getRecommendationQuery(emotion) {
  const normalized = normalizeEmotion(emotion)
  return EMOTION_PROFILES[normalized]?.query || EMOTION_PROFILES.neutral.query
}

function getEmotionProfile(emotion) {
  const normalized = normalizeEmotion(emotion)
  return {
    emotion: SUPPORTED_EMOTIONS.includes(normalized) ? normalized : 'neutral',
    ...EMOTION_PROFILES[SUPPORTED_EMOTIONS.includes(normalized) ? normalized : 'neutral'],
  }
}

function formatConfidence(confidence) {
  const value = Number(confidence)

  if (Number.isNaN(value)) {
    return 0
  }

  return Math.min(1, Math.max(0, value))
}

module.exports = {
  EMOTION_PROFILES,
  SUPPORTED_EMOTIONS,
  normalizeEmotion,
  getRecommendationQuery,
  getEmotionProfile,
  formatConfidence,
}
