import { motion } from 'framer-motion'

export default function PlaylistCard({ playlist, onPlay }) {
  return (
    <motion.article
      className="playlist-card glass-panel"
      whileHover={{ y: -6, scale: 1.01 }}
      transition={{ type: 'spring', stiffness: 220, damping: 20 }}
    >
      <a href={playlist.url} target="_blank" rel="noreferrer" className="playlist-cover">
        {playlist.image ? <img src={playlist.image} alt={playlist.name} /> : <div className="playlist-placeholder">SM</div>}
      </a>
      <div className="playlist-copy">
        <span className="micro-label">{playlist.owner || 'Spotify'}</span>
        <h3>{playlist.name}</h3>
        <p>{playlist.description || 'Curated playlist tuned to your current emotional state.'}</p>
      </div>
      <div className="playlist-actions">
        <button className="button accent" type="button" onClick={() => onPlay?.(playlist)}>
          Play
        </button>
        <a className="button subtle" href={playlist.url} target="_blank" rel="noreferrer">
          Open
        </a>
      </div>
    </motion.article>
  )
}