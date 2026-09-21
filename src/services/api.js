/**
 * Axios API client — all requests go through here.
 * Base URL: http://localhost:8000 (FastAPI backend)
 * JWT is stored in localStorage and injected via interceptor.
 */
import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
})

// ── Request: inject JWT ───────────────────────────────────────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// ── Response: handle 401 globally ────────────────────────────────────────────
api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('access_token')
      localStorage.removeItem('user')
      // Let the component handle the redirect
    }
    return Promise.reject(err)
  }
)

// ─────────────────────────────────────────────────────────────────────────────
// Auth
// ─────────────────────────────────────────────────────────────────────────────

export const authAPI = {
  registerInterviewer: (data)        => api.post('/api/auth/register', data),
  loginInterviewer:    (email, pass)  => api.post('/api/auth/login', { email, password: pass }),
  loginCandidate:      (email, token) => api.post('/api/auth/candidate/login', { email, access_token: token }),
  me:                  ()             => api.get('/api/auth/me'),
}

// ─────────────────────────────────────────────────────────────────────────────
// Problems
// ─────────────────────────────────────────────────────────────────────────────

export const problemsAPI = {
  list:        ()    => api.get('/api/problems'),
  get:         (id)  => api.get(`/api/problems/${id}`),
  getBySlug:   (slug)=> api.get(`/api/problems/slug/${slug}`),
  create:      (data)=> api.post('/api/problems', data),
  delete:      (id)  => api.delete(`/api/problems/${id}`),
}

// ─────────────────────────────────────────────────────────────────────────────
// Sessions
// ─────────────────────────────────────────────────────────────────────────────

export const sessionsAPI = {
  list:         ()         => api.get('/api/sessions'),
  create:       (data)     => api.post('/api/sessions', data),
  get:          (id)       => api.get(`/api/sessions/${id}`),
  update:       (id, data) => api.patch(`/api/sessions/${id}`, data),
  start:        (id)       => api.post(`/api/sessions/${id}/start`),
  end:          (id)       => api.post(`/api/sessions/${id}/end`),
  getByToken:   (token)    => api.get(`/api/sessions/by-token/${token}`),
}

// ─────────────────────────────────────────────────────────────────────────────
// Code execution (submissions)
// ─────────────────────────────────────────────────────────────────────────────

export const submissionsAPI = {
  run: (data) => api.post('/api/submissions/run', data),
  runCustom: (sessionId, language, sourceCode, stdin) =>
    api.post('/api/submissions/run-custom', null, {
      params: { session_id: sessionId, language, source_code: sourceCode, stdin },
    }),
  listForSession: (sessionId) => api.get(`/api/submissions/session/${sessionId}`),
}

// ─────────────────────────────────────────────────────────────────────────────
// Proctoring signals
// ─────────────────────────────────────────────────────────────────────────────

export const signalsAPI = {
  record:          (data)      => api.post('/api/signals', data),
  batch:           (signals)   => api.post('/api/signals/batch', { signals }),
  forSession:      (sessionId) => api.get(`/api/signals/session/${sessionId}`),
  summaryForSession: (sessionId) => api.get(`/api/signals/session/${sessionId}/summary`),
}

// ─────────────────────────────────────────────────────────────────────────────
// Analytics
// ─────────────────────────────────────────────────────────────────────────────

export const analyticsAPI = {
  saveSnapshot:    (data)      => api.post('/api/analytics/snapshot', data),
  timeline:        (sessionId) => api.get(`/api/analytics/session/${sessionId}/timeline`),
  similarity:      (sessionId) => api.get(`/api/analytics/session/${sessionId}/similarity`),
  score:           (sessionId) => api.get(`/api/analytics/session/${sessionId}/score`),
  runSimilarity:   (sessionId, problemId, language, sourceCode) =>
    api.post(`/api/analytics/session/${sessionId}/similarity/run`, null, {
      params: { problem_id: problemId, language, source_code: sourceCode },
    }),
}

export default api
