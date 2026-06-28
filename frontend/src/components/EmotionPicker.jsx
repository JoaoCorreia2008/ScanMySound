import { motion } from 'framer-motion'
import { EMOTION_META, EMOTIONS } from '../utils/emotions'

export default function EmotionPicker({ selected, onSelect }) {
  return (
    <section className="emotion-picker glass-panel">
      <div className="panel-heading">
        <div>
          <p className="micro-label">Modo manual</p>
          <h3>Escolhe a tua emoção</h3>
        </div>
      </div>
      <p className="muted-text">
        Sem webcam ou sem modelos do face-api.js? Escolhe a emoção manualmente para obter
        recomendações do Spotify em tempo real.
      </p>
      <div className="emotion-picker-grid">
        {EMOTIONS.map((emotion) => {
          const meta = EMOTION_META[emotion]
          const isActive = selected === emotion
          return (
            <motion.button
              key={emotion}
              type="button"
              className={`emotion-chip ${isActive ? 'active' : ''}`}
              style={{ '--accent': meta.accent }}
              onClick={() => onSelect(emotion)}
              whileTap={{ scale: 0.96 }}
            >
              <span className="emotion-dot" />
              <span>{meta.label}</span>
            </motion.button>
          )
        })}
      </div>
    </section>
  )
}
