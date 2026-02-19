import React, { useState } from 'react'
import { useApp, ACTIONS } from '../context/AppContext'
import peraWallet from '../services/peraWallet'

/**
 * WalletConnectBtn
 *
 * Clicking "Connect Pera Wallet":
 *  → Triggers Pera Wallet connect flow (QR or deep-link)
 *  → User approves the connection in Pera
 *  → On success, we get the wallet address and fetch the live ALGO balance
 *
 * On mobile: Pera Wallet may auto-open via deep link instead of showing QR.
 */
export default function WalletConnectBtn() {
  const { state, dispatch, refreshAll } = useApp()

  const [connecting, setConnecting]   = useState(false)
  const [connectError, setConnectError] = useState('')

  const formatAddress = (addr = '') =>
    addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : ''


  // ── Connect ──────────────────────────────────────────────────────────────
  async function handleConnect() {
    setConnecting(true)
    setConnectError('')
    try {
      // Pera connect flow opens QR / deep link.
      const accounts = await peraWallet.connect()

      // Listen for wallet-initiated disconnect
      peraWallet.connector?.on('disconnect', () => {
        dispatch({ type: ACTIONS.DISCONNECT_WALLET })
      })

      if (!accounts.length) throw new Error('No accounts returned from Pera Wallet')
      const address = accounts[0]
      dispatch({ type: ACTIONS.CONNECT_WALLET, payload: address })
      // AppContext useEffect on address will trigger refreshAll automatically;
      // call here too for immediate feedback
      refreshAll(address)
    } catch (err) {
      const msg = err?.message ?? String(err)
      if (!msg.includes('closed') && !msg.includes('canceled')) {
        console.error('[WalletConnect] error:', msg)
        setConnectError(msg)
      }
    } finally {
      setConnecting(false)
    }
  }

  // ── Disconnect ────────────────────────────────────────────────────────────
  async function handleDisconnect() {
    try {
      await peraWallet.disconnect()
    } catch {
      // ignore
    }
    dispatch({ type: ACTIONS.DISCONNECT_WALLET })
  }

  // ── Connected state ───────────────────────────────────────────────────────
  if (state.walletConnected) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex flex-col items-start px-3 py-2 rounded-xl
                        border border-green-500/30 bg-green-500/5">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="font-mono text-xs text-green-300">
              {formatAddress(state.address)}
            </span>
          </div>
          {state.balance !== null && (
            <span className="text-xs text-slate-400 mt-0.5 pl-4">
              {Number(state.balance).toFixed(3)} ALGO
            </span>
          )}
        </div>
        <button onClick={handleDisconnect} className="btn-danger text-xs px-4 py-2">
          Disconnect
        </button>
      </div>
    )
  }

  // ── Disconnected state ────────────────────────────────────────────────────
  return (
    <>
      <button
        onClick={handleConnect}
        disabled={connecting}
        className="btn-primary disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {connecting ? (
          <>
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Connecting…
          </>
        ) : (
          <>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="7" width="20" height="14" rx="2" />
              <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" />
            </svg>
            Connect Pera Wallet
          </>
        )}
      </button>
      {connectError && (
        <p className="mt-2 text-xs text-red-300 max-w-xs break-words">
          ⚠️ {connectError}
        </p>
      )}
    </>
  )
}
