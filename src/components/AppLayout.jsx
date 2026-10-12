import React, { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'
import Sidebar from './Sidebar'
import UpgradeModal from './UpgradeModal'

export default function AppLayout() {
  const [upgradeOpen, setUpgradeOpen] = useState(false)

  // Listen for 402 events fired by the Axios interceptor
  useEffect(() => {
    const handler = () => setUpgradeOpen(true)
    window.addEventListener('interviewLimitReached', handler)
    window.addEventListener('openUpgradeModal', handler)
    return () => {
      window.removeEventListener('interviewLimitReached', handler)
      window.removeEventListener('openUpgradeModal', handler)
    }
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <Sidebar onUpgradeClick={() => setUpgradeOpen(true)} />
      <main className="ml-44 mt-14 min-h-[calc(100vh-3.5rem)]">
        <Outlet />
      </main>
      <UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} />
    </div>
  )
}
