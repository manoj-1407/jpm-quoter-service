import { useRef, useEffect } from 'react'
import type { SparkPoint } from '../types'

interface Props {
  data: SparkPoint[]
  color: string
  fill?: boolean
  height?: number
  theme: 'dark' | 'light'
}

export function Sparkline({ data, color, fill = true, height = 48, theme }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || data.length < 2) return
    const ctx = canvas.getContext('2d')!
    const W = canvas.width
    const H = canvas.height

    ctx.clearRect(0, 0, W, H)

    const vals = data.map(d => d.v).filter(v => v > 0)
    if (vals.length < 2) return

    const min = Math.min(...vals) * 0.9
    const max = Math.max(...vals) * 1.1 || 1

    const points = vals.map((v, i) => ({
      x: (i / (vals.length - 1)) * W,
      y: H - ((v - min) / (max - min)) * H * 0.85 - H * 0.05,
    }))

    if (fill) {
      ctx.beginPath()
      ctx.moveTo(0, H)
      points.forEach(p => ctx.lineTo(p.x, p.y))
      ctx.lineTo(W, H)
      ctx.closePath()
      const grad = ctx.createLinearGradient(0, 0, 0, H)
      grad.addColorStop(0, color + '40')
      grad.addColorStop(1, color + '00')
      ctx.fillStyle = grad
      ctx.fill()
    }

    ctx.beginPath()
    points.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y))
    ctx.strokeStyle = color
    ctx.lineWidth = 1.5
    ctx.lineJoin = 'round'
    ctx.stroke()

    // Last dot
    const last = points[points.length - 1]
    ctx.beginPath()
    ctx.arc(last.x, last.y, 3, 0, Math.PI * 2)
    ctx.fillStyle = color
    ctx.fill()
  }, [data, color, fill, theme])

  return (
    <canvas
      ref={canvasRef}
      width={160}
      height={height}
      style={{ width: '100%', height, display: 'block' }}
    />
  )
}
