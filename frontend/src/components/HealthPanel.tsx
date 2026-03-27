import { useCallback } from 'react'
import { motion } from 'framer-motion'
import { usePoll } from '../hooks/usePoll'
import { getActuator } from '../api/client'

export default function HealthPanel() {
  const fn = useCallback(getActuator, [])
  const { data, error } = usePoll(fn, 5000)

  const status = (data as any)?.status ?? (error ? 'DOWN' : 'UNKNOWN')
  const isUp   = status === 'UP'
  const color  = isUp ? 'var(--green)' : status === 'UNKNOWN' ? 'var(--amber)' : 'var(--red)'
  const comps  = (data as any)?.components ?? {}

  return (
    <div style={{ background:'var(--surface)', border:'1px solid var(--border)', padding:20, height:'100%' }}>
      <div className="label" style={{ marginBottom:14 }}>System Health</div>

      <div style={{
        display:'flex', alignItems:'center', gap:10, marginBottom:16, padding:'12px 14px',
        background:`${color}0a`, border:`1px solid ${color}22`,
      }}>
        <span style={{
          width:8, height:8, borderRadius:'50%', background:color, flexShrink:0,
          animation: isUp ? 'pulse-dot 2.5s ease-in-out infinite' : 'none',
        }} />
        <div style={{ flex:1 }}>
          <div style={{ fontSize:13, fontWeight:600, color }}>{status}</div>
          <div style={{ fontSize:11, color:'var(--muted)', marginTop:1 }}>
            {isUp ? 'All systems operational' : error ? 'Cannot reach backend' : 'Checking...'}
          </div>
        </div>
        <motion.span animate={{ opacity:[1,0.4,1] }} transition={{ duration:2, repeat:Infinity }}
          style={{ fontSize:9, color, fontFamily:'var(--mono)' }}>LIVE</motion.span>
      </div>

      {Object.entries(comps).map(([name, val]:any) => {
        const s = val?.status ?? 'UNKNOWN'
        const c = s === 'UP' ? 'var(--green)' : 'var(--red)'
        return (
          <div key={name} style={{
            display:'flex', alignItems:'center', justifyContent:'space-between',
            padding:'6px 0', borderBottom:'1px solid var(--border)', fontSize:12,
          }}>
            <span style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--muted2)' }}>{name}</span>
            <div style={{ display:'flex', alignItems:'center', gap:5 }}>
              <span style={{ width:5, height:5, borderRadius:'50%', background:c }} />
              <span style={{ fontSize:10, color:c }}>{s}</span>
            </div>
          </div>
        )
      })}

      {!isUp && (
        <div style={{ marginTop:12, fontSize:11, color:'var(--amber)' }}>
          Start: <code style={{ fontFamily:'var(--mono)' }}>mvn spring-boot:run</code>
        </div>
      )}
    </div>
  )
}
