import React, { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  Code2,
  BarChart3,
  Settings,
  HelpCircle,
  LogOut,
  BookOpen,
  CreditCard,
  Zap,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useSubscription } from '../contexts/SubscriptionContext'

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, to: '/dashboard' },
  { label: 'Interviews', icon: Users, to: '/interviews' },
  { label: 'Problem Bank', icon: BookOpen, to: '/problems' },
  { label: 'Code Analysis', icon: Code2, to: '/code-analysis' },
  { label: 'Insights', icon: BarChart3, to: '/insights' },
]

const bottomItems = [
  { label: 'Billing', icon: CreditCard, to: '/billing' },
  { label: 'Settings', icon: Settings, to: '/settings' },
  { label: 'Help Center', icon: HelpCircle, to: '/help' },
]

export default function Sidebar({ onUpgradeClick }) {
  const navigate = useNavigate()
  const { logout } = useAuth()
  const { tier, used, limit, percentUsed, isUnlimited, isExpired, loading } = useSubscription()

  const handleSignOut = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <aside className="fixed top-14 left-0 bottom-0 w-44 bg-white border-r border-gray-200 flex flex-col z-40">
      <nav className="flex-1 py-4 px-2 overflow-y-auto">
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

      {/* ── Usage indicator ── */}
      {!loading && !isUnlimited && (
        <div className="px-3 py-3 border-t border-gray-100">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-400">
              {isExpired ? 'Plan expired' : `${used} / ${limit}`}
            </span>
            <button
              onClick={onUpgradeClick}
              className="text-xs text-blue-500 hover:text-blue-700 transition-colors font-medium"
            >
              {isExpired ? 'Renew' : 'Upgrade'}
            </button>
          </div>
          {!isExpired && (
            <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  percentUsed >= 100 ? 'bg-red-500' :
                  percentUsed >= 80  ? 'bg-amber-400' :
                                       'bg-blue-400'
                }`}
                style={{ width: `${Math.min(percentUsed, 100)}%` }}
              />
            </div>
          )}
          {isExpired && (
            <div className="w-full h-1 bg-red-100 rounded-full">
              <div className="h-full w-full bg-red-400 rounded-full" />
            </div>
          )}
        </div>
      )}

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
