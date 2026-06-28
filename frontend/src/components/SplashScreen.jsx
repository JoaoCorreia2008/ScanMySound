import { motion } from 'framer-motion'
import AppIcon from './AppIcon'

export default function SplashScreen({ status = 'A preparar a tua experiência…' }) {
  return (
    <div className="splash-screen">
      <motion.div
        className="splash-content"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        <motion.div
          initial={{ scale: 0.92, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          <AppIcon className="splash-icon" />
        </motion.div>

        <motion.div
          className="splash-loader"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <span />
          <span />
          <span />
        </motion.div>

        <motion.p
          className="splash-status"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.55 }}
          transition={{ delay: 0.5 }}
        >
          {status}
        </motion.p>
      </motion.div>
    </div>
  )
}
