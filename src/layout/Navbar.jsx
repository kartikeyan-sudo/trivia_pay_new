import React, { useState, useRef, useEffect } from 'react'
import { useApp, ACTIONS } from '../context/AppContext'
import WalletConnectBtn from '../components/WalletConnectBtn'

const LOGO_ICON = (
  <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
    <circle cx="16" cy="16" r="16" fill="url(#logo-grad)" />
    <path d="M10 22L16 10L22 22M13 18.5H19" stroke="white" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" />
    <defs>
      <linearGradient id="logo-grad" x1="0" y1="0" x2="32" y2="32">
        <stop stopColor="#86efac" />
        <stop offset="1" stopColor="#34d399" />
      </linearGradient>
    </defs>
  </svg>
)

const SunIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5" />
    <line x1="12" y1="1"  x2="12" y2="3"  />
    <line x1="12" y1="21" x2="12" y2="23" />
    <line x1="4.22" y1="4.22"  x2="5.64" y2="5.64"  />
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
    <line x1="1"  y1="12" x2="3"  y2="12" />
    <line x1="21" y1="12" x2="23" y2="12" />
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
  </svg>
)

const MoonIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
  </svg>
)

const HamburgerIcon = ({ open }) =>
  open ? (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.5" strokeLinecap="round">
      <line x1="18" y1="6"  x2="6"  y2="18" />
      <line x1="6"  y1="6"  x2="18" y2="18" />
    </svg>
  ) : (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.5" strokeLinecap="round">
      <line x1="3" y1="7"  x2="21" y2="7"  />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="17" x2="21" y2="17" />
    </svg>
  )

