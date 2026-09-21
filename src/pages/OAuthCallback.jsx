import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Logo from '../components/Logo'

export default function OAuthCallback() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [error, setError] = useState('')

  useEffect(() => {
    const handleCallback = async () => {
      // Check for error from backend
      const errorParam = searchParams.get('error')
      if (errorParam) {
        setError(`Authentication failed: ${errorParam}`)
        setTimeout(() => navigate('/login'), 3000)
        return
      }

      // Get token from URL (sent by backend after OAuth)
      const token = searchParams.get('token')
      const userId = searchParams.get('user_id')
      const fullName = searchParams.get('full_name')
      const role = searchParams.get('role')

      if (!token) {
        setError('No authentication token received')
        setTimeout(() => navigate('/login'), 3000)
        return
      }

      try {
        // Store authentication data
        localStorage.setItem('access_token', token)
        localStorage.setItem('user', JSON.stringify({ 
          id: userId, 
          name: fullName, 
          role: role 
        }))
        
        // Redirect to dashboard
        navigate('/dashboard')
      } catch (err) {
        console.error('Error storing auth data:', err)
        setError('Authentication failed. Please try again.')
        setTimeout(() => navigate('/login'), 3000)
      }
    }

    handleCallback()
  }, [searchParams, navigate])

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
