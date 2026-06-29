import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { useEffect, useState } from 'react'
import { usePwaInstall } from '../hooks/usePwaInstall'

const STORAGE_KEY = 'scanmysound:pwa-dismissed'

function detectPlatform() {
  if (typeof navigator === 'undefined') return { os: 'unknown', browser: 'unknown', isIOS: false, isAndroid: false, isChrome: false, isEdge: false, isSafari: false }
  const ua = navigator.userAgent
  const isIOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream
  const isAndroid = /Android/.test(ua)
  const isChrome = /Chrome/.test(ua) && !/Edg/.test(ua)
  const isEdge = /Edg/.test(ua)
  const isSafari = /Safari/.test(ua) && !/Chrome/.test(ua) && !isIOS

  let os = 'desktop'
  if (isIOS) os = 'ios'
  else if (isAndroid) os = 'android'

  let browser = 'outro'
  if (isChrome) browser = 'chrome'
  else if (isEdge) browser = 'edge'
  else if (isSafari) browser = 'safari'

  return { os, browser, isIOS, isAndroid, isChrome, isEdge, isSafari }
}

function InstallInstructions({ onClose, platform }) {
  const steps = []
  if (platform.isAndroid && (platform.isChrome || platform.isEdge)) {
    steps.push('Toca no menu ⋮ (3 pontos) no canto superior direito')
    steps.push('Escolhe "Instalar app" ou "Adicionar ao ecrã principal"')
    steps.push('Confirma tocando em "Instalar"')
  } else if (platform.isIOS && platform.isSafari) {
    steps.push('Toca no ícone de partilha ⬆️ na barra do Safari')
    steps.push('Desce e escolhe "Adicionar ao Ecrã Principal"')
    steps.push('Toca em "Adicionar" no canto superior direito')
  } else if (platform.isAndroid) {
    steps.push('Abre o menu do browser (⋮) e procura "Instalar app"')
  } else {
    steps.push('Na barra de endereço, clica no ícone de instalação (⬇ ou ⊕)')
    steps.push('Ou clica no menu ⋮ e escolhe "Instalar Scan my Sound"')
  }

  return (
    <motion.div
      className="pwa-install-card"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
    >
      <div className="pwa-install-card-head">
        <div>
          <p className="micro-label">Instalar app</p>
          <h3>Instala a app no teu telemóvel</h3>
        </div>
        <button type="button" className="pwa-install-close" onClick={onClose} aria-label="Fechar">
          ✕
        </button>
      </div>
      <ol className="pwa-install-steps">
        {steps.map((s, i) => (
          <li key={i}>{s}</li>
        ))}
      </ol>
    </motion.div>
  )
}

export default function PwaInstallButton() {
  const { installed, promptInstall } = usePwaInstall()
  const platform = detectPlatform()
  const [showManual, setShowManual] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    queueMicrotask(() => setDismissed(window.localStorage.getItem(STORAGE_KEY) === '1'))
  }, [])

  const handleClose = () => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, '1')
    }
    setDismissed(true)
    setShowManual(false)
  }

  // Tenta SEMPRE o popup nativo primeiro
  // Se o browser suportar e tiver o deferred prompt, mostra o popup nativo
  // Se não, mostra as instruções manuais
  const handleInstall = async () => {
    const ok = await promptInstall()
    if (ok) {
      toast.success('A instalar Scan my Sound…')
    } else {
      // Browser não tem deferred prompt (não suporta, ou já foi consumido)
      // Mostra as instruções manuais
      setShowManual(true)
    }
  }

  if (installed || dismissed) return null

  return (
    <AnimatePresence>
      <motion.button
        key="pwa-install"
        type="button"
        className="pwa-install"
        onClick={handleInstall}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 8 }}
        transition={{ duration: 0.25 }}
      >
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        Instalar app
      </motion.button>

      {showManual ? <InstallInstructions onClose={handleClose} platform={platform} /> : null}
    </AnimatePresence>
  )
}
