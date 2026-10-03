import React, { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Logo from '../components/Logo'
import { useAuth } from '../contexts/AuthContext'
import { BASE_URL } from '../services/api'

/**
 * OAuth lands here twice:
 *   1. From Google/GitHub with ?code=&state=<provider> — hand the code to the
 *      backend, which exchanges it and redirects back here…
 *   2. …with ?token=&user_id=&full_name=&role= — store the session.
 */
export default function OAuthCallback() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [searchParams] = useSearchParams()
  const [error, setError] = useState('')
  const handled = useRef(false)

  useEffect(() => {
    if (handled.current) return
    handled.current = true

    const fail = (message) => {
      setError(message)
      setTimeout(() => navigate('/login', { replace: true }), 3000)
    }

    const errorParam = searchParams.get('error')
    if (errorParam) {
      fail(`Authentication failed: ${searchParams.get('error_description') || errorParam}`)
      return
    }

    const code = searchParams.get('code')
    const state = searchParams.get('state')
    if (code && state) {
      const params = new URLSearchParams({ code, state })
      window.location.replace(`${BASE_URL}/api/auth/oauth/callback?${params}`)
      return
    }

    const token = searchParams.get('token')
    if (!token) {
      fail('No authentication token received')
      return
    }

    login(token, {
      id: searchParams.get('user_id'),
      full_name: searchParams.get('full_name'),
      role: searchParams.get('role'),
    })
    navigate('/dashboard', { replace: true })
  }, [searchParams, navigate, login])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="mb-6 flex justify-center">
          <Logo size="lg" />
        </div>
        
        {error ? (
          <div className="space-y-4">
            <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900">Authentication Failed</h2>
            <p className="text-gray-600 max-w-md">{error}</p>
            <p className="text-sm text-gray-500">Redirecting to login page...</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="w-16 h-16 mx-auto">
              <svg className="animate-spin h-16 w-16 text-blue-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900">Completing Sign In...</h2>
            <p className="text-gray-600">Please wait while we authenticate your account.</p>
          </div>
        )}
      </div>
    </div>
  )
}