export default function Navbar() {
  const { state, dispatch, refreshAll } = useApp()
  const [notifOpen, setNotifOpen] = useState(false)
  const notifRef = useRef(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handler(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const unreadCount = state.notifications.filter(n => !n.read).length

  // Format "last refreshed" as "HH:MM:SS"
  const lastRefreshedStr = state.lastRefreshed
    ? state.lastRefreshed.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : null

  return (
    <header className="
      fixed top-0 left-0 right-0 z-40
      border-b border-green-200 dark:border-white/5
      bg-white/95 dark:bg-surface-900/80 backdrop-blur-md
    ">
      {/* ── Main nav row ──────────────────────────────────────────────── */}
      <div className="h-16 flex items-center justify-between px-4 md:px-6">
        {/* Left: hamburger + logo */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => dispatch({ type: ACTIONS.TOGGLE_SIDEBAR })}
            className="p-2 rounded-lg text-slate-500 dark:text-slate-300 hover:text-green-700 dark:hover:text-white
                       hover:bg-green-100 dark:hover:bg-white/8 transition-colors duration-150"
            aria-label="Toggle menu"
          >
            <HamburgerIcon open={state.sidebarOpen} />
          </button>
          <div className="flex items-center gap-2.5 select-none">
            {LOGO_ICON}
            <span className="font-bold text-base tracking-wide">
              <span className="gradient-text">Trivia Pay</span>
          </span>
        </div>
      </div>

      {/* Right: network badge + theme + wallet */}
        <div className="flex items-center gap-2 md:gap-3">
          {/* Network badge */}
          <span className="badge badge-info hidden sm:inline-flex text-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            {state.network.toUpperCase()}
          </span>

          {/* Theme toggle */}
          <button
            onClick={() => dispatch({ type: ACTIONS.TOGGLE_THEME })}
            className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-green-700 dark:hover:text-white hover:bg-green-100 dark:hover:bg-white/8 transition-colors"
            aria-label="Toggle theme"
          >
            {state.theme === 'dark' ? <SunIcon /> : <MoonIcon />}
          </button>

          {/* ── Notification bell ──────────────────────────────────────── */}
          {state.walletConnected && (
            <div ref={notifRef} className="relative">
              <button
                onClick={() => setNotifOpen(o => !o)}
                className="relative p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-green-700 dark:hover:text-white hover:bg-green-100 dark:hover:bg-white/8 transition-colors"
                aria-label="Notifications"
              >
                {/* Bell icon */}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 01-3.46 0" />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-0.5 rounded-full
                                   bg-green-500 text-white text-[10px] font-bold flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Dropdown */}
              {notifOpen && (
                <div className="absolute right-0 top-11 w-80 rounded-2xl border border-white/10 dark:border-white/10
                                bg-white dark:bg-surface-800 shadow-2xl z-50 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-black/5 dark:border-white/8">
                    <p className="font-semibold text-sm text-slate-800 dark:text-white">
                      Payment Requests
                      {unreadCount > 0 && (
                        <span className="ml-2 badge bg-green-500/20 text-green-700 dark:text-green-300 text-xs">
                          {unreadCount} new
                        </span>
                      )}
                    </p>
                    {state.notifications.length > 0 && (
                      <button
                        onClick={() => {
                          state.notifications.forEach(n =>
                            dispatch({ type: ACTIONS.DISMISS_NOTIFICATION, payload: n.id })
                          )
                        }}
                        className="text-xs text-slate-400 hover:text-red-400 transition-colors"
                      >
                        Clear all
                      </button>
                    )}
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y divide-black/5 dark:divide-white/5">
                    {state.notifications.length === 0 ? (
                      <div className="px-4 py-8 text-center text-slate-400 text-sm">
                        <p className="text-2xl mb-2">🔔</p>
                        <p>No payment requests yet.</p>
                        <p className="text-xs mt-1 text-slate-500">You'll be notified when someone sends you a bill split.</p>
                      </div>
                    ) : (
                      state.notifications.map(n => (
                        <div key={n.id} className={`px-4 py-3 space-y-1 ${!n.read ? 'bg-green-50 dark:bg-green-500/5' : ''}`}>
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-slate-800 dark:text-white truncate">
                                💸 {n.billName}
                              </p>
                              <p className="text-xs text-slate-500 mt-0.5">
                                From{' '}
                                <span className="font-mono">
                                  {n.creatorAddress
                                    ? `${n.creatorAddress.slice(0, 8)}…${n.creatorAddress.slice(-4)}`
                                    : 'Unknown'}
                                </span>
                              </p>
                              <p className="text-xs font-semibold text-green-600 dark:text-green-400 mt-0.5">
                                You owe {Number(n.share).toFixed(4)} ALGO
                              </p>
                              {n.billNote && (
                                <p className="text-xs text-slate-400 italic mt-0.5">"{n.billNote}"</p>
                              )}
                            </div>
                            <button
                              onClick={() => dispatch({ type: ACTIONS.DISMISS_NOTIFICATION, payload: n.id })}
                              className="shrink-0 text-slate-400 hover:text-red-400 transition-colors text-base leading-none mt-0.5"
                              title="Dismiss"
                            >
                              ×
                            </button>
                          </div>
                          <button
                            onClick={() => {
                              dispatch({ type: ACTIONS.SET_PAGE, payload: 'ScanPay' })
                              setNotifOpen(false)
                            }}
                            className="text-xs text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300
                                       font-semibold transition-colors"
                          >
                            → Pay now via Scan &amp; Pay
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Real Pera Wallet connect / disconnect */}
          <WalletConnectBtn />
        </div>
      </div>

      {/* ── Live status bar (shown only when wallet connected) ─────────── */}
      {state.walletConnected && (
        <div className="px-4 md:px-6 py-1.5 flex items-center gap-4 text-xs
                        border-t border-green-100 dark:border-white/5 bg-green-50/80 dark:bg-surface-900/60 overflow-x-auto">

          {/* Wallet balance */}
          <span className="flex items-center gap-1.5 shrink-0">
            <span className="text-slate-500">Balance</span>
            {state.loading ? (
              <span className="w-3 h-3 border border-green-400/50 border-t-green-500 rounded-full animate-spin" />
            ) : (
              <span className="font-mono font-semibold text-green-700 dark:text-green-300">
                {state.balance !== null ? `${Number(state.balance).toFixed(4)} ALGO` : '…'}
              </span>
            )}
          </span>

          <span className="text-white/10">|</span>

          {/* Escrow balance */}
          {state.escrowAddress && (
            <>
              <span className="flex items-center gap-1.5 shrink-0">
                <span className="text-slate-500">Pool</span>
                {state.loading ? (
                  <span className="w-3 h-3 border border-emerald-400/50 border-t-emerald-500 rounded-full animate-spin" />
                ) : (
                  <span className="font-mono font-semibold text-emerald-700 dark:text-emerald-300">
                    {state.escrowBalance !== null ? `${Number(state.escrowBalance).toFixed(4)} ALGO` : '…'}
                  </span>
                )}
              </span>
              <span className="text-white/10">|</span>
            </>
          )}

          {/* Tx count */}
          <span className="flex items-center gap-1.5 shrink-0">
            <span className="text-slate-500">Txs</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">{state.recentTxs.length}</span>
          </span>

          <span className="text-white/10">|</span>

          {/* Last updated */}
          <span className="flex items-center gap-1.5 shrink-0">
            {state.loading ? (
              <>
                <span className="w-3 h-3 border border-cyan-500/50 border-t-cyan-400 rounded-full animate-spin" />
                <span className="text-slate-400">Fetching…</span>
              </>
            ) : lastRefreshedStr ? (
              <>
                <span className="text-green-500">●</span>
                <span className="text-slate-500">Updated {lastRefreshedStr}</span>
              </>
            ) : (
              <span className="text-slate-500">Not yet fetched</span>
            )}
          </span>

          {/* Manual refresh button */}
          <button
            onClick={() => refreshAll()}
            disabled={state.loading}
            className="ml-auto shrink-0 text-slate-500 dark:text-slate-500 hover:text-green-700 dark:hover:text-green-400 transition-colors
                       disabled:opacity-40 disabled:cursor-not-allowed"
            title="Refresh now"
          >
            ↻ Refresh
          </button>
        </div>
      )}
    </header>
  )
}
