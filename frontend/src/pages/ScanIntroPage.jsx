import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import AppIcon from '../components/AppIcon'
import ThemeToggle from '../components/ThemeToggle'
import api from '../api/client'

export default function ScanIntroPage() {
  const navigate = useNavigate()
  const [pending, setPending] = useState(false)

  async function handleScanClick() {
    setPending(true)
    try {
      await api.post('/sessions/start', {
        device: navigator.userAgent,
        userAgent: navigator.userAgent,
      })
    } catch {
      // ignore — o middleware cria a sessão lazy no primeiro POST autenticado
    } finally {
      setPending(false)
    }
    navigate('/scanner')
  }

  return (
    <div className="scan-intro-page">
      <header className="intro-header">
        <ThemeToggle />
      </header>

      <main className="scan-intro-main">
        <motion.div
          className="scan-intro-card"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        >
          <motion.div
            animate={{ rotate: [0, -3, 3, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
          >
            <AppIcon className="intro-icon" />
          </motion.div>

          <button
            type="button"
            className="scan-cta"
            onClick={handleScanClick}
            disabled={pending}
          >
            {pending ? 'A iniciar…' : 'Scan your emotion'}
            {!pending && (
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
            )}
          </button>

          <span className="scan-hint">
            Vamos pedir permissão para usar a câmara. Tudo corre no teu dispositivo.
          </span>
        </motion.div>
      </main>
    </div>
  )
}
