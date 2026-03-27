import { useState } from 'react'
import { CircuitBreakerRing } from './components/CircuitBreakerRing'
import { Sparkline } from './components/Sparkline'
import { PodGrid } from './components/PodGrid'
import { AlertLog } from './components/AlertLog'
import { useMetrics } from './hooks/useMetrics'
import type { CBState } from './types'

type Theme = 'dark' | 'light'

const T = {
  dark: {
    bg: '#0d1117',
    panel: '#111827',
    border: '#1e2a38',
    text: '#e2e8f0',
    muted: '#64748b',
    label: '#94a3b8',
    dot: '#1e2a38',
  },
  light: {
    bg: '#f0f2f5',
    panel: '#ffffff',
    border: '#e2e8f0',
    text: '#111827',
    muted: '#6b7280',
    label: '#6b7280',
    dot: '#e5e7eb',
  },
}

function MetricCard({
  label, value, unit, sub, color, spark, history, theme,
}: {
  label: string; value: string; unit?: string; sub?: string
  color: string; spark?: 'line'; history?: { t: number; v: number }[]; theme: Theme
}) {
  const c = T[theme]
  return (
    <div style={{
      background: c.panel, border: `1px solid ${c.border}`,
      borderRadius: 10, padding: '16px 18px',
      display: 'flex', flexDirection: 'column', gap: 4,
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 2,
        background: `linear-gradient(90deg, ${color}00, ${color}, ${color}00)`,
      }} />
      <div style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 10, letterSpacing: '0.12em', fontWeight: 600,
        color: c.muted, textTransform: 'uppercase',
      }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 28, fontWeight: 700, color: c.text, lineHeight: 1,
        }}>{value}</span>
        {unit && <span style={{ fontSize: 11, color: c.muted, fontFamily: "'JetBrains Mono', monospace" }}>{unit}</span>}
      </div>
      {sub && <div style={{ fontSize: 11, color: c.muted, fontFamily: "'DM Sans', sans-serif" }}>{sub}</div>}
      {history && (
        <div style={{ marginTop: 6 }}>
          <Sparkline data={history} color={color} theme={theme} height={36} />
        </div>
      )}
    </div>
  )
}

function Panel({ title, children, theme, action }: {
  title: string; children: React.ReactNode; theme: Theme
  action?: React.ReactNode
}) {
  const c = T[theme]
  return (
    <div style={{
      background: c.panel, border: `1px solid ${c.border}`,
      borderRadius: 10, padding: '16px 18px',
      display: 'flex', flexDirection: 'column', gap: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 10, letterSpacing: '0.12em',
          fontWeight: 700, color: c.muted, textTransform: 'uppercase',
        }}>{title}</div>
        {action}
      </div>
      {children}
    </div>
  )
}

function HikariBar({ label, value, max, color, theme }: {
  label: string; value: number; max: number; color: string; theme: Theme
}) {
  const c = T[theme]
  const pct = max > 0 ? (value / max) * 100 : 0
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 11, fontFamily: "'DM Sans', sans-serif", color: c.muted }}>{label}</span>
        <span style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: c.text }}>
          {value}/{max}
        </span>
      </div>
      <div style={{
        height: 5, borderRadius: 3,
        background: c.border,
        overflow: 'hidden',
      }}>
        <div style={{
          width: `${pct}%`, height: '100%',
          background: pct > 80 ? '#ef4444' : color,
          borderRadius: 3,
          transition: 'width 0.5s ease',
        }} />
      </div>
    </div>
  )
}

