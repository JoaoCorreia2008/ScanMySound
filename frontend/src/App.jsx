import { useEffect, useState } from 'react'
import { Route, Routes } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import IntroPage from './pages/IntroPage'
import ScanIntroPage from './pages/ScanIntroPage'
import ScannerPage from './pages/ScannerPage'
import HistoryPage from './pages/HistoryPage'
import SettingsPage from './pages/SettingsPage'
import SplashScreen from './components/SplashScreen'
import PwaInstallButton from './components/PwaInstallButton'
import { useTheme } from './hooks/useTheme'
import './App.css'

const SPLASH_MIN_DURATION = 1200

function App() {
  const { theme } = useTheme()
  const [showSplash, setShowSplash] = useState(true)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  useEffect(() => {
    const timer = window.setTimeout(() => setShowSplash(false), SPLASH_MIN_DURATION)
    return () => window.clearTimeout(timer)
  }, [])

  if (showSplash) {
    return <SplashScreen status="A preparar a tua experiência…" />
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        className="app-root"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <PwaInstallButton />
        <Routes>
          <Route path="/" element={<IntroPage />} />
          <Route path="/scan" element={<ScanIntroPage />} />
          <Route path="/scanner" element={<ScannerPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<IntroPage />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  )
}

export default App
