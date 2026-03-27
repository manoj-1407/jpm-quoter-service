import { useState, useEffect, useCallback, useRef } from 'react'
import type { Metrics, Alert, History, SparkPoint, CBState } from '../types'
import {
  fetchCBState,
  fetchRequestRate,
  fetchErrorRate,
  fetchLatencyQuantile,
  fetchPodCount,
  fetchHikari,
} from '../lib/prometheus'

const MAX_HISTORY = 60
const POLL_MS = 5000

function cbNumToState(n: number): CBState {
  if (n === 1) return 'HALF_OPEN'
  if (n === 2) return 'OPEN'
  return 'CLOSED'
}

function push(arr: SparkPoint[], v: number): SparkPoint[] {
  const next = [...arr, { t: Date.now(), v }]
  return next.length > MAX_HISTORY ? next.slice(-MAX_HISTORY) : next
}

function seed(base: number, noise: number): SparkPoint[] {
  const now = Date.now()
  return Array.from({ length: 30 }, (_, i) => ({
    t: now - (30 - i) * POLL_MS,
    v: base + (Math.random() - 0.5) * noise,
  }))
}

const initialHistory = (): History => ({
  latencyP50: seed(42, 10),
  latencyP99: seed(120, 30),
  requestRate: seed(18, 6),
  errorRate: seed(0.4, 0.5),
})

const initialMetrics = (): Metrics => ({
  cbState: 'CLOSED',
  cbStateNum: 0,
  requestRate: 18,
  errorRate: 0.4,
  p50: 42,
  p95: 95,
  p99: 120,
  podCount: 1,
  podMax: 3,
  hikariActive: 3,
  hikariMax: 10,
  hikariPending: 0,
  cpuPercent: 22,
  memPercent: 44,
})

export function useMetrics(live: boolean) {
  const [metrics, setMetrics] = useState<Metrics>(initialMetrics)
  const [history, setHistory] = useState<History>(initialHistory)
  const [alerts, setAlerts] = useState<Alert[]>([])
  const prevCB = useRef<CBState>('CLOSED')

  const addAlert = useCallback((severity: Alert['severity'], message: string) => {
    setAlerts(prev => {
      const a: Alert = { id: `${Date.now()}`, ts: Date.now(), severity, message }
      return [a, ...prev].slice(0, 50)
    })
  }, [])

  const pollLive = useCallback(async () => {
    const [cbNum, rr, er, p50, p95, p99, pods, hik] = await Promise.all([
      fetchCBState(),
      fetchRequestRate(),
      fetchErrorRate(),
      fetchLatencyQuantile(0.5),
      fetchLatencyQuantile(0.95),
      fetchLatencyQuantile(0.99),
      fetchPodCount(),
      fetchHikari(),
    ])

    setMetrics(prev => {
      const next: Metrics = {
        cbStateNum: (cbNum ?? 0) as 0 | 1 | 2,
        cbState: cbNumToState(cbNum ?? 0),
        requestRate: rr ?? prev.requestRate,
        errorRate: er ?? prev.errorRate,
        p50: p50 ?? prev.p50,
        p95: p95 ?? prev.p95,
        p99: p99 ?? prev.p99,
        podCount: pods ?? prev.podCount,
        podMax: 3,
        hikariActive: hik?.active ?? prev.hikariActive,
        hikariMax: hik?.max ?? prev.hikariMax,
        hikariPending: hik?.pending ?? prev.hikariPending,
        cpuPercent: prev.cpuPercent,
        memPercent: prev.memPercent,
      }

      if (next.cbState !== prevCB.current) {
        addAlert(
          next.cbState === 'OPEN' ? 'critical' : next.cbState === 'HALF_OPEN' ? 'warning' : 'info',
          `Circuit breaker priceFeed → ${next.cbState}`
        )
        prevCB.current = next.cbState
      }
      if (next.errorRate > 5) addAlert('critical', `Error rate spike: ${next.errorRate.toFixed(1)}%`)
      if (next.p99 > 1000) addAlert('warning', `P99 latency: ${next.p99.toFixed(0)}ms`)

      return next
    })

    setHistory(prev => ({
      latencyP50: push(prev.latencyP50, p50 ?? 0),
      latencyP99: push(prev.latencyP99, p99 ?? 0),
      requestRate: push(prev.requestRate, rr ?? 0),
      errorRate: push(prev.errorRate, er ?? 0),
    }))
  }, [addAlert])

  const pollSimulated = useCallback(() => {
    setMetrics(prev => {
      const drift = (base: number, max: number, noise: number) =>
        Math.max(0, Math.min(max, base + (Math.random() - 0.48) * noise))

      const next: Metrics = {
        ...prev,
        requestRate: drift(prev.requestRate, 80, 4),
        errorRate: drift(prev.errorRate, 20, 0.6),
        p50: drift(prev.p50, 500, 8),
        p95: drift(prev.p95, 800, 15),
        p99: drift(prev.p99, 1200, 25),
        cpuPercent: drift(prev.cpuPercent, 95, 5),
        memPercent: drift(prev.memPercent, 95, 3),
        hikariActive: Math.min(prev.hikariMax, Math.max(0, Math.round(drift(prev.hikariActive, prev.hikariMax, 1)))),
      }

      if (Math.random() < 0.01 && next.cbState === 'CLOSED') {
        next.cbState = 'OPEN'; next.cbStateNum = 2
        addAlert('critical', 'Circuit breaker priceFeed → OPEN (simulated)')
        prevCB.current = 'OPEN'
      }

      return next
    })

    setHistory(prev => ({
      latencyP50: push(prev.latencyP50, 0),
      latencyP99: push(prev.latencyP99, 0),
      requestRate: push(prev.requestRate, 0),
      errorRate: push(prev.errorRate, 0),
    }))
  }, [addAlert])

  // Replace zeroes in simulated history with actual drift values
  useEffect(() => {
    if (!live) return
    const id = setInterval(pollSimulated, POLL_MS)
    return () => clearInterval(id)
  }, [live, pollSimulated])

  useEffect(() => {
    if (live) return
    const id = setInterval(pollLive, POLL_MS)
    pollLive()
    return () => clearInterval(id)
  }, [live, pollLive])

  return { metrics, history, alerts, setMetrics, addAlert }
}
