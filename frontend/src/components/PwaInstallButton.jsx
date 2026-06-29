import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { usePwaInstall } from '../hooks/usePwaInstall'

export default function PwaInstallButton() {
  const { installable, promptInstall } = usePwaInstall()

  async function handleClick() {
    const ok = await promptInstall()
    if (ok) {
      toast.success('A instalar Scan my Sound…')
    }
  }

  return (
    <AnimatePresence>
      {installable ? (
        <motion.button
          key="pwa-install"
          type="button"
          className="pwa-install"
          onClick={handleClick}
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
      ) : null}
    </AnimatePresence>
  )
}
