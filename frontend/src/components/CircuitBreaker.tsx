import { motion, AnimatePresence } from 'framer-motion'

type State = 'CLOSED' | 'OPEN' | 'HALF_OPEN' | 'UNKNOWN'

const META: Record<State, { color:string; desc:string }> = {
  CLOSED:    { color:'var(--green)', desc:'All requests passing through' },
  OPEN:      { color:'var(--red)',   desc:'Tripped — fallback active'    },
  HALF_OPEN: { color:'var(--amber)', desc:'Recovery probe in progress'   },
  UNKNOWN:   { color:'var(--muted)', desc:'State unavailable'            },
}

const STATES: State[] = ['CLOSED', 'HALF_OPEN', 'OPEN']

interface Props { state: State; name?: string }

export default function CircuitBreaker({ state, name='priceService' }: Props) {
  const { color, desc } = META[state] ?? META.UNKNOWN

  return (
    <div style={{ background:'var(--surface)', border:'1px solid var(--border)', padding:20, height:'100%' }}>
      <div className="label" style={{ marginBottom:16 }}>Circuit Breaker — {name}</div>

      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:0, marginBottom:20 }}>
        {STATES.map((s, i) => {
          const m  = META[s]
          const on = state === s
          return (
            <div key={s} style={{ display:'flex', alignItems:'center' }}>
              <motion.div
                animate={{ boxShadow: on ? `0 0 16px ${m.color}55` : 'none' }}
                transition={{ duration:0.4 }}
                style={{
                  width:68, height:68, borderRadius:'50%',
                  border:`2px solid ${on ? m.color : 'var(--border)'}`,
                  background: on ? `${m.color}14` : 'var(--card)',
                  display:'flex', flexDirection:'column', alignItems:'center',
                  justifyContent:'center', gap:4,
                }}>
                <span style={{
                  width:8, height:8, borderRadius:'50%',
                  background: on ? m.color : 'var(--border)',
                }} />
                <span style={{ fontSize:8.5, fontWeight:600, letterSpacing:'0.06em',
                               textTransform:'uppercase', color: on ? m.color : 'var(--muted)' }}>
                  {s.replace('_',' ')}
                </span>
              </motion.div>
              {i < STATES.length-1 && (
                <div style={{ width:28, height:1, background:'var(--border)', position:'relative' }}>
                  <span style={{ position:'absolute', top:-6, right:2, fontSize:8, color:'var(--muted)' }}>›</span>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={state}
          initial={{ opacity:0, y:4 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}
          style={{
            padding:'10px 14px', background:`${color}0a`,
            border:`1px solid ${color}22`, display:'flex', alignItems:'center', gap:8,
          }}>
          <span style={{ width:6, height:6, borderRadius:'50%', background:color, flexShrink:0 }} />
          <div>
            <div style={{ fontSize:12, fontWeight:600, color }}>{state}</div>
            <div style={{ fontSize:11, color:'var(--muted)', marginTop:1 }}>{desc}</div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
