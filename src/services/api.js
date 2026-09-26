/**
 * Axios API client — all requests go through here.
 * Base URL: http://localhost:8000 (FastAPI backend)
 *
 * Tokens:
 *   interviewer — localStorage   (shared across tabs, survives reloads)
 *   candidate   — sessionStorage (per tab, so a candidate tab never clobbers
 *                                 an interviewer logged in on the same browser)
 */
import axios from 'axios'

// Production builds are served by the backend itself, so '' (same origin) is the default there
export const BASE_URL = import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? 'http://localhost:8000' : '')

/** WebSocket origin: explicit VITE_WS_URL, else derived from the API origin or the page. */
export const WS_BASE = import.meta.env.VITE_WS_URL ||
  (BASE_URL
    ? BASE_URL.replace(/^http/, 'ws')
    : `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}`)

// ── Candidate session (per tab) ──────────────────────────────────────────────

const CANDIDATE_KEYS = ['candidate_token', 'candidate_user', 'session_id', 'session_token']

export const candidateSession = {
  save({ token, user, sessionId, accessToken }) {
    sessionStorage.setItem('candidate_token', token)
    sessionStorage.setItem('candidate_user', JSON.stringify(user))
    sessionStorage.setItem('session_id', sessionId)
    sessionStorage.setItem('session_token', accessToken)
  },
  get token()       { return sessionStorage.getItem('candidate_token') },
  get sessionId()   { return sessionStorage.getItem('session_id') },
  get accessToken() { return sessionStorage.getItem('session_token') },
  get user() {
    try { return JSON.parse(sessionStorage.getItem('candidate_user')) } catch { return null }
  },
  clear() { CANDIDATE_KEYS.forEach((k) => sessionStorage.removeItem(k)) },
}

/** The JWT to use for requests from this tab. */
export function getAuthToken() {
  return candidateSession.token || localStorage.getItem('access_token')
}

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
})

// ── Request: inject JWT ───────────────────────────────────────────────────────
api.interceptors.request.use((config) => {
  const token = getAuthToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// ── Response: handle 401 globally ────────────────────────────────────────────
api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      // Clear only the credential this tab was using; let the component redirect
      if (candidateSession.token) {
        candidateSession.clear()
      } else {
        localStorage.removeItem('access_token')
        localStorage.removeItem('user')
      }
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
  updateMe:            (data)         => api.patch('/api/auth/me', data),
  changePassword:      (current, next) => api.post('/api/auth/change-password', { current_password: current, new_password: next }),
  
  // OAuth methods - These return URLs for redirecting to OAuth providers
  googleLogin:         ()             => `${BASE_URL}/api/auth/google/login`,
  githubLogin:         ()             => `${BASE_URL}/api/auth/github/login`,
}

// ─────────────────────────────────────────────────────────────────────────────
// Problems
// ─────────────────────────────────────────────────────────────────────────────

export const problemsAPI = {
  list:        ()    => api.get('/api/problems'),
  get:         (id)  => api.get(`/api/problems/${id}`),
  getBySlug:   (slug)=> api.get(`/api/problems/slug/${slug}`),
  create:      (data)=> api.post('/api/problems', data),
  update:      (id, data) => api.put(`/api/problems/${id}`, data),
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
  join:         (id)       => api.post(`/api/sessions/${id}/join`),
  cancel:       (id)       => api.post(`/api/sessions/${id}/cancel`),
  resendInvite: (id)       => api.post(`/api/sessions/${id}/invite`),
  invitePreview:(id)       => api.get(`/api/sessions/${id}/invite-preview`),
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
  overview:        ()          => api.get('/api/analytics/overview'),
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

/** Readable message from an axios error (FastAPI `detail` string or validation list). */
export function apiErrorMessage(err, fallback = 'Something went wrong.') {
  const detail = err?.response?.data?.detail
  if (Array.isArray(detail)) return detail.map((d) => d.msg?.replace(/^Value error, /, '')).join('. ')
  if (typeof detail === 'string') return detail
  if (err && !err.response) return 'Cannot reach the server. Make sure the backend is running.'
  return fallback
}
