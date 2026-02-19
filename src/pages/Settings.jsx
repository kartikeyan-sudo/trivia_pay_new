import React, { useState } from 'react'
import { useApp, ACTIONS } from '../context/AppContext'

export default function Settings() {
  const { state, dispatch } = useApp()
  const [network, setNetwork] = useState(state.network)
  const [copiedApp, setCopiedApp] = useState(false)
  const [copiedEscrow, setCopiedEscrow] = useState(false)

  const appId   = state.appId
  const escrow  = state.escrowAddress

  const copyValue = (text, setter) => {
    if (!text) return
    navigator.clipboard?.writeText(String(text)).then(() => {
      setter(true)
      setTimeout(() => setter(false), 1500)
    })
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">
          App <span className="gradient-text">Settings</span>
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Configure network, app ID, and preferences
        </p>
      </div>

      {/* Static contract identifiers */}
      <div className="card space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-widest">App ID</p>
            <p className="text-white font-semibold mt-1">{appId || 'Not set'}</p>
          </div>
          <button
            type="button"
            className="btn-secondary text-xs"
            onClick={() => copyValue(appId, setCopiedApp)}
            disabled={!appId}
          >
            {copiedApp ? 'Copied' : 'Copy'}
          </button>
        </div>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <p className="text-xs text-slate-500 uppercase tracking-widest">Escrow Address</p>
            <p className="text-white font-mono text-xs break-all mt-1">{escrow || 'Not set'}</p>
          </div>
          <button
            type="button"
            className="btn-secondary text-xs whitespace-nowrap"
            onClick={() => copyValue(escrow, setCopiedEscrow)}
            disabled={!escrow}
          >
            {copiedEscrow ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>

      {/* Wallet section */}
      <div className="card space-y-4">
        <h2 className="font-semibold text-white flex items-center gap-2">
          <span>💼</span> Wallet
        </h2>
        {state.walletConnected ? (
          <div className="space-y-3">
            <div className="rounded-xl p-3 bg-surface-700/50 border border-white/5">
              <p className="text-xs text-slate-500 mb-1">Connected Address</p>
              <p className="font-mono text-sm text-cyan-400 break-all">{state.address}</p>
            </div>
            <button
              onClick={() => dispatch({ type: ACTIONS.DISCONNECT_WALLET })}
              className="btn-danger w-full justify-center"
            >
              Disconnect Wallet
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="rounded-xl p-3 bg-yellow-500/5 border border-yellow-500/20 text-sm text-yellow-300">
              🟡 No wallet connected
            </div>
            <button
              onClick={() =>
                dispatch({
                  type: ACTIONS.CONNECT_WALLET,
                  payload: 'ALGO7XDEMO123AAAA456BBBB789CCCC000DDDD111EEEE',
                })
              }
              className="btn-primary w-full justify-center"
            >
              Connect Pera Wallet
            </button>
          </div>
        )}
      </div>

      {/* Network & App ID */}
      <div className="card space-y-5">
        <h2 className="font-semibold text-white flex items-center gap-2">
          <span>🔗</span> Network Configuration
        </h2>

        <div>
          <label className="block text-sm text-slate-400 mb-1.5">Network</label>
          <div className="flex gap-3">
            {['testnet', 'mainnet'].map(n => (
              <button
                key={n}
                type="button"
                onClick={() => { setNetwork(n); dispatch({ type: ACTIONS.SET_NETWORK, payload: n }) }}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition
                  ${network === n
                    ? 'border-cyan-500/60 bg-cyan-500/15 text-cyan-300'
                    : 'border-white/10 text-slate-400 hover:text-white hover:border-white/20'}`}
              >
                {n.charAt(0).toUpperCase() + n.slice(1)}
                {n === 'mainnet' && (
                  <span className="ml-2 badge badge-warning text-xs align-middle">Live</span>
                )}
              </button>
            ))}
          </div>
          {network === 'mainnet' && (
            <p className="text-xs text-yellow-400 mt-2 bg-yellow-500/10 px-3 py-2 rounded-lg">
              ⚠️ Mainnet uses real ALGO. Double-check all transactions.
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm text-slate-400 mb-1.5">App ID</label>
          <div className="input bg-surface-700/50 border-white/10 text-white">
            {appId || 'Not set'}
          </div>
          <p className="text-xs text-slate-600 mt-1">This build uses the statically configured App ID.</p>
        </div>

        <div>
          <label className="block text-sm text-slate-400 mb-1.5">Escrow Address</label>
          <div className="input font-mono text-xs bg-surface-700/50 border-white/10 text-white break-all">
            {escrow || 'Not set'}
          </div>
          <p className="text-xs text-slate-600 mt-1">Statically configured escrow address.</p>
        </div>
      </div>

      {/* Theme section */}
      <div className="card space-y-4">
        <h2 className="font-semibold text-white flex items-center gap-2">
          <span>🎨</span> Appearance
        </h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-white font-medium">Dark Mode</p>
            <p className="text-xs text-slate-500 mt-0.5">Currently: {state.theme} mode</p>
          </div>
          <button
            onClick={() => dispatch({ type: ACTIONS.TOGGLE_THEME })}
            className={`relative w-12 h-6 rounded-full transition-colors duration-200
              ${state.theme === 'dark' ? 'bg-cyan-500' : 'bg-slate-500'}`}
          >
            <span
              className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200
                ${state.theme === 'dark' ? 'translate-x-7' : 'translate-x-1'}`}
            />
          </button>
        </div>
      </div>

      {/* About */}
      <div className="card space-y-2 text-sm">
        <h2 className="font-semibold text-white flex items-center gap-2 mb-3">
          <span>ℹ️</span> About
        </h2>
        {[
          ['App Name',  'Trivia Pay – Algorand Payment Organizer'],
          ['Version',   'v0.1.0 (Hackathon Demo)'],
          ['Chain',     'Algorand Testnet'],
          ['Framework', 'React + Vite + Tailwind CSS'],
          ['SDK',       'algosdk + Pera Wallet (browser extension)'],
          ['Algod',     'AlgoNode (free, no API key)'],
        ].map(([k, v]) => (
          <div key={k} className="flex justify-between text-slate-400">
            <span className="text-slate-500">{k}</span>
            <span className="text-right text-white">{v}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
