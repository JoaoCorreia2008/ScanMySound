import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import AppIcon from '../components/AppIcon'
import ThemeToggle from '../components/ThemeToggle'

export default function IntroPage() {
  const navigate = useNavigate()

  return (
    <div className="intro-page">
      <header className="intro-header">
        <ThemeToggle />
      </header>

      <main className="intro-main">
        <motion.div
          className="intro-card"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        >
          <AppIcon className="intro-icon" />

          <p className="intro-text">
            Apontamos a câmara à tua cara, lemos a emoção e sugerimos uma playlist do Spotify
            que combine com o momento. Sem login, sem complicação.
          </p>

          <button
            type="button"
            className="intro-cta"
            onClick={() => navigate('/scan')}
          >
            Começar
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M13 5l7 7-7 7" />
            </svg>
          </button>

          <span className="intro-hint">Dica: podes alternar entre modo claro e escuro no botão acima.</span>
        </motion.div>
      </main>
    </div>
  )
}
