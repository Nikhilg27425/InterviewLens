import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'

import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import AppLayout from './components/AppLayout'

// ── Interviewer pages ──────────────────────────────────────────────────────
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import OAuthCallback from './pages/OAuthCallback'
import Dashboard from './pages/Dashboard'
import Interviews from './pages/Interviews'
import InterviewDetails from './pages/InterviewDetails'
import LiveSession from './pages/LiveSession'
import CodeAnalysis from './pages/CodeAnalysis'
import Insights from './pages/Insights'

// ── Candidate pages ────────────────────────────────────────────────────────
import CandidateLogin from './pages/candidate/CandidateLogin'
import CandidateWaitingRoom from './pages/candidate/CandidateWaitingRoom'
import CandidateInterviewPage from './pages/candidate/CandidateInterviewPage'
import CandidateSubmitted from './pages/candidate/CandidateSubmitted'

function ComingSoon({ title }) {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <p className="text-2xl font-bold text-gray-300 mb-2">{title}</p>
        <p className="text-gray-400 text-sm">Coming soon</p>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* ── Public / marketing ── */}
        <Route path="/" element={<LandingPage />} />

        {/* ── Interviewer auth ── */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/auth/callback" element={<OAuthCallback />} />

        {/* ── Candidate flow (standalone — no sidebar/navbar) ── */}
        <Route path="/candidate/login" element={<CandidateLogin />} />
        <Route path="/candidate/waiting-room" element={<CandidateWaitingRoom />} />
        <Route path="/candidate/interview" element={<CandidateInterviewPage />} />
        <Route path="/candidate/submitted" element={<CandidateSubmitted />} />

        {/* ── Interviewer app (with sidebar + navbar) - PROTECTED ── */}
        <Route element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/live-session" element={<LiveSession />} />
          <Route path="/interviews" element={<Interviews />} />
          <Route path="/interviews/:id" element={<InterviewDetails />} />
          <Route path="/code-analysis" element={<CodeAnalysis />} />
          <Route path="/insights" element={<Insights />} />
          <Route path="/settings" element={<ComingSoon title="Settings" />} />
          <Route path="/help" element={<ComingSoon title="Help Center" />} />
        </Route>

        {/* ── Fallback ── */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  )
}
