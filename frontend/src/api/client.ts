import axios from 'axios';

export const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080';
export const api  = axios.create({ baseURL: BASE });

export function setToken(t: string) {
  api.defaults.headers.common['Authorization'] = 'Bearer ' + t;
  localStorage.setItem('jpm_token', t);
}
export function loadToken() {
  const t = localStorage.getItem('jpm_token') ?? '';
  if (t) setToken(t);
  return t;
}
export function clearToken() {
  delete api.defaults.headers.common['Authorization'];
  localStorage.removeItem('jpm_token');
}

export async function fetchToken(clientId: string, secret: string): Promise<string> {
  const r = await api.post('/auth/token', { clientId, secret });
  const t = r.data.token ?? r.data.access_token ?? r.data.jwt ?? '';
  setToken(t);
  return t;
}

export const getQuote        = (symbol: string) => api.get('/quotes/' + symbol).then(r => r.data);
export const fetchQuote      = (symbol: string) => api.post('/quotes/fetch/' + symbol).then(r => r.data);
export const postQuote       = (body: object)   => api.post('/quotes', body).then(r => r.data);
export const getActuator     = ()               => api.get('/actuator/health').then(r => r.data);
export const getCircuitState = ()               => api.get('/actuator/circuitbreakers').then(r => r.data).catch(() => null);
export const getMetrics      = (name: string)   => api.get('/actuator/metrics/' + name).then(r => r.data).catch(() => null);
