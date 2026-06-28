import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import EmotionScanner from '../components/EmotionScanner'
import PlaylistCard from '../components/PlaylistCard'
import ThemeToggle from '../components/ThemeToggle'
import AppIcon from '../components/AppIcon'
import api from '../api/client'
import { formatConfidence, EMOTION_META, normalizeEmotion } from '../utils/emotions'
import toast from 'react-hot-toast'

export default function ScannerPage() {
  const navigate = useNavigate()
  const [currentEmotion, setCurrentEmotion] = useState('neutral')
  const [confidence, setConfidence] = useState(0)
  const [playlists, setPlaylists] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [hasScanned, setHasScanned] = useState(false)

  const fetchRecommendations = useCallback(async (emotion) => {
    const normalized = normalizeEmotion(emotion)
    setIsLoading(true)

    try {
      const response = await api.get(`/recommendations/${normalized}`)
      setPlaylists(response.data.playlists || [])
    } catch {
      toast.error('Não foi possível obter playlists.')
      setPlaylists([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (hasScanned && currentEmotion) {
      queueMicrotask(() => fetchRecommendations(currentEmotion))
    }
  }, [currentEmotion, hasScanned, fetchRecommendations])

  const handleScan = useCallback(({ emotion, confidence: nextConfidence }) => {
    setCurrentEmotion(emotion)
    setConfidence(nextConfidence)
    setHasScanned(true)
  }, [])

  const meta = EMOTION_META[currentEmotion] || EMOTION_META.neutral

  return (
    <div className="scanner-page">
      <header className="scanner-page-header">
        <button
          type="button"
          className="scanner-back"
          onClick={() => navigate('/')}
          aria-label="Voltar"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <AppIcon className="scanner-page-icon" />
        <ThemeToggle />
      </header>

      <main className="scanner-page-main">
        <EmotionScanner onScan={handleScan} />

        <AnimatePresence>
          {hasScanned ? (
            <motion.section
              key="playlists"
              className="scanner-playlists glass-panel"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }}
              transition={{ duration: 0.3 }}
            >
              <div className="panel-heading">
                <div>
                  <p className="micro-label">Playlists para ti</p>
                  <h3>{meta.label} agora</h3>
                </div>
                {isLoading ? (
                  <span className="status-pill">A procurar…</span>
                ) : (
                  <span className="status-pill" style={{ color: meta.accent, borderColor: meta.accent }}>
                    {formatConfidence(confidence)}
                  </span>
                )}
              </div>

              <p className="muted-text" style={{ margin: 0 }}>
                {meta.description}
              </p>

              {isLoading ? (
                <div className="playlist-empty">
                  <p>A procurar playlists para o teu mood…</p>
                </div>
              ) : playlists.length ? (
                <div className="playlist-stack">
                  {playlists.map((playlist) => (
                    <PlaylistCard
                      key={playlist.id}
                      playlist={playlist}
                      onPlay={() => window.open(playlist.url, '_blank', 'noreferrer')}
                    />
                  ))}
                </div>
              ) : (
                <div className="playlist-empty">
                  <h4>Sem playlists</h4>
                  <p>
                    Não encontrámos playlists para esta emoção. Verifica as credenciais do
                    Spotify no <code>backend/.env</code>.
                  </p>
                </div>
              )}
            </motion.section>
          ) : null}
        </AnimatePresence>
      </main>
    </div>
  )
}
