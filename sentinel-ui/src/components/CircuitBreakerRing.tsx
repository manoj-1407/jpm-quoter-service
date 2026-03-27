import { useEffect, useRef } from 'react'
import type { CBState } from '../types'

interface Props {
  state: CBState
  theme: 'dark' | 'light'
}

const STATE_COLOR: Record<CBState, string> = {
  CLOSED: '#22d3a0',
  HALF_OPEN: '#f59e0b',
  OPEN: '#ef4444',
}

const STATE_LABEL: Record<CBState, string> = {
  CLOSED: 'CLOSED',
  HALF_OPEN: 'HALF-OPEN',
  OPEN: 'OPEN',
}

export function CircuitBreakerRing({ state, theme }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)
  const angleRef = useRef(0)
  const pulseRef = useRef(0)

  const color = STATE_COLOR[state]
  const isDark = theme === 'dark'

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const W = canvas.width
    const H = canvas.height
    const cx = W / 2
    const cy = H / 2

    function draw() {
      ctx.clearRect(0, 0, W, H)
      angleRef.current += state === 'OPEN' ? 0.03 : state === 'HALF_OPEN' ? 0.012 : 0.006
      pulseRef.current += 0.05

      const bg = isDark ? '#0d1117' : '#f4f6f8'
      const trackColor = isDark ? '#1e2530' : '#dde1e8'

      // Background fill
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, W, H)

      const rings = [
        { r: 88, width: 3, dash: state === 'OPEN' ? [6, 4] : [] },
        { r: 72, width: 5, dash: [] },
        { r: 54, width: 3, dash: [4, 8] },
        { r: 38, width: 7, dash: [] },
      ]

      rings.forEach(({ r, width, dash }, i) => {
        // Track
        ctx.beginPath()
        ctx.arc(cx, cy, r, 0, Math.PI * 2)
        ctx.strokeStyle = trackColor
        ctx.lineWidth = width
        ctx.setLineDash([])
        ctx.stroke()

        // Active arc
        const startAngle = angleRef.current * (i % 2 === 0 ? 1 : -1) - Math.PI / 2
        const arcLen = state === 'OPEN'
          ? Math.PI * 0.4
          : state === 'HALF_OPEN'
          ? Math.PI * 1.1
          : Math.PI * 1.75

        ctx.beginPath()
        ctx.arc(cx, cy, r, startAngle, startAngle + arcLen)
        const grad = ctx.createLinearGradient(cx - r, cy, cx + r, cy)
        grad.addColorStop(0, color + '20')
        grad.addColorStop(0.5, color)
        grad.addColorStop(1, color + '20')
        ctx.strokeStyle = grad
        ctx.lineWidth = width + 1
        ctx.setLineDash(dash)
        ctx.stroke()
        ctx.setLineDash([])
      })

      // Glow pulse for OPEN state
      if (state === 'OPEN') {
        const pulse = (Math.sin(pulseRef.current) + 1) / 2
        ctx.beginPath()
        ctx.arc(cx, cy, 26 + pulse * 6, 0, Math.PI * 2)
        ctx.fillStyle = color + Math.floor(pulse * 40).toString(16).padStart(2, '0')
        ctx.fill()
      }

      // Center circle
      ctx.beginPath()
      ctx.arc(cx, cy, 24, 0, Math.PI * 2)
      ctx.fillStyle = isDark ? '#13181f' : '#edf0f4'
      ctx.fill()
      ctx.beginPath()
      ctx.arc(cx, cy, 24, 0, Math.PI * 2)
      ctx.strokeStyle = color + '80'
      ctx.lineWidth = 2
      ctx.stroke()

      // Center dot
      ctx.beginPath()
      ctx.arc(cx, cy, 6, 0, Math.PI * 2)
      ctx.fillStyle = color
      ctx.fill()

      // Tick marks
      for (let t = 0; t < 24; t++) {
        const a = (t / 24) * Math.PI * 2
        const inner = t % 6 === 0 ? 95 : 98
        ctx.beginPath()
        ctx.moveTo(cx + Math.cos(a) * inner, cy + Math.sin(a) * inner)
        ctx.lineTo(cx + Math.cos(a) * 102, cy + Math.sin(a) * 102)
        ctx.strokeStyle = t % 6 === 0 ? color + 'cc' : trackColor
        ctx.lineWidth = t % 6 === 0 ? 2 : 1
        ctx.stroke()
      }

      animRef.current = requestAnimationFrame(draw)
    }

    draw()
    return () => cancelAnimationFrame(animRef.current)
  }, [state, isDark, color])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      <canvas
        ref={canvasRef}
        width={220}
        height={220}
        style={{ borderRadius: '50%' }}
      />
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 13, fontWeight: 700, letterSpacing: '0.12em',
      }}>
        <span style={{
          width: 8, height: 8, borderRadius: '50%',
          background: color,
          boxShadow: `0 0 8px ${color}`,
          animation: state === 'OPEN' ? 'pulse 1s ease-in-out infinite' : 'none',
        }} />
        <span style={{ color }}>{STATE_LABEL[state]}</span>
      </div>
    </div>
  )
}
