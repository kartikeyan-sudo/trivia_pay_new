import React from 'react'
import { useApp, ACTIONS } from '../context/AppContext'

const NAV_ITEMS = [
  {
    label: 'Dashboard',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    label: 'Deposit',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="5" x2="12" y2="19" />
        <polyline points="19 12 12 19 5 12" />
        <line x1="5" y1="21" x2="19" y2="21" />
      </svg>
    ),
  },
  {
    label: 'Bill Split',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <line x1="2" y1="10" x2="22" y2="10" />
        <line x1="12" y1="10" x2="12" y2="19" />
      </svg>
    ),
  },
  {
    label: 'Payment Tracker',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
  },
  {
    label: 'Goal Tracker',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="6" />
        <circle cx="12" cy="12" r="2" />
      </svg>
    ),
  },
  {
    label: 'Transactions',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="8" y1="6" x2="21" y2="6" />
        <line x1="8" y1="12" x2="21" y2="12" />
        <line x1="8" y1="18" x2="21" y2="18" />
        <line x1="3" y1="6"  x2="3.01" y2="6" />
        <line x1="3" y1="12" x2="3.01" y2="12" />
        <line x1="3" y1="18" x2="3.01" y2="18" />
      </svg>
    ),
  },
  {
    label: 'Scan & Pay',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <line x1="3" y1="8" x2="8" y2="3" />
        <path d="M10 10 L14 10 L14 14" />
      </svg>
    ),
  },
  {
    label: 'Analytics',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6"  y1="20" x2="6"  y2="14" />
        <line x1="2"  y1="20" x2="22" y2="20" />
      </svg>
    ),
  },
  {
    label: 'Settings',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83
                 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33
                 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4
                 a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06
                 A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09
                 A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06
                 a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51
                 V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33
                 l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9
                 a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
      </svg>
    ),
  },
]

export default function Sidebar() {
  const { state, dispatch } = useApp()

  return (
    <>
      {/* Overlay backdrop */}
      {state.sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => dispatch({ type: ACTIONS.CLOSE_SIDEBAR })}
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={`
          fixed top-0 left-0 z-40 h-full
          w-64 flex flex-col pt-16
          border-r border-green-200 dark:border-white/5
          bg-green-50 dark:bg-surface-800/95 backdrop-blur-md
          transition-transform duration-250 ease-in-out
          ${state.sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* App subtitle */}
        <div className="px-5 pt-5 pb-3">
          <p className="text-xs text-slate-400 dark:text-slate-500 font-medium uppercase tracking-widest">
            Navigation
          </p>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map(({ label, icon }) => {
            const isActive = state.activePage === label
            return (
              <button
                key={label}
                onClick={() => dispatch({ type: ACTIONS.SET_PAGE, payload: label })}
                className={`
                  w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                  transition-all duration-150 text-left
                  ${isActive
                    ? 'bg-green-500/15 dark:bg-gradient-to-r dark:from-green-500/20 dark:to-emerald-500/10 text-green-800 dark:text-green-300 border border-green-400/40 dark:border-green-500/20'
                    : 'text-slate-600 dark:text-slate-400 hover:text-green-800 dark:hover:text-white hover:bg-green-100/70 dark:hover:bg-white/5'}
                `}
              >
                <span className={isActive ? 'text-green-600 dark:text-green-400' : 'text-slate-400 dark:text-slate-500'}>
                  {icon}
                </span>
                {label}
                {isActive && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-green-500" />
                )}
              </button>
            )
          })}
        </nav>

        {/* Bottom info */}
        <div className="p-4 border-t border-green-200 dark:border-white/5">
          <div className="rounded-xl p-3 bg-green-100/60 dark:bg-surface-700/60">
            <p className="text-xs text-slate-500 mb-1">App ID</p>
            <p className="font-mono text-xs text-green-700 dark:text-green-400">{state.appId || 'Not deployed'}</p>
            <p className="text-xs text-slate-500 mt-2 mb-1">Network</p>
            <span className="badge badge-info text-xs">{state.network.toUpperCase()}</span>
          </div>
        </div>
      </aside>
    </>
  )
}
