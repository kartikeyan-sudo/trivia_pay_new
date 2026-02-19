/**
 * ReceiveQR.jsx
 *
 * Generates a QR code that encodes an Algorand payment URI so another
 * person can scan it to pre-fill a payment form (or use any ARC-0026
 * compatible wallet).
 *
 * Usage:
 *   <ReceiveQR />               ← uses connected wallet address from context
 *   <ReceiveQR compact />       ← smaller inline version for Dashboard widget
 */
import React, { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { useApp, ACTIONS } from '../context/AppContext'
import { buildPaymentURI, shortenAddress } from '../services/algorand'

export default function ReceiveQR({ compact = false }) {
  const { state, dispatch } = useApp()
  const [amountInput, setAmountInput] = useState('')
  const [noteInput,   setNoteInput]   = useState('')
  const [copied,      setCopied]      = useState(false)

  const address = state.address

  // Build the live URI as the user types
  const uri = buildPaymentURI(address, amountInput, noteInput)

  function copyURI() {
    navigator.clipboard?.writeText(uri).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function copyAddress() {
    navigator.clipboard?.writeText(address ?? '')
      .then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
  }

  // ── Not connected ──────────────────────────────────────────────────────────
  if (!address) {
    return (
      <div className={`card text-center ${compact ? 'py-6' : 'py-10'}`}>
        <p className="text-3xl mb-2">📷</p>
        <p className="text-slate-400 text-sm">Connect your wallet to generate a receive QR.</p>
      </div>
    )
  }

  // ── Compact mode (Dashboard widget) ───────────────────────────────────────
  if (compact) {
    return (
      <div className="card flex flex-col items-center gap-3">
        <div className="flex items-center justify-between w-full">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
            My Receive QR
          </p>
          <button
            onClick={() => dispatch({ type: ACTIONS.SET_PAGE, payload: 'Scan & Pay' })}
            className="text-xs text-cyan-400 hover:underline"
          >
            Full page →
          </button>
        </div>

        {/* QR */}
        <div className="p-3 rounded-2xl bg-white shadow-lg">
          <QRCodeSVG
            value={uri}
            size={140}
            bgColor="#ffffff"
            fgColor="#0e1628"
            level="M"
            includeMargin={false}
          />
        </div>

        <p className="font-mono text-xs text-cyan-400 text-center break-all">
          {shortenAddress(address)}
        </p>
        <button onClick={copyAddress} className="btn-ghost text-xs px-4 py-1.5 w-full justify-center">
          {copied ? '✓ Copied!' : '📋 Copy Address'}
        </button>
      </div>
    )
  }

  // ── Full mode (ScanPay page) ───────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* Address display */}
      <div className="rounded-xl p-3 bg-surface-700/50 border border-white/5">
        <p className="text-xs text-slate-500 mb-1">Your Wallet Address</p>
        <p className="font-mono text-xs text-cyan-400 break-all">{address}</p>
      </div>

      {/* Optional amount + note */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm text-slate-400 mb-1.5">
            Amount (ALGO) <span className="text-slate-600">· optional</span>
          </label>
          <input
            className="input"
            type="number"
            min="0"
            step="0.001"
            placeholder="e.g. 2.5"
            value={amountInput}
            onChange={e => setAmountInput(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm text-slate-400 mb-1.5">
            Note <span className="text-slate-600">· optional</span>
          </label>
          <input
            className="input"
            type="text"
            maxLength={64}
            placeholder="e.g. Coffee payment"
            value={noteInput}
            onChange={e => setNoteInput(e.target.value)}
          />
        </div>
      </div>

      {/* QR Code */}
      <div className="flex flex-col items-center gap-4 py-4">
        <div className="p-5 rounded-3xl bg-white shadow-2xl ring-4 ring-cyan-500/20">
          <QRCodeSVG
            value={uri}
            size={220}
            bgColor="#ffffff"
            fgColor="#0e1628"
            level="M"
            includeMargin={false}
          />
        </div>
        <p className="text-xs text-slate-500 text-center max-w-xs">
          Anyone with an ARC-0026 compatible wallet (like Pera) can scan this to pay you.
        </p>
      </div>

      {/* URI preview + copy */}
      <div className="rounded-xl p-3 bg-surface-700/50 border border-white/5 space-y-2">
        <p className="text-xs text-slate-500 uppercase tracking-widest">Encoded URI</p>
        <p className="font-mono text-xs text-purple-300 break-all">{uri}</p>
      </div>

      <div className="flex gap-3">
        <button onClick={copyURI} className="btn-primary flex-1 justify-center">
          {copied ? '✓ Copied!' : '📋 Copy URI'}
        </button>
        <button onClick={copyAddress} className="btn-secondary flex-1 justify-center">
          Copy Address
        </button>
      </div>
    </div>
  )
}
