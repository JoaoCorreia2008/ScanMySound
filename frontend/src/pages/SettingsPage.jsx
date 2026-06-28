import { useTheme } from '../hooks/useTheme'
import AppShell from '../components/AppShell'
import StatCard from '../components/StatCard'
import { useSession } from '../hooks/useSession'

export default function SettingsPage() {
  const { theme, setTheme } = useTheme()
  const { sessionId, reset } = useSession()
  const shortId = sessionId ? sessionId.slice(0, 8) : '—'

  return (
    <AppShell
      title="Definições"
      eyebrow="Preferências"
      subtitle="Ajusta o tema, gere a tua sessão anónima e consulta os limites da app."
    >
      <div className="settings-grid">
        <StatCard label="Sessão atual" value={shortId} detail="ID anónimo guardado no browser" tone="teal" />
        <StatCard label="Tema" value={theme === 'dark' ? 'Escuro' : 'Claro'} detail="Alternável em qualquer altura" tone="blue" />

        <form
          className="glass-panel settings-form"
          onSubmit={(event) => event.preventDefault()}
        >
          <div className="panel-heading">
            <div>
              <p className="micro-label">Tema</p>
              <h3>Aparência</h3>
            </div>
          </div>

          <label>
            Tema
            <select value={theme} onChange={(event) => setTheme(event.target.value)}>
              <option value="dark">Escuro</option>
              <option value="light">Claro</option>
            </select>
          </label>

          <div className="panel-heading" style={{ marginTop: 12 }}>
            <div>
              <p className="micro-label">Privacidade</p>
              <h3>Sessão</h3>
            </div>
          </div>

          <p className="muted-text" style={{ margin: 0 }}>
            Os teus scans estão guardados com o ID <code>{shortId}</code>. Se quiseres
            começar do zero, podes gerar uma nova sessão.
          </p>

          <button className="button accent" type="button" onClick={reset}>
            Começar nova sessão
          </button>
        </form>
      </div>
    </AppShell>
  )
}
