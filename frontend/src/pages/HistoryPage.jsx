import { useEffect, useState } from 'react'
import AppShell from '../components/AppShell'
import EmotionChart from '../components/EmotionChart'
import StatCard from '../components/StatCard'
import api from '../api/client'

export default function HistoryPage() {
  const [history, setHistory] = useState([])
  const [summary, setSummary] = useState({ totalScans: 0, averageConfidence: 0, counts: {} })

  useEffect(() => {
    async function loadHistory() {
      const [historyResponse, summaryResponse] = await Promise.all([
        api.get('/emotions/history?limit=50'),
        api.get('/emotions/summary'),
      ])

      setHistory(historyResponse.data.history || [])
      setSummary(summaryResponse.data)
    }

    loadHistory().catch(() => null)
  }, [])

  return (
    <AppShell
      title="Emotion history"
      eyebrow="Behavior analytics"
      subtitle="Review scans, confidence trends, and the moods that drove your recommendation history."
      actions={
        <div className="top-actions">
          <StatCard label="Stored scans" value={summary.totalScans} detail="Past 30 days" tone="teal" />
          <StatCard
            label="Avg. confidence"
            value={`${Math.round((summary.averageConfidence || 0) * 100)}%`}
            detail="Aggregate confidence"
            tone="blue"
          />
        </div>
      }
    >
      <div className="history-grid">
        <EmotionChart history={history} />

        <section className="glass-panel history-panel">
          <div className="panel-heading">
            <div>
              <p className="micro-label">Timeline</p>
              <h3>Recent scans</h3>
            </div>
          </div>

          <div className="history-list">
            {history.map((entry) => (
              <article key={entry.id} className="history-row">
                <div>
                  <strong>{entry.emotion.toLowerCase()}</strong>
                  <span>{Math.round((Number(entry.confidence || 0) * 100) || 0)}% confidence</span>
                </div>
                <time>{new Date(entry.createdAt).toLocaleString()}</time>
              </article>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  )
}
