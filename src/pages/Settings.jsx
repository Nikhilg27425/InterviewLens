import React, { useEffect, useState } from 'react'
import { CheckCircle, Loader, AlertTriangle, User, Lock } from 'lucide-react'
import { authAPI, apiErrorMessage } from '../services/api'
import { useAuth } from '../contexts/AuthContext'

const card = 'bg-white rounded-2xl border border-gray-100 p-6'
const input = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

function Status({ state }) {
  if (!state) return null
  return state.ok ? (
    <span className="flex items-center gap-1.5 text-sm text-emerald-600"><CheckCircle size={14} /> {state.text}</span>
  ) : (
    <span className="flex items-center gap-1.5 text-sm text-red-600"><AlertTriangle size={14} /> {state.text}</span>
  )
}

export default function Settings() {
  const { user, login } = useAuth()
  const [profile, setProfile] = useState({ full_name: '', company: '' })
  const [profileState, setProfileState] = useState(null)
  const [savingProfile, setSavingProfile] = useState(false)

  const [pw, setPw] = useState({ current: '', next: '', confirm: '' })
  const [pwState, setPwState] = useState(null)
  const [savingPw, setSavingPw] = useState(false)

  useEffect(() => {
    if (user) setProfile({ full_name: user.full_name || '', company: user.company || '' })
  }, [user])

  const saveProfile = async (e) => {
    e.preventDefault()
    setSavingProfile(true)
    setProfileState(null)
    try {
      const { data } = await authAPI.updateMe({ full_name: profile.full_name, company: profile.company })
      login(localStorage.getItem('access_token'), data)
      setProfileState({ ok: true, text: 'Profile saved' })
    } catch (err) {
      setProfileState({ ok: false, text: apiErrorMessage(err, 'Could not save profile.') })
    } finally {
      setSavingProfile(false)
    }
  }

  const savePassword = async (e) => {
    e.preventDefault()
    if (pw.next !== pw.confirm) {
      setPwState({ ok: false, text: 'New passwords don’t match' })
      return
    }
    setSavingPw(true)
    setPwState(null)
    try {
      await authAPI.changePassword(pw.current, pw.next)
      setPw({ current: '', next: '', confirm: '' })
      setPwState({ ok: true, text: 'Password updated' })
    } catch (err) {
      setPwState({ ok: false, text: apiErrorMessage(err, 'Could not change password.') })
    } finally {
      setSavingPw(false)
    }
  }

  const oauthOnly = user?.oauth_provider && !user?.has_password

  return (
    <div className="p-6 space-y-5 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 text-sm mt-0.5">Your account and how you appear to candidates</p>
      </div>

      <form onSubmit={saveProfile} className={`${card} space-y-4`}>
        <div className="flex items-center gap-2">
          <User size={16} className="text-blue-600" />
          <h2 className="font-semibold text-gray-900">Profile</h2>
        </div>
        <p className="text-xs text-gray-500">Your name and company appear in the invitation emails candidates receive.</p>
        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Full name</label>
            <input value={profile.full_name} onChange={(e) => setProfile({ ...profile, full_name: e.target.value })} required className={input} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Company</label>
            <input value={profile.company} onChange={(e) => setProfile({ ...profile, company: e.target.value })} placeholder="Acme Inc." className={input} />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-gray-600 mb-1">Email</label>
            <input value={user?.email || ''} disabled className={`${input} bg-gray-50 text-gray-500`} />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button type="submit" disabled={savingProfile} className="flex items-center gap-2 bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-semibold hover:bg-blue-700 disabled:opacity-60">
            {savingProfile && <Loader size={13} className="animate-spin" />} Save profile
          </button>
          <Status state={profileState} />
        </div>
      </form>

      <form onSubmit={savePassword} className={`${card} space-y-4`}>
        <div className="flex items-center gap-2">
          <Lock size={16} className="text-blue-600" />
          <h2 className="font-semibold text-gray-900">Password</h2>
        </div>
        {oauthOnly && <p className="text-xs text-gray-500">You sign in with {user.oauth_provider}. Set a password to also sign in with email.</p>}
        <div className="grid md:grid-cols-3 gap-3">
          {!oauthOnly && (
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Current password</label>
              <input type="password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} required className={input} />
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">New password</label>
            <input type="password" minLength={8} value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} required className={input} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Confirm new password</label>
            <input type="password" minLength={8} value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} required className={input} />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button type="submit" disabled={savingPw} className="flex items-center gap-2 bg-gray-900 text-white rounded-lg px-4 py-2 text-sm font-semibold hover:bg-gray-800 disabled:opacity-60">
            {savingPw && <Loader size={13} className="animate-spin" />} Update password
          </button>
          <Status state={pwState} />
        </div>
      </form>
    </div>
  )
}
