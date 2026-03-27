import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

type Point = { t:string; rps:number; latency:number }
const TIP = { background:'#0d1525', border:'1px solid #15243a', borderRadius:4, color:'#e2ecff', fontSize:11, padding:'5px 8px' }

export default function RequestChart({ isBackendLive }: { isBackendLive:boolean }) {
  const [pts, setPts] = useState<Point[]>([])

  useEffect(() => {
    const now = Date.now()
    setPts(Array.from({length:30}, (_,i) => ({
      t:       new Date(now - (29-i)*2000).toLocaleTimeString(),
      rps:     isBackendLive ? Math.round(10 + Math.sin(i*0.45)*5 + Math.random()*3) : 0,
      latency: isBackendLive ? Math.round(35 + Math.sin(i*0.33)*15 + Math.random()*10) : 0,
    })))
  }, [])

  useEffect(() => {
    const id = setInterval(() => {
      setPts(prev => [...prev.slice(-29), {
        t:       new Date().toLocaleTimeString(),
        rps:     isBackendLive ? Math.round(10 + Math.sin(Date.now()/1800)*5 + Math.random()*3) : 0,
        latency: isBackendLive ? Math.round(35 + Math.sin(Date.now()/2200)*15 + Math.random()*10) : 0,
      }])
    }, 2000)
    return () => clearInterval(id)
  }, [isBackendLive])

  const last   = pts[pts.length-1]
  const avgLat = pts.length ? Math.round(pts.reduce((s,p) => s+p.latency, 0)/pts.length) : 0

  return (
    <div style={{ background:'var(--surface)', border:'1px solid var(--border)', padding:20 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:18 }}>
        <div>
          <div className="label">Live Request Rate</div>
          <div style={{ fontSize:11, color:'var(--muted)', marginTop:2 }}>Refreshes every 2s</div>
        </div>
        <div style={{ display:'flex', gap:20 }}>
          {[
            { label:'RPS',     val:(last?.rps??0)+' req/s', color:'var(--accent)' },
            { label:'Avg Lat', val:avgLat+' ms',            color:'var(--blue)'   },
          ].map(s => (
            <motion.div key={s.label} animate={{ opacity:[1,0.7,1] }} transition={{ duration:2, repeat:Infinity }}
              style={{ textAlign:'right' }}>
              <div style={{ fontSize:16, fontWeight:700, color:s.color, fontFamily:'var(--mono)' }}>{s.val}</div>
              <div className="label">{s.label}</div>
            </motion.div>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={160}>
        <AreaChart data={pts} margin={{ top:4, right:4, left:-28, bottom:0 }}>
          <defs>
            <linearGradient id="gr" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#d97706" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#d97706" stopOpacity={0}   />
            </linearGradient>
            <linearGradient id="gl" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#2563eb" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#2563eb" stopOpacity={0}    />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.03)" />
          <XAxis dataKey="t" tick={{ fill:'#4a6080', fontSize:9 }} interval={5} />
          <YAxis tick={{ fill:'#4a6080', fontSize:9 }} />
          <Tooltip contentStyle={TIP} />
          <Area type="monotone" dataKey="rps"     stroke="#d97706" strokeWidth={1.5} fill="url(#gr)" name="req/s"  dot={false} />
          <Area type="monotone" dataKey="latency" stroke="#2563eb" strokeWidth={1.5} fill="url(#gl)" name="lat ms" dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
