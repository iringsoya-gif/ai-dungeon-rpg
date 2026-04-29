const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'

export function getToken() {
  return localStorage.getItem('token')
}

async function request(path, options = {}) {
  const token = getToken()
  const headers = { 'Content-Type': 'application/json', ...options.headers }
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(`${API_URL}${path}`, { ...options, headers })
  if (!res.ok) {
    const body = await res.text()
    let detail
    try { detail = JSON.parse(body) } catch { detail = body }
    throw detail
  }
  return res
}

export const api = {
  get:    (path)         => request(path),
  post:   (path, body)   => request(path, { method: 'POST', body: JSON.stringify(body) }),
  delete: (path)         => request(path, { method: 'DELETE' }),
  getMe:  ()             => api.get('/auth/me').then(r => r.json()),
  loginUrl: ()           => `${API_URL}/auth/login`,

  // 게임
  createGame:  (payload) => api.post('/games', payload).then(r => r.json()),
  listGames:   ()        => api.get('/games').then(r => r.json()),
  getGame:     (id)      => api.get(`/games/${id}`).then(r => r.json()),
  deleteGame:  (id)      => api.delete(`/games/${id}`),
  completeGame: (id)     => request(`/games/${id}/complete`, { method: 'POST' }).then(r => r.json()),
  getStory:    (id)      => fetch(`${API_URL}/games/${id}/story`).then(r => r.ok ? r.json() : Promise.reject(r.status)),

  // 결제
  checkout:       ()              => api.post('/payment/checkout').then(r => r.json()),
  verifyCheckout: (checkout_id)   => api.post('/payment/verify', { checkout_id }).then(r => r.json()),
  syncPlan:       ()              => api.post('/payment/sync').then(r => r.json()),
  payStatus:      ()              => api.get('/payment/status').then(r => r.json()),
}

export { API_URL }