/* eslint-disable react-hooks/set-state-in-effect */
import { useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import api from '../api/client'
import AppShell from '../components/AppShell'
import EmotionScanner from '../components/EmotionScanner'
import EmotionChart from '../components/EmotionChart'
import PlaylistCard from '../components/PlaylistCard'
import StatCard from '../components/StatCard'
import { emotionToQuery, normalizeEmotion } from '../utils/emotions'

export default function DashboardPage() {
  const [currentEmotion, setCurrentEmotion] = useState('neutral')
  const [confidence, setConfidence] = useState(0)
  const [playlists, setPlaylists] = useState([])
  const [history, setHistory] = useState([])
  const [sessions, setSessions] = useState([])
  const [summary, setSummary] = useState({ totalScans: 0, averageConfidence: 0, counts: {} })
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false)

  const loadSummary = useCallback(async () => {
    const [historyResponse, summaryResponse, sessionsResponse] = await Promise.all([
      api.get('/emotions/history?limit=30'),
      api.get('/emotions/summary'),
      api.get('/sessions/history'),
    ])

    setHistory(historyResponse.data.history || [])
    setSummary(summaryResponse.data)
    setSessions(sessionsResponse.data.sessions || [])
  }, [])

  useEffect(() => {
    loadSummary().catch(() => toast.error('Unable to load dashboard data.'))
  }, [loadSummary])

  const fetchRecommendations = useCallback(async (emotion) => {
    const normalized = normalizeEmotion(emotion)

    setIsLoadingRecommendations(true)

    try {
      const response = await api.get(`/recommendations/${normalized}`)
      setPlaylists(response.data.playlists || [])
      toast.success(`Showing playlists for ${normalized}.`)
    } catch {
      toast.error('Could not load Spotify recommendations right now.')
    } finally {
      setIsLoadingRecommendations(false)
    }
  }, [])

  const handleScan = useCallback(
    ({ emotion, confidence: nextConfidence }) => {
      setCurrentEmotion(emotion)
      setConfidence(nextConfidence)
      fetchRecommendations(emotion)
    },
    [fetchRecommendations],
  )

  const recommendedQuery = useMemo(() => emotionToQuery(currentEmotion), [currentEmotion])

  const activeSession = sessions.find((session) => !session.endedAt) || sessions[0] || null

  return (
    <AppShell
      title="Mood dashboard"
      eyebrow="Live analysis"
      subtitle="Scan your face, track emotion confidence, and match the moment with Spotify playlists."
      actions={
        <div className="top-actions">
          <StatCard label="Total scans" value={summary.totalScans} detail="Last 30 days" tone="teal" />
          <StatCard label="Avg. confidence" value={`${Math.round((summary.averageConfidence || 0) * 100)}%`} detail="Quality of scans" tone="blue" />
        </div>
      }
    >
      <div className="dashboard-grid">
        <div className="dashboard-main">
          <EmotionScanner
            onScan={(payload) => {
              handleScan(payload)
            }}
          />

          <section className="glass-panel insight-panel">
            <div className="panel-heading">
              <div>
                <p className="micro-label">Current recommendation</p>
                <h3>{currentEmotion}</h3>
              </div>
              <span className="status-pill">{Math.round(confidence * 100)}%</span>
            </div>
            <p className="muted-text">Spotify query: {recommendedQuery}</p>
            <div className="insight-grid">
              <StatCard label="Active emotion" value={currentEmotion} detail="Real-time webcam state" />
              <StatCard label="Session" value={activeSession ? 'Running' : 'Ready'} detail={activeSession?.device || 'No active session yet'} />
              <StatCard label="Recent scans" value={history.length} detail="Stored in Neon PostgreSQL" />
            </div>
          </section>

          <EmotionChart history={history} />
        </div>

        <aside className="dashboard-side">
          <section className="glass-panel recommendations-panel">
            <div className="panel-heading">
              <div>
                <p className="micro-label">Spotify playlists</p>
                <h3>Recommended for {currentEmotion}</h3>
              </div>
              {isLoadingRecommendations ? <span className="status-pill">Loading…</span> : null}
            </div>

            <div className="playlist-stack">
              {playlists.length ? (
                playlists.map((playlist) => <PlaylistCard key={playlist.id} playlist={playlist} onPlay={() => window.open(playlist.url, '_blank', 'noreferrer')} />)
              ) : (
                <div className="empty-state">
                  <h4>No playlists yet</h4>
                  <p>Point the webcam at your face and wait for the first emotion scan. Results will appear here dynamically.</p>
                </div>
              )}
            </div>
          </section>

          <section className="glass-panel session-panel">
            <div className="panel-heading">
              <div>
                <p className="micro-label">Session snapshot</p>
                <h3>Recent activity</h3>
              </div>
            </div>

            <div className="session-list">
              {sessions.slice(0, 6).map((session) => (
                <div key={session.id} className="session-row">
                  <div>
                    <strong>{session.status}</strong>
                    <span>{session.device || 'Browser session'}</span>
                  </div>
                  <time>{new Date(session.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </AppShell>
  )
}