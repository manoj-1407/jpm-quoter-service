import { useState, useEffect } from 'react'
import { Toaster } from 'react-hot-toast'
import { motion } from 'framer-motion'
import CircuitBreaker from './components/CircuitBreaker'
import RequestChart   from './components/RequestChart'
import TokenGenerator from './components/TokenGenerator'
import QuoteTerminal  from './components/QuoteTerminal'
import HealthPanel    from './components/HealthPanel'
import { loadToken, getActuator } from './api/client'

type CBState = 'CLOSED' | 'OPEN' | 'HALF_OPEN' | 'UNKNOWN'

export default function App() {
  const [hasToken, setHasToken] = useState(!!loadToken())
  const [isLive,   setIsLive]   = useState(false)
  const [cbState,  setCbState]  = useState<CBState>('UNKNOWN')

  useEffect(() => {
    async function check() {
      try { await getActuator(); setIsLive(true); setCbState('CLOSED') }
      catch { setIsLive(false); setCbState('UNKNOWN') }
    }
    check()
    const id = setInterval(check, 5000)
    return () => clearInterval(id)
  }, [])

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)' }}>
      <Toaster position="top-right"
        toastOptions={{ style:{ background:'#0d1525', color:'#e2ecff', border:'1px solid #15243a', fontSize:13 } }} />

      <header style={{
        height:52, borderBottom:'1px solid var(--border)',
        background:'rgba(5,10,18,0.95)', backdropFilter:'blur(16px)',
        display:'flex', alignItems:'center', padding:'0 28px',
        position:'sticky', top:0, zIndex:100, gap:14,
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{
            width:26, height:26, background:'var(--accent)',
            display:'flex', alignItems:'center', justifyContent:'center',
          }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                 stroke="#000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize:13, fontWeight:600, letterSpacing:'-0.2px' }}>JPM Quoter</div>
            <div className="label">Monitoring Dashboard</div>
          </div>
        </div>

        <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ display:'flex', alignItems:'center', gap:5 }}>
            <span style={{
              width:6, height:6, borderRadius:'50%',
              background: isLive ? 'var(--green)' : 'var(--red)',
              animation:'pulse-dot 2.5s ease-in-out infinite',
            }} />
            <span style={{ fontSize:11, color: isLive ? 'var(--green)' : 'var(--red)' }}>
              {isLive ? 'Backend online' : 'Backend offline'}
            </span>
          </div>
          <span style={{ color:'var(--border)', fontSize:16 }}>|</span>
          <span style={{ fontSize:11, color: hasToken ? 'var(--amber)' : 'var(--muted)' }}>
            {hasToken ? 'Authenticated' : 'No token'}
          </span>
        </div>
      </header>

      <main style={{ padding:'28px 28px', maxWidth:1360, margin:'0 auto' }}>
        <motion.div initial={{ opacity:0, y:-12 }} animate={{ opacity:1, y:0 }} style={{ marginBottom:24 }}>
          <h1 style={{ fontSize:17, fontWeight:600, letterSpacing:'-0.4px' }}>
            Resilient Financial Quoter
          </h1>
          <p style={{ fontSize:12, color:'var(--muted)', marginTop:4 }}>
            Spring Boot 3.2 / Resilience4j / Kafka / JWT / Caffeine / HikariCP
          </p>
        </motion.div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1.4fr 2fr', gap:16, marginBottom:16 }}>
          {[HealthPanel, () => <CircuitBreaker state={cbState} />, () => <RequestChart isBackendLive={isLive} />].map((C,i) => (
            <motion.div key={i} initial={{ opacity:0, y:18 }} animate={{ opacity:1, y:0 }} transition={{ delay:i*0.07 }}>
              <C />
            </motion.div>
          ))}
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 2fr', gap:16 }}>
          <motion.div initial={{ opacity:0, y:18 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.22 }}>
            <TokenGenerator onToken={t => setHasToken(!!t)} />
          </motion.div>
          <motion.div initial={{ opacity:0, y:18 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.28 }}>
            <QuoteTerminal />
          </motion.div>
        </div>

        <div style={{ marginTop:32, paddingTop:16, borderTop:'1px solid var(--border)',
                      display:'flex', justifyContent:'space-between', fontSize:11, color:'var(--muted)' }}>
          <span>Java 17 / Spring Boot 3.2.5 / PostgreSQL 15 / Apache Kafka / Resilience4j</span>
          <a href="http://localhost:8080/swagger-ui.html" target="_blank" rel="noreferrer"
             style={{ color:'var(--amber)', textDecoration:'none' }}>
            Swagger UI
          </a>
        </div>
      </main>
    </div>
  )
}
