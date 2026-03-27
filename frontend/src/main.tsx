import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --bg:      #050a0f;
    --surface: #0a1020;
    --card:    #0d1525;
    --border:  #15243a;
    --border2: #1c3050;
    --accent:  #d97706;
    --blue:    #2563eb;
    --green:   #10b981;
    --red:     #ef4444;
    --amber:   #f59e0b;
    --fg:      #e2ecff;
    --muted:   #4a6080;
    --muted2:  #7a94b0;
    --radius:  4px;
    --mono:    'JetBrains Mono', monospace;
  }
  body {
    font-family: 'Inter', -apple-system, sans-serif;
    background: var(--bg); color: var(--fg); font-size:14px; line-height:1.5;
    -webkit-font-smoothing: antialiased;
  }
  ::-webkit-scrollbar { width:4px; }
  ::-webkit-scrollbar-track { background:transparent; }
  ::-webkit-scrollbar-thumb { background:var(--border2); border-radius:2px; }
  .mono { font-family:var(--mono); }
  .label { font-size:10px; text-transform:uppercase; letter-spacing:0.08em; color:var(--muted); font-weight:500; }
  table { border-collapse:collapse; width:100%; }
  th { padding:8px 12px; font-size:10px; text-transform:uppercase; letter-spacing:0.08em; color:var(--muted); text-align:left; border-bottom:1px solid var(--border); font-weight:500; }
  td { padding:9px 12px; border-bottom:1px solid var(--border); font-size:13px; }
  tr:hover td { background:rgba(255,255,255,0.012); }
  @keyframes pulse-dot { 0%,100% { opacity:1 } 50% { opacity:0.3 } }
  @keyframes ticker { from { transform:translateX(0) } to { transform:translateX(-50%) } }
`;
const s = document.createElement('style'); s.textContent = css;
document.head.appendChild(s);
document.title = 'JPM Quoter — Monitor';

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>)
