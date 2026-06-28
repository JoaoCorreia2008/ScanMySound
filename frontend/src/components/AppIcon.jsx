import { useTheme } from '../hooks/useTheme'

export default function AppIcon({ className = '' }) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const src = isDark ? '/app-icon-light.svg' : '/app-icon-dark.svg'
  return <img src={src} alt="Scan my Sound" className={className} />
}
