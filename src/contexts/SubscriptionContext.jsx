import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useAuth } from './AuthContext'
import { subscriptionAPI } from '../services/subscriptionAPI'

const SubscriptionContext = createContext(null)

export function SubscriptionProvider({ children }) {
  const { user, isAuthenticated } = useAuth()
  const [sub, setSub] = useState(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setSub(null)
      setLoading(false)
      return
    }
    try {
      const data = await subscriptionAPI.getMySubscription()
      setSub(data)
    } catch (e) {
      if (e.response?.status === 401) {
        setSub(null)
      }
      // Other errors: keep stale data, don't crash
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated, user])

  useEffect(() => {
    setLoading(true)
    refresh()
  }, [refresh])

  const value = {
    tier: sub?.tier ?? 'free',
    used: sub?.interviews_used ?? 0,
    limit: sub?.interviews_limit ?? 5,
    percentUsed: sub?.percent_used ?? 0,
    isUnlimited: sub?.is_unlimited ?? false,
    isExpired: sub?.is_expired ?? false,
    periodEnd: sub?.period_end ?? null,
    loading,
    refresh,
  }

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  )
}

export function useSubscription() {
  const ctx = useContext(SubscriptionContext)
  if (!ctx) throw new Error('useSubscription must be used within SubscriptionProvider')
  return ctx
}
