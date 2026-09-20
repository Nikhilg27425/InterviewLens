import React from 'react'

export default function Logo({ size = 'md', white = false }) {
  const sizes = {
    sm: { icon: 24, text: 'text-base' },
    md: { icon: 28, text: 'text-lg' },
    lg: { icon: 36, text: 'text-2xl' },
  }
  const s = sizes[size] || sizes.md

  return (
    <div className="flex items-center gap-2">
      {/* Eye icon with circuit ring */}
      <div
        className="flex items-center justify-center rounded-full bg-blue-600"
        style={{ width: s.icon, height: s.icon }}
      >
        <svg
          width={s.icon * 0.6}
          height={s.icon * 0.6}
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <ellipse cx="8" cy="8" rx="7" ry="4.5" stroke="white" strokeWidth="1.4" />
          <circle cx="8" cy="8" r="2.2" fill="white" />
          <circle cx="8" cy="8" r="1" fill="#2563EB" />
        </svg>
      </div>
      <span
        className={`font-bold tracking-tight ${s.text} ${white ? 'text-white' : 'text-gray-900'}`}
      >
        InterviewLens
      </span>
    </div>
  )
}
