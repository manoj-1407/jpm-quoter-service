import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { fetchToken, clearToken, loadToken } from '../api/client'

interface Props { onToken: (t: string) => void }

export default function TokenGenerator({ onToken }: Props) {
  const [clientId, setClientId] = useState('client1')
  const [secret,   setSecret]   = useState('')
  const [token,    setToken]     = useState(loadToken)
  const [busy,     setBusy]      = useState(false)

  async function generate() {
    if (!secret) { toast.error('Enter secret'); return }
    setBusy(true)
    try {
      const t = await fetchToken(clientId, secret)
      setToken(t); onToken(t)
      toast.success('JWT generated')
    } catch {
      toast.error('Auth failed')
    } finally { setBusy(false) }
  }

  function copy() { navigator.clipboard.writeText(token); toast.success('Copied') }
  function revoke() { clearToken(); setToken(''); onToken(''); toast('Token cleared') }

  let preview: string | null = null
  if (token) {
    try {
      const p = JSON.parse(atob(token.split('.')[1]))
      const e = p.exp ? new Date(p.exp*1000).toLocaleTimeString() : 'n/a'
      preview = `sub: ${p.sub ?? p.clientId ?? '?'}  ·  exp: ${e}`
    } catch {}
  }

  return (
    <div style={{ background:'var(--surface)', border:'1px solid var(--border)', padding:20, height:'100%' }}>
      <div className="label" style={{ marginBottom:16 }}>JWT Generator</div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:12 }}>
        {[
          { label:'Client ID', val:clientId, set:setClientId, type:'text',     ph:'client1'  },
          { label:'Secret',    val:secret,   set:setSecret,   type:'password', ph:'••••••••' },
        ].map(({label,val,set,type,ph}) => (
          <div key={label}>
            <label className="label" style={{ display:'block', marginBottom:5 }}>{label}</label>
            <input type={type} value={val} placeholder={ph}
              onChange={e => set(e.target.value)}
              onKeyDown={e => e.key==='Enter' && generate()}
              style={{
                width:'100%', padding:'8px 10px', fontSize:12,
                background:'var(--card)', border:'1px solid var(--border)',
                color:'var(--fg)', outline:'none', fontFamily:'inherit',
                transition:'border-color 0.15s',
              }}
              onFocus={e => { e.target.style.borderColor = 'var(--accent)' }}
              onBlur={e  => { e.target.style.borderColor = 'var(--border)' }} />
          </div>
        ))}
      </div>

      <button onClick={generate} disabled={busy}
        style={{
          width:'100%', padding:'9px', fontSize:12, fontWeight:600, fontFamily:'inherit',
          background: busy ? 'var(--card)' : 'var(--accent)',
          border:'1px solid var(--border)', color: busy ? 'var(--muted)' : '#000',
          cursor: busy ? 'not-allowed' : 'pointer', transition:'background 0.15s',
        }}>
        {busy ? 'Requesting...' : 'Generate JWT'}
      </button>

      <AnimatePresence>
        {token && (
          <motion.div initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:'auto' }} exit={{ opacity:0, height:0 }}
            style={{ marginTop:12 }}>
            <div style={{
              padding:'10px 12px', background:'var(--card)', border:'1px solid var(--border)', marginBottom:8,
            }}>
              <div className="label" style={{ marginBottom:6 }}>Token Preview</div>
              <code style={{ fontSize:10, color:'var(--amber)', fontFamily:'var(--mono)', wordBreak:'break-all', lineHeight:1.6 }}>
                {token.slice(0,72)}…
              </code>
              {preview && <div style={{ fontSize:11, color:'var(--muted)', marginTop:6 }}>{preview}</div>}
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={copy} style={{
                flex:1, padding:'7px', fontSize:11, fontWeight:500, fontFamily:'inherit',
                background:'var(--card)', border:'1px solid var(--border)',
                color:'var(--amber)', cursor:'pointer', transition:'background 0.15s',
              }}>Copy token</button>
              <button onClick={revoke} style={{
                flex:1, padding:'7px', fontSize:11, fontWeight:500, fontFamily:'inherit',
                background:'var(--card)', border:'1px solid rgba(239,68,68,0.2)',
                color:'rgba(239,68,68,0.7)', cursor:'pointer', transition:'background 0.15s',
              }}>Revoke</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