export default function App() {
  const [theme, setTheme] = useState<Theme>('dark')
  const [simMode, setSimMode] = useState(true)
  const { metrics, history, alerts, setMetrics, addAlert } = useMetrics(simMode)
  const c = T[theme]

  const tripCB = (state: CBState) => {
    setMetrics(prev => ({
      ...prev,
      cbState: state,
      cbStateNum: state === 'CLOSED' ? 0 : state === 'HALF_OPEN' ? 1 : 2,
    }))
    addAlert(
      state === 'OPEN' ? 'critical' : state === 'HALF_OPEN' ? 'warning' : 'info',
      `Circuit breaker manually set → ${state}`
    )
  }

  const latencyHistory = history.latencyP50.map((p, i) => ({
    t: p.t,
    v: (p.v + (history.latencyP99[i]?.v ?? 0)) / 2,
  }))

  return (
    <div style={{
      minHeight: '100vh',
      background: c.bg,
      color: c.text,
      fontFamily: "'DM Sans', sans-serif",
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Dot-grid background */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        backgroundImage: `radial-gradient(circle, ${c.dot} 1px, transparent 1px)`,
        backgroundSize: '28px 28px',
        opacity: theme === 'dark' ? 0.6 : 0.4,
      }} />

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.15); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #2a3140; border-radius: 2px; }
      `}</style>

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 1200, margin: '0 auto', padding: '20px 24px' }}>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 24, paddingBottom: 16,
          borderBottom: `1px solid ${c.border}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16,
            }}>⬡</div>
            <div>
              <div style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 16, fontWeight: 700, letterSpacing: '0.06em',
              }}>SENTINEL</div>
              <div style={{ fontSize: 11, color: c.muted }}>jpm-quoter-service · k3s cluster</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Sim/Live toggle */}
            <button
              onClick={() => setSimMode(!simMode)}
              style={{
                padding: '5px 12px', borderRadius: 6, fontSize: 11,
                fontFamily: "'JetBrains Mono', monospace", fontWeight: 600,
                letterSpacing: '0.06em', cursor: 'pointer',
                background: simMode ? '#22d3a015' : '#6366f115',
                color: simMode ? '#22d3a0' : '#6366f1',
                border: `1px solid ${simMode ? '#22d3a030' : '#6366f130'}`,
              }}
            >
              {simMode ? '⊙ SIM' : '⊙ LIVE'}
            </button>

            {/* Theme toggle */}
            <button
              onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
              style={{
                width: 32, height: 32, borderRadius: 6, cursor: 'pointer',
                background: c.panel, border: `1px solid ${c.border}`,
                color: c.muted, fontSize: 14,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              {theme === 'dark' ? '◑' : '◐'}
            </button>
          </div>
        </div>

        {/* Row 1: CB ring + metric cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 16, marginBottom: 16 }}>

          {/* Circuit Breaker */}
          <div style={{
            background: c.panel, border: `1px solid ${c.border}`,
            borderRadius: 10, padding: '20px 16px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
          }}>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10, letterSpacing: '0.12em',
              fontWeight: 700, color: c.muted, textTransform: 'uppercase',
            }}>Circuit Breaker · priceFeed</div>
            <CircuitBreakerRing state={metrics.cbState} theme={theme} />
            <div style={{ display: 'flex', gap: 6, width: '100%' }}>
              {(['CLOSED', 'HALF_OPEN', 'OPEN'] as CBState[]).map(s => (
                <button
                  key={s}
                  onClick={() => tripCB(s)}
                  style={{
                    flex: 1, padding: '4px 0', fontSize: 9,
                    fontFamily: "'JetBrains Mono', monospace",
                    fontWeight: 700, letterSpacing: '0.04em',
                    cursor: 'pointer', borderRadius: 4,
                    background: metrics.cbState === s
                      ? s === 'OPEN' ? '#ef444420' : s === 'HALF_OPEN' ? '#f59e0b20' : '#22d3a020'
                      : c.bg,
                    color: s === 'OPEN' ? '#ef4444' : s === 'HALF_OPEN' ? '#f59e0b' : '#22d3a0',
                    border: `1px solid ${s === 'OPEN' ? '#ef444440' : s === 'HALF_OPEN' ? '#f59e0b40' : '#22d3a040'}`,
                  }}
                >
                  {s === 'HALF_OPEN' ? 'H/O' : s.slice(0, 4)}
                </button>
              ))}
            </div>
          </div>

          {/* Metric cards 2x2 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: 12 }}>
            <MetricCard
              label="Request Rate" value={metrics.requestRate.toFixed(1)} unit="req/s"
              color="#6366f1" history={history.requestRate} theme={theme}
            />
            <MetricCard
              label="Error Rate" value={metrics.errorRate.toFixed(2)} unit="%"
              sub={metrics.errorRate > 5 ? '⚠ above threshold' : 'within SLO'}
              color={metrics.errorRate > 5 ? '#ef4444' : '#22d3a0'}
              history={history.errorRate} theme={theme}
            />
            <MetricCard
              label="P50 Latency" value={metrics.p50.toFixed(0)} unit="ms"
              color="#a78bfa" history={latencyHistory} theme={theme}
            />
            <MetricCard
              label="P99 Latency" value={metrics.p99.toFixed(0)} unit="ms"
              sub={`P95: ${metrics.p95.toFixed(0)}ms`}
              color={metrics.p99 > 1000 ? '#ef4444' : '#f59e0b'}
              history={history.latencyP99} theme={theme}
            />
          </div>
        </div>

        {/* Row 2: HPA + HikariCP + Alerts */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.5fr', gap: 16 }}>

          <Panel title="HPA · Pod Scaling" theme={theme}>
            <div style={{ textAlign: 'center' }}>
              <span style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 32, fontWeight: 700,
              }}>{metrics.podCount}</span>
              <span style={{ fontSize: 13, color: c.muted }}>/{metrics.podMax}</span>
            </div>
            <PodGrid active={metrics.podCount} max={metrics.podMax} theme={theme} />
            <div style={{ fontSize: 11, color: c.muted, textAlign: 'center' }}>
              CPU: {metrics.cpuPercent.toFixed(0)}% · Mem: {metrics.memPercent.toFixed(0)}%
            </div>
            <div style={{ height: 4, borderRadius: 2, background: c.border, overflow: 'hidden' }}>
              <div style={{
                width: `${(metrics.cpuPercent / 100) * 100}%`, height: '100%',
                background: metrics.cpuPercent > 70 ? '#ef4444' : '#6366f1',
                transition: 'width 0.5s ease',
              }} />
            </div>
          </Panel>

          <Panel title="HikariCP · Connection Pool" theme={theme}>
            <HikariBar label="Active" value={metrics.hikariActive} max={metrics.hikariMax} color="#6366f1" theme={theme} />
            <HikariBar label="Idle" value={metrics.hikariMax - metrics.hikariActive} max={metrics.hikariMax} color="#22d3a0" theme={theme} />
            <HikariBar label="Pending" value={metrics.hikariPending} max={5} color="#f59e0b" theme={theme} />
            <div style={{
              marginTop: 4, padding: '6px 10px', borderRadius: 6,
              background: metrics.hikariPending > 3 ? '#ef444415' : '#22d3a015',
              fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
              color: metrics.hikariPending > 3 ? '#ef4444' : '#22d3a0',
              letterSpacing: '0.06em',
            }}>
              {metrics.hikariPending > 3 ? '⚠ POOL PRESSURE' : '✓ POOL HEALTHY'}
            </div>
          </Panel>

          <Panel
            title="Alert Log"
            theme={theme}
            action={
              <span style={{
                fontSize: 10, fontFamily: "'JetBrains Mono', monospace",
                color: c.muted, letterSpacing: '0.06em',
              }}>
                {alerts.length} event{alerts.length !== 1 ? 's' : ''}
              </span>
            }
          >
            <AlertLog alerts={alerts} theme={theme} />
          </Panel>
        </div>

        {/* Footer */}
        <div style={{
          marginTop: 20, paddingTop: 12,
          borderTop: `1px solid ${c.border}`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ fontSize: 10, color: c.muted, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.06em' }}>
            SENTINEL v1.0 · {simMode ? 'SIMULATION MODE' : 'LIVE · prometheus:9090'} · 5s poll
          </span>
          <span style={{ fontSize: 10, color: c.muted, fontFamily: "'JetBrains Mono', monospace" }}>
            {new Date().toISOString().slice(0, 19).replace('T', ' ')} UTC
          </span>
        </div>
      </div>
    </div>
  )
}
