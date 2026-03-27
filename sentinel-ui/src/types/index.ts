export type CBState = 'CLOSED' | 'HALF_OPEN' | 'OPEN'

export interface Metrics {
  cbState: CBState
  cbStateNum: 0 | 1 | 2
  requestRate: number       // req/s
  errorRate: number         // 0–100 %
  p50: number               // ms
  p95: number               // ms
  p99: number               // ms
  podCount: number
  podMax: number
  hikariActive: number
  hikariMax: number
  hikariPending: number
  cpuPercent: number
  memPercent: number
}

export interface Alert {
  id: string
  ts: number
  severity: 'critical' | 'warning' | 'info'
  message: string
}

export interface SparkPoint {
  t: number
  v: number
}

export interface History {
  latencyP50: SparkPoint[]
  latencyP99: SparkPoint[]
  requestRate: SparkPoint[]
  errorRate: SparkPoint[]
}
