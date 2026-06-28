import { motion } from 'framer-motion'

export default function StatCard({ label, value, detail, tone = 'default' }) {
  return (
    <motion.article
      className={`stat-card ${tone}`}
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ type: 'spring', stiffness: 240, damping: 22 }}
    >
      <span>{label}</span>
      <strong>{value}</strong>
      {detail ? <p>{detail}</p> : null}
    </motion.article>
  )
}