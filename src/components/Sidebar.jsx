import React from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  Code2,
  BarChart3,
  Settings,
  HelpCircle,
  LogOut,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, to: '/dashboard' },
  { label: 'Interviews', icon: Users, to: '/interviews' },
  { label: 'Code Analysis', icon: Code2, to: '/code-analysis' },
  { label: 'Insights', icon: BarChart3, to: '/insights' },
]

const bottomItems = [
  { label: 'Settings', icon: Settings, to: '/settings' },
  { label: 'Help Center', icon: HelpCircle, to: '/help' },
]

export default function Sidebar() {
  const navigate = useNavigate()
  const { logout } = useAuth()

  const handleSignOut = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <aside className="fixed top-14 left-0 bottom-0 w-44 bg-white border-r border-gray-200 flex flex-col z-40">
      <nav className="flex-1 py-4 px-2">
        <ul className="space-y-0.5">
          {navItems.map(({ label, icon: Icon, to }) => (
            <li key={to}>
              <NavLink
                to={to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`
                }
              >
                <Icon size={17} />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Bottom section */}
      <div className="py-4 px-2 border-t border-gray-100">
        <ul className="space-y-0.5">
          {bottomItems.map(({ label, icon: Icon, to }) => (
            <li key={to}>
              <NavLink
                to={to}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition-colors"
              >
                <Icon size={17} />
                {label}
              </NavLink>
            </li>
          ))}
          <li>
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 transition-colors"
            >
              <LogOut size={17} />
              Sign Out
            </button>
          </li>
        </ul>
      </div>
    </aside>
  )
}
