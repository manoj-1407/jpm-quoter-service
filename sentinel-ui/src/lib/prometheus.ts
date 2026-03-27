const BASE = '/api/prometheus'

async function query(promql: string): Promise<number | null> {
  try {
    const r = await fetch(`${BASE}/query?query=${encodeURIComponent(promql)}`)
    if (!r.ok) return null
    const j = await r.json()
    const val = j?.data?.result?.[0]?.value?.[1]
    return val != null ? parseFloat(val) : null
  } catch {
    return null
  }
}

export async function fetchCBState(): Promise<number | null> {
  return query('resilience4j_circuitbreaker_state{name="priceFeed"}')
}

export async function fetchRequestRate(): Promise<number | null> {
  return query(
    'sum(rate(http_server_requests_seconds_count{job="jpm-quoter"}[1m]))'
  )
}

export async function fetchErrorRate(): Promise<number | null> {
  const err = await query(
    'sum(rate(http_server_requests_seconds_count{job="jpm-quoter",status=~"5.."}[1m]))'
  )
  const total = await query(
    'sum(rate(http_server_requests_seconds_count{job="jpm-quoter"}[1m]))'
  )
  if (err == null || total == null || total === 0) return 0
  return (err / total) * 100
}

export async function fetchLatencyQuantile(q: number): Promise<number | null> {
  const v = await query(
    `histogram_quantile(${q}, rate(http_server_requests_seconds_bucket{job="jpm-quoter"}[1m]))`
  )
  return v != null ? v * 1000 : null   // convert to ms
}

export async function fetchPodCount(): Promise<number | null> {
  return query(
    'count(up{job="jpm-quoter"} == 1)'
  )
}

export async function fetchHikari(): Promise<{ active: number; max: number; pending: number } | null> {
  const [active, max, pending] = await Promise.all([
    query('hikaricp_connections_active{pool="HikariPool-1"}'),
    query('hikaricp_connections_max{pool="HikariPool-1"}'),
    query('hikaricp_connections_pending{pool="HikariPool-1"}'),
  ])
  if (active == null) return null
  return { active: active ?? 0, max: max ?? 10, pending: pending ?? 0 }
}
