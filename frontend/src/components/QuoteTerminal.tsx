import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { getQuote, fetchQuote, postQuote } from '../api/client'

type Quote = { symbol:string; price:string; source:string; ts:string; cached?:boolean }

const SYMS = ['AAPL','GOOGL','MSFT','AMZN','TSLA','NVDA','JPM']

export default function QuoteTerminal() {
  const [sym,    setSym]    = useState('AAPL')
  const [price,  setPrice]  = useState('')
  const [hist,   setHist]   = useState<Quote[]>([])
  const [busy,   setBusy]   = useState<string|null>(null)
  const [logs,   setLogs]   = useState<string[]>(['// Event log — waiting'])

  const log = (m:string) => setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${m}`, ...prev.slice(0,24)])
  const add = (q:Quote)  => setHist(prev => [q, ...prev.slice(0,19)])

  async function handleGet() {
    setBusy('get')
    try {
      const r = await getQuote(sym)
      const q = { symbol:sym, price:String(r.price??r.lastPrice??'—'), source:'GET', ts:new Date().toLocaleTimeString(), cached:true }
      add(q); log(`QUOTE_READ symbol=${sym} price=${q.price}`)
      toast.success(`${sym} — $${q.price}`)
    } catch(e:any) {
      toast.error(e?.response?.data?.message ?? 'Not found')
      log(`ERROR GET /quotes/${sym}`)
    } finally { setBusy(null) }
  }

  async function handleFetch() {
    setBusy('fetch')
    try {
      const r = await fetchQuote(sym)
      const q = { symbol:sym, price:String(r.price??r.lastPrice??'—'), source:'FETCH', ts:new Date().toLocaleTimeString() }
      add(q)
      log(`QUOTE_FETCHED symbol=${sym} price=${q.price}`)
      log(`KAFKA_PUBLISHED topic=quote-events key=${sym}`)
      toast.success(`Fetched — $${q.price}`)
    } catch(e:any) {
      toast.error(e?.response?.data?.message ?? 'Fetch failed')
      log(`CIRCUIT_OPEN provider=MockPriceProvider`)
    } finally { setBusy(null) }
  }

  async function handlePost() {
    if (!price) { toast.error('Enter price'); return }
    setBusy('post')
    try {
      const r = await postQuote({ symbol:sym, lastPrice:parseFloat(price) })
      const q = { symbol:r.symbol??sym, price:String(r.lastPrice??price), source:'POST', ts:new Date().toLocaleTimeString() }
      add(q)
      log(`QUOTE_CREATED symbol=${q.symbol} price=${q.price}`)
      log(`KAFKA_PUBLISHED topic=quote-events key=${q.symbol}`)
      toast.success('Quote created')
      setPrice('')
    } catch(e:any) {
      toast.error(e?.response?.data?.error ?? 'Failed')
      log(`VALIDATION_FAIL symbol=${sym}`)
    } finally { setBusy(null) }
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      <div style={{ background:'var(--surface)', border:'1px solid var(--border)', padding:20 }}>
        <div className="label" style={{ marginBottom:14 }}>Quote Operations</div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr auto', gap:10, marginBottom:14 }}>
          <div>
            <label className="label" style={{ display:'block', marginBottom:5 }}>Symbol</label>
            <input value={sym} onChange={e => setSym(e.target.value.toUpperCase())}
              list="syms" maxLength={8}
              style={{
                width:'100%', padding:'8px 10px', fontSize:13,
                background:'var(--card)', border:'1px solid var(--border)',
                color:'var(--fg)', outline:'none', fontFamily:'var(--mono)',
                transition:'border-color 0.15s',
              }}
              onFocus={e => { e.target.style.borderColor = 'var(--accent)' }}
              onBlur={e  => { e.target.style.borderColor = 'var(--border)' }} />
            <datalist id="syms">{SYMS.map(s => <option key={s} value={s} />)}</datalist>
          </div>
          <div>
            <label className="label" style={{ display:'block', marginBottom:5 }}>Price (POST)</label>
            <input type="number" value={price} onChange={e => setPrice(e.target.value)}
              placeholder="182.50" min="0.01"
              style={{
                width:'100%', padding:'8px 10px', fontSize:13,
                background:'var(--card)', border:'1px solid var(--border)',
                color:'var(--fg)', outline:'none', fontFamily:'var(--mono)',
                transition:'border-color 0.15s',
              }}
              onFocus={e => { e.target.style.borderColor = 'var(--accent)' }}
              onBlur={e  => { e.target.style.borderColor = 'var(--border)' }} />
          </div>
          <div style={{ display:'flex', alignItems:'flex-end', gap:6 }}>
            {[
              { label:'GET',   action:handleGet,   key:'get',   color:'var(--blue)'  },
              { label:'FETCH', action:handleFetch, key:'fetch', color:'#8b5cf6'       },
              { label:'POST',  action:handlePost,  key:'post',  color:'var(--green)' },
            ].map(b => (
              <button key={b.key} onClick={b.action} disabled={busy !== null}
                style={{
                  padding:'8px 12px', fontSize:11, fontWeight:600, fontFamily:'inherit',
                  background:'var(--card)', border:`1px solid ${b.color}33`,
                  color: busy===b.key ? 'var(--muted)' : b.color,
                  cursor: busy ? 'not-allowed' : 'pointer', transition:'background 0.15s',
                }}>
                {busy===b.key ? '...' : b.label}
              </button>
            ))}
          </div>
        </div>

        {hist.length > 0 && (
          <div>
            <div className="label" style={{ marginBottom:8 }}>History</div>
            <div style={{ maxHeight:200, overflowY:'auto' }}>
              <table>
                <thead>
                  <tr><th>Symbol</th><th>Price</th><th>Source</th><th>Time</th></tr>
                </thead>
                <tbody>
                  <AnimatePresence>
                    {hist.map((q,i) => (
                      <motion.tr key={i} initial={{ opacity:0, x:-6 }} animate={{ opacity:1, x:0 }}>
                        <td style={{ fontFamily:'var(--mono)', fontWeight:700, color:'var(--amber)' }}>{q.symbol}</td>
                        <td style={{ fontFamily:'var(--mono)', fontWeight:600 }}>${q.price}</td>
                        <td style={{ fontSize:11,
                          color: q.cached ? 'var(--blue)' : q.source==='POST' ? 'var(--green)' : '#8b5cf6' }}>
                          {q.source}
                        </td>
                        <td style={{ fontSize:11, color:'var(--muted)' }}>{q.ts}</td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <div style={{ background:'var(--surface)', border:'1px solid var(--border)', padding:20 }}>
        <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:12 }}>
          <span style={{ width:6, height:6, borderRadius:'50%', background:'var(--green)', animation:'pulse-dot 2s ease-in-out infinite' }} />
          <div className="label">Kafka Event Log</div>
          <button onClick={() => setLogs(['// cleared'])}
            style={{ marginLeft:'auto', padding:'2px 8px', fontSize:10, fontFamily:'inherit',
                     background:'transparent', border:'1px solid var(--border)', color:'var(--muted)', cursor:'pointer' }}>
            Clear
          </button>
        </div>
        <div style={{ height:160, overflowY:'auto', fontFamily:'var(--mono)', fontSize:11, lineHeight:2 }}>
          {logs.map((l,i) => (
            <div key={i} style={{ color:
              l.includes('ERROR')||l.includes('FAIL')||l.includes('CIRCUIT') ? 'var(--red)' :
              l.includes('KAFKA') ? 'var(--green)' :
              l.includes('//') ? 'var(--muted)' : 'var(--muted2)' }}>
              {l}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
