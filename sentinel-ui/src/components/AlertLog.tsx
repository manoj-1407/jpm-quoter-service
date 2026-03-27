import type { Alert } from '../types'

interface Props {
  alerts: Alert[]
  theme: 'dark' | 'light'
}

const SEV_COLOR = {
  critical: '#ef4444',
  warning: '#f59e0b',
  info: '#22d3a0',
}

const SEV_BG_DARK = {
  critical: '#ef444412',
  warning: '#f59e0b12',
  info: '#22d3a012',
}

const SEV_BG_LIGHT = {
  critical: '#fef2f2',
  warning: '#fffbeb',
  info: '#ecfdf5',
}

function fmt(ts: number) {
  return new Date(ts).toTimeString().slice(0, 8)
}

export function AlertLog({ alerts, theme }: Props) {
  const isDark = theme === 'dark'

  if (alerts.length === 0) {
    return (
      <div style={{
        padding: '16px 0',
        textAlign: 'center',
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 12,
        color: isDark ? '#4a5568' : '#9ca3af',
        letterSpacing: '0.05em',
      }}>
        — no alerts —
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 220, overflowY: 'auto' }}>
      {alerts.map(a => (
        <div
          key={a.id}
          style={{
            display: 'flex',
            gap: 10,
            alignItems: 'flex-start',
            padding: '6px 10px',
            borderRadius: 6,
            background: isDark ? SEV_BG_DARK[a.severity] : SEV_BG_LIGHT[a.severity],
            borderLeft: `2px solid ${SEV_COLOR[a.severity]}`,
            animation: 'fadeIn 0.3s ease',
          }}
        >
          <span style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10,
            color: isDark ? '#6b7280' : '#9ca3af',
            whiteSpace: 'nowrap',
            paddingTop: 1,
          }}>
            {fmt(a.ts)}
          </span>
          <span style={{
            fontSize: 11,
            fontFamily: "'JetBrains Mono', monospace",
            color: SEV_COLOR[a.severity],
            fontWeight: 500,
            textTransform: 'uppercase',
            whiteSpace: 'nowrap',
            paddingTop: 1,
          }}>
            [{a.severity.slice(0, 4).toUpperCase()}]
          </span>
          <span style={{
            fontSize: 12,
            fontFamily: "'DM Sans', sans-serif",
            color: isDark ? '#e2e8f0' : '#374151',
            lineHeight: 1.4,
          }}>
            {a.message}
          </span>
        </div>
      ))}
    </div>
  )
}
