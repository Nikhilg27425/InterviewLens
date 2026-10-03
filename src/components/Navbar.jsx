import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Bell, HelpCircle, Search, ChevronDown } from 'lucide-react'
import Logo from './Logo'
import { useAuth } from '../contexts/AuthContext'

export default function Navbar() {
  const navigate = useNavigate()
  const { logout, user } = useAuth()
  const initials = (user?.full_name || user?.email || '?')
    .split(/[\s@]/).filter(Boolean).map((w) => w[0]).join('').slice(0, 2).toUpperCase()
  const [dropdownOpen, setDropdownOpen] = useState(false)

  const handleSignOut = () => {
    setDropdownOpen(false)
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-14 bg-white border-b border-gray-200 flex items-center px-4 gap-4">
      {/* Logo */}
      <div className="w-44 flex-shrink-0">
        <Link to="/dashboard">
          <Logo size="md" />
        </Link>
      </div>

      {/* Search */}
      <div className="flex-1 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
          <input
            type="text"
            placeholder="Search candidates, interviews..."
            className="w-full pl-9 pr-4 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      <div className="flex-1" />

      {/* Right actions */}
      <div className="flex items-center gap-3">
        <button className="text-gray-500 hover:text-gray-700 p-1.5 rounded-lg hover:bg-gray-100">
          <HelpCircle size={18} />
        </button>
        <button className="relative text-gray-500 hover:text-gray-700 p-1.5 rounded-lg hover:bg-gray-100">
          <Bell size={18} />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
        </button>

        {/* Avatar */}
        <div className="relative">
          <button
            className="flex items-center gap-1"
            onClick={() => setDropdownOpen(!dropdownOpen)}
          >
            <div
              title={user?.full_name || ''}
              className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-white text-xs font-semibold"
            >
              {initials}
            </div>
            <ChevronDown size={14} className="text-gray-500" />
          </button>
          {dropdownOpen && (
            <div className="absolute right-0 mt-1 w-44 bg-white border border-gray-200 rounded-xl shadow-lg py-1 z-50">
              <div className="px-4 py-2">
                <p className="text-sm font-semibold text-gray-900 truncate">{user?.full_name}</p>
                {user?.email && <p className="text-xs text-gray-400 truncate">{user.email}</p>}
              </div>
              <Link
                to="/settings"
                onClick={() => setDropdownOpen(false)}
                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                Settings
              </Link>
              <hr className="my-1 border-gray-100" />
              <button
                className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-gray-50"
                onClick={handleSignOut}
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
