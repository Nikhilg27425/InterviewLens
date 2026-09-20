import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'

import AppLayout from './components/AppLayout'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import Dashboard from './pages/Dashboard'
import Interviews from './pages/Interviews'
import InterviewDetails from './pages/InterviewDetails'
import LiveSession from './pages/LiveSession'
import CandidateInterview from './pages/CandidateInterview'
import CodeAnalysis from './pages/CodeAnalysis'
import Insights from './pages/Insights'

// Placeholder pages for sidebar links that don't have dedicated designs
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
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />

      {/* Candidate-facing route (no sidebar) */}
      <Route path="/interview" element={<CandidateInterview />} />

      {/* Live session (full-screen, uses app shell) */}
      <Route element={<AppLayout />}>
        <Route path="/live-session" element={<LiveSession />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/interviews" element={<Interviews />} />
        <Route path="/interviews/:id" element={<InterviewDetails />} />
        <Route path="/code-analysis" element={<CodeAnalysis />} />
        <Route path="/insights" element={<Insights />} />
        <Route path="/settings" element={<ComingSoon title="Settings" />} />
        <Route path="/help" element={<ComingSoon title="Help Center" />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
