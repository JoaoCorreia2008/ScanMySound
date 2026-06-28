import { NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'
import AppIcon from './AppIcon'
import { useSession } from '../hooks/useSession'
import { useTheme } from '../hooks/useTheme'

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/history', label: 'Histórico' },
  { to: '/settings', label: 'Definições' },
]

export default function AppShell({ title, eyebrow, subtitle, actions, children }) {
  const { reset } = useSession()
  const { theme, setTheme } = useTheme()

  return (
    <div className="app-shell">
      <aside className="sidebar glass-panel">
        <div className="brand-lockup">
          <AppIcon className="brand-logo" />
          <div>
            <p>Scan my Sound</p>
            <span>Música pela tua cara</span>
          </div>
        </div>

        <nav className="nav-stack">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="profile-chip">
            <div className="avatar">
              <AppIcon className="brand-logo" />
            </div>
            <div>
              <strong>Visitante</strong>
              <span>Sessão anónima local</span>
            </div>
          </div>

          <button className="button ghost" type="button" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
            {theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
          </button>

          <button className="button subtle" type="button" onClick={reset}>
            Nova sessão
          </button>
        </div>
      </aside>

      <main className="shell-main">
        <header className="shell-header glass-panel">
          <div>
            {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
            <h1>{title}</h1>
            {subtitle ? <p className="muted-text">{subtitle}</p> : null}
          </div>
          <div className="shell-actions">{actions}</div>
        </header>

        <motion.section
          className="shell-content"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28 }}
        >
          {children}
        </motion.section>
      </main>
    </div>
  )
}
