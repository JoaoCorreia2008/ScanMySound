import { motion } from 'framer-motion'
import { EMOTION_META } from '../utils/emotions'

const ORDER = ['happy', 'sad', 'angry', 'neutral', 'surprised', 'fearful']

export default function EmotionConfidenceBars({ expressions = {} }) {
  const bars = ORDER.map((emotion) => ({
    emotion,
    label: EMOTION_META[emotion].label,
    value: Math.round((Number(expressions[emotion] || 0) * 100) || 0),
    accent: EMOTION_META[emotion].accent,
  }))

  return (
    <div className="confidence-bars">
      {bars.map((bar, index) => (
        <motion.div
          key={bar.emotion}
          className="confidence-row"
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.04 }}
        >
          <div className="confidence-labels">
            <span>{bar.label}</span>
            <strong>{bar.value}%</strong>
          </div>
          <div className="confidence-track">
            <motion.div
              className="confidence-fill"
              initial={{ width: 0 }}
              animate={{ width: `${bar.value}%`, background: bar.accent }}
              transition={{ duration: 0.45 }}
            />
          </div>
        </motion.div>
      ))}
    </div>
  )
}