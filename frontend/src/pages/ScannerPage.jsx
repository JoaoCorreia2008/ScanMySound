import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import EmotionScanner from '../components/EmotionScanner'
import PlaylistCard from '../components/PlaylistCard'
import ThemeToggle from '../components/ThemeToggle'
import AppIcon from '../components/AppIcon'
import api from '../api/client'
import { formatConfidence, EMOTION_META, normalizeEmotion } from '../utils/emotions'
import toast from 'react-hot-toast'

const SCAN_CONFIDENCE_THRESHOLD = 0.5

export default function ScannerPage() {
  const navigate = useNavigate()
  const [currentEmotion, setCurrentEmotion] = useState('neutral')
  const [confidence, setConfidence] = useState(0)
  const [playlists, setPlaylists] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [scanState, setScanState] = useState('idle')
  const sessionStartedRef = useRef(false)

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

  const handleScan = useCallback(({ emotion, confidence: nextConfidence }) => {
    if (nextConfidence < SCAN_CONFIDENCE_THRESHOLD) return false
    setCurrentEmotion(emotion)
    setConfidence(nextConfidence)
    setScanState('complete')
    fetchRecommendations(emotion)
    return true
  }, [fetchRecommendations])

  const handleScanStart = useCallback(async () => {
    setScanState('scanning')
    setPlaylists([])
    setCurrentEmotion('neutral')
    setConfidence(0)
    try {
      if (!sessionStartedRef.current) {
        await api.post('/sessions/start', {
          device: navigator.userAgent,
          userAgent: navigator.userAgent,
        })
        sessionStartedRef.current = true
      }
    } catch {
      // ignore
    }
  }, [])

  const handleScanAgain = useCallback(() => {
    setScanState('idle')
    setPlaylists([])
    setCurrentEmotion('neutral')
    setConfidence(0)
  }, [])

  useEffect(() => {
    return () => {
      if (sessionStartedRef.current) {
        api.patch('/sessions/end').catch(() => null)
      }
    }
  }, [])

  const handleManualSelect = useCallback(async (emotion) => {
    setCurrentEmotion(emotion)
    setConfidence(0.85)
    setScanState('complete')
    setPlaylists([])

    const payload = { emotion, confidence: 0.85, source: 'manual' }
    try {
      await api.post('/emotions', payload)
    } catch {
      // ignore
    }
    fetchRecommendations(emotion)
  }, [fetchRecommendations])

  const meta = EMOTION_META[currentEmotion] || EMOTION_META.neutral
  const showScanner = scanState === 'scanning'
  const showResults = scanState === 'complete'

  return (
    <div className="scanner-page">
      <header className="scanner-page-header">
        <button
          type="button"
          className="scanner-back"
          onClick={() => navigate('/scan')}
          aria-label="Voltar"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="scanner-header-spacer" />
        <ThemeToggle />
      </header>

      <main className="scanner-page-main">
        {showResults ? (
          <motion.section
            className="scanner-complete glass-panel"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="scanner-complete-header">
              <div>
                <p className="micro-label">Emoção detetada</p>
                <h2 className="scanner-complete-emotion" style={{ color: meta.accent }}>
                  {meta.label}
                </h2>
                {confidence > 0 ? (
                  <p className="muted-text" style={{ margin: '4px 0 0' }}>
                    Confiança: {formatConfidence(confidence)}
                  </p>
                ) : null}
              </div>
              <button type="button" className="intro-cta scanner-again" onClick={handleScanAgain}>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 4v6h-6M1 20v-6h6" />
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                </svg>
                Detetar novamente
              </button>
            </div>
            <p className="muted-text" style={{ margin: 0 }}>
              {meta.description}
            </p>
          </motion.section>
        ) : null}

        {scanState === 'idle' ? (
          <motion.section
            className="scanner-idle glass-panel"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <AppIcon className="intro-icon" />
            <h3>Pronto para detetar</h3>
            <p className="muted-text">
              A app vai ler a tua cara e sugerir playlists do Spotify. Ou escolhe manualmente abaixo.
            </p>
            <button
              type="button"
              className="intro-cta scanner-cta"
              onClick={handleScanStart}
            >
              Permitir câmara e detetar
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
            </button>
          </motion.section>
        ) : (
          <EmotionScanner
            scanning={showScanner}
            onScan={handleScan}
            onScanStart={handleScanStart}
            onManualSelect={handleManualSelect}
            manualEmotion={currentEmotion}
          />
        )}

        <AnimatePresence>
          {showResults && playlists.length > 0 ? (
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
                {isLoading ? <span className="status-pill">A procurar…</span> : null}
              </div>

              {isLoading ? (
                <div className="playlist-empty">
                  <p>A procurar playlists para o teu mood…</p>
                </div>
              ) : (
                <div className="playlist-stack">
                  {playlists.map((playlist) => (
                    <PlaylistCard
                      key={playlist.id}
                      playlist={playlist}
                      onPlay={() => window.open(playlist.url, '_blank', 'noreferrer')}
                    />
                  ))}
                </div>
              )}
            </motion.section>
          ) : null}
        </AnimatePresence>
      </main>
    </div>
  )
}
