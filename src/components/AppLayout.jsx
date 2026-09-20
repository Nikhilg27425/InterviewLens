import React from 'react'
import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'
import Sidebar from './Sidebar'

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <Sidebar />
      <main className="ml-44 mt-14 min-h-[calc(100vh-3.5rem)]">
        <Outlet />
      </main>
    </div>
  )
}
