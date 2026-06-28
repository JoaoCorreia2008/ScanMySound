export const EMOTIONS = ['happy', 'sad', 'angry', 'neutral', 'surprised', 'fearful']

export const FACE_API_EMOTIONS = ['angry', 'disgusted', 'fearful', 'happy', 'neutral', 'sad', 'surprised']

export const EMOTION_META = {
  happy: {
    label: 'Happy',
    accent: '#6ef3c5',
    query: 'upbeat pop dance feel good',
  },
  sad: {
    label: 'Sad',
    accent: '#81b7ff',
    query: 'calm chill acoustic mellow',
  },
  angry: {
    label: 'Angry',
    accent: '#ff8970',
    query: 'relaxing instrumental ambient',
  },
  neutral: {
    label: 'Neutral',
    accent: '#d7dcf5',
    query: 'focus study lo-fi instrumental',
  },
  surprised: {
    label: 'Surprised',
    accent: '#f6d065',
    query: 'energetic playlists upbeat discovery',
  },
  fearful: {
    label: 'Fearful',
    accent: '#a88dff',
    query: 'calming ambient meditation sleep',
  },
}

export function normalizeEmotion(emotion = 'neutral') {
  const normalized = String(emotion).trim().toLowerCase()
  if (normalized === 'disgusted') {
    return 'angry'
  }

  return EMOTIONS.includes(normalized) ? normalized : 'neutral'
}

export function pickPrimaryEmotion(expressions = {}) {
  let bestEmotion = 'neutral'
  let bestConfidence = 0

  for (const label of FACE_API_EMOTIONS) {
    const mapped = normalizeEmotion(label)
    const score = Number(expressions[label] || 0)

    if (score > bestConfidence) {
      bestEmotion = mapped
      bestConfidence = score
    }
  }

  return {
    emotion: bestEmotion,
    confidence: bestConfidence,
  }
}

export function formatConfidence(value) {
  const safeValue = Math.min(1, Math.max(0, Number(value) || 0))
  return `${Math.round(safeValue * 100)}%`
}

export function emotionToQuery(emotion) {
  return EMOTION_META[normalizeEmotion(emotion)]?.query || EMOTION_META.neutral.query
}

export function emotionSummary(history = []) {
  return EMOTIONS.map((emotion) => ({
    emotion,
    label: EMOTION_META[emotion].label,
    count: history.filter((entry) => normalizeEmotion(entry.emotion) === emotion).length,
  }))
}