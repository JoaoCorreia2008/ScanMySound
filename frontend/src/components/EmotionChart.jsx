import { ResponsiveContainer, Area, AreaChart, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts'
import { EMOTION_META } from '../utils/emotions'

export default function EmotionChart({ history = [] }) {
  const chartData = history.slice(0, 8).reverse().map((entry) => ({
    time: new Date(entry.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    confidence: Math.round((Number(entry.confidence || 0) * 100) || 0),
    emotion: entry.emotion.toLowerCase(),
    value: 1,
  }))

  return (
    <div className="chart-panel glass-panel">
      <div className="panel-heading">
        <div>
          <p className="micro-label">Confidence trend</p>
          <h3>Recent scan strength</h3>
        </div>
      </div>

      <div className="chart-frame">
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="confidenceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#82d1ff" stopOpacity={0.8} />
                <stop offset="100%" stopColor="#82d1ff" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(183, 195, 255, 0.12)" vertical={false} />
            <XAxis dataKey="time" stroke="rgba(226, 232, 255, 0.55)" />
            <YAxis stroke="rgba(226, 232, 255, 0.55)" />
            <Tooltip
              contentStyle={{
                background: 'rgba(8, 12, 24, 0.92)',
                border: '1px solid rgba(120, 140, 220, 0.2)',
                borderRadius: '16px',
              }}
              labelStyle={{ color: '#f5f7ff' }}
            />
            <Area type="monotone" dataKey="confidence" stroke="#82d1ff" fill="url(#confidenceGradient)" strokeWidth={3} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="chart-legend">
        {Object.entries(EMOTION_META).map(([emotion, meta]) => (
          <span key={emotion}>
            <i style={{ background: meta.accent }} />
            {meta.label}
          </span>
        ))}
      </div>
    </div>
  )
}