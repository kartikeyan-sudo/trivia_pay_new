import React, { useState } from 'react'
import Loader from '../components/Loader'
import { useApp } from '../context/AppContext'
import peraWallet from '../services/peraWallet'
import { makePaymentTxn, submitSignedTxn, explorerLink } from '../services/blockchain'

/**
 * Deposit Page
 *
 * Flow:
 *  1. User enters amount
 *  2. Frontend builds unsigned payment txn via algosdk
 *  3. Pera Wallet signs the txn (QR on desktop, deep-link on mobile)
 *  4. Frontend submits signed bytes to Testnet via Algod
 *  5. Waits for confirmation, shows Tx ID + Explorer link
 */
export default function Deposit() {
  const { state, refreshAll } = useApp()
  const [amount, setAmount]   = useState('')
  const [loading, setLoading] = useState(false)
  const [status,  setStatus]  = useState(null)   // null | 'success' | 'error'
  const [txId,    setTxId]    = useState(null)
  const [error,   setError]   = useState('')
  const [step,    setStep]    = useState('')      // Step description for the loader

  const quickAmounts = [1, 2, 5, 10]
  const escrow = state.escrowAddress

  async function handleDeposit(e) {
    e.preventDefault()

    // ── Validation ────────────────────────────────────────────────────────
    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      setError('Please enter a valid ALGO amount.')
      return
    }
    if (!state.walletConnected) {
      setError('Connect your Pera Wallet first.')
      return
    }
    if (!escrow) {
      setError('Escrow address not set. Go to Settings and enter the escrow address.')
      return
    }

    setError('')
    setStatus(null)
    setTxId(null)
    setLoading(true)

    try {
      // ── Step 1: Build unsigned transaction ─────────────────────────────
      setStep('Building transaction…')
      const amountNum = Number(amount)
      const unsignedTxn = await makePaymentTxn(
        state.address,
        escrow,
        amountNum,
        'Trivia Pay deposit',
      )

      // ── Step 2: Request Pera Wallet signature (opens QR / deep-link) ───
      setStep('Waiting for Pera Wallet signature (scan QR on desktop)…')
      /**
       * peraWallet.signTransaction expects an array of arrays (groups).
       * Each inner array contains { txn, signers } objects.
       * signers: [] means "this wallet signs all txns in the group"
       */
      const signedTxnGroups = await peraWallet.signTransaction([
        [{ txn: unsignedTxn, signers: [] }],
      ])
      // signedTxnGroups is Uint8Array[]
      const signedBlob = signedTxnGroups[0]

      // ── Step 3: Submit to Testnet ───────────────────────────────────────
      setStep('Submitting to Algorand Testnet…')
      const { txId: confirmedTxId } = await submitSignedTxn(signedBlob)

      // ── Step 4: Refresh all balances + txs from chain ──────────────────
      refreshAll()

      setTxId(confirmedTxId)
      setStatus('success')
      setAmount('')
    } catch (err) {
      console.error('[Deposit] error:', err)
      // User closed Pera modal
      if (err?.message?.includes('closed') || err?.message?.includes('canceled')) {
        setError('Transaction cancelled – you closed the Pera Wallet window.')
      } else {
        setError(err?.message ?? 'Transaction failed. Check console for details.')
      }
      setStatus('error')
    } finally {
      setLoading(false)
      setStep('')
    }
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">
          Deposit <span className="gradient-text">ALGO</span>
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Sign a real payment transaction and send ALGO to the pool escrow
        </p>
      </div>

      {/* Wallet status */}
      <div className={`rounded-xl px-4 py-3 border flex items-center gap-3 text-sm
        ${state.walletConnected
          ? 'border-green-500/30 bg-green-500/5 text-green-300'
          : 'border-yellow-500/30 bg-yellow-500/5 text-yellow-300'}`}>
        <span>{state.walletConnected ? '🟢' : '🟡'}</span>
        {state.walletConnected
          ? `Connected: ${state.address?.slice(0, 12)}…  |  Balance: ${state.balance !== null ? Number(state.balance).toFixed(3) + ' ALGO' : '…'}`
          : 'Wallet not connected — click "Connect Pera Wallet" in the top bar'}
      </div>

      {/* Escrow address */}
      <div className="card">
        <p className="text-xs text-slate-500 mb-1 uppercase tracking-widest font-medium">
          Recipient (Escrow Address)
        </p>
        {escrow ? (
          <p className="font-mono text-xs text-cyan-400 break-all">{escrow}</p>
        ) : (
          <p className="text-sm text-yellow-400">
            ⚠️ No escrow address configured — set it in <strong>Settings</strong> first.
          </p>
        )}
      </div>

      {/* Deposit Form */}
      <form onSubmit={handleDeposit} className="card space-y-5">
        <div>
          <label className="block text-sm text-slate-300 mb-2 font-medium">
            Amount (ALGO)
          </label>
          {/* Quick pick */}
          <div className="flex gap-2 mb-3">
            {quickAmounts.map(v => (
              <button
                key={v}
                type="button"
                onClick={() => setAmount(String(v))}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition
                  ${String(v) === amount
                    ? 'border-cyan-500/70 bg-cyan-500/20 text-cyan-300'
                    : 'border-white/10 text-slate-400 hover:border-white/20 hover:text-white'}`}
              >
                {v} Ⓐ
              </button>
            ))}
          </div>
          <input
            type="number"
            min="0.001"
            step="0.001"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="Enter custom amount…"
            className="input"
          />
        </div>

        {/* Fee summary */}
        {amount && Number(amount) > 0 && (
          <div className="rounded-xl p-3 bg-surface-700/50 border border-white/5 text-sm space-y-1.5">
            <div className="flex justify-between text-slate-400">
              <span>Deposit amount</span>
              <span className="text-white font-medium">{Number(amount).toFixed(3)} ALGO</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Network fee</span>
              <span>~0.001 ALGO</span>
            </div>
            <div className="border-t border-white/5 pt-1.5 flex justify-between font-semibold">
              <span>Total deducted</span>
              <span className="text-cyan-300">{(Number(amount) + 0.001).toFixed(3)} ALGO</span>
            </div>
          </div>
        )}

        {error && (
          <p className="text-sm text-red-400 bg-red-500/10 rounded-lg px-3 py-2 break-words">
            ⚠️ {error}
          </p>
        )}

        {loading ? (
          <Loader text={step || 'Processing…'} />
        ) : (
          <button
            type="submit"
            className="btn-primary w-full justify-center py-3 disabled:opacity-60"
            disabled={!state.walletConnected || !escrow}
          >
            Sign &amp; Deposit to Pool
          </button>
        )}
      </form>

      {/* How it works */}
      {!loading && status !== 'success' && (
        <div className="card border border-white/5 space-y-2 text-xs text-slate-500">
          <p className="text-slate-400 font-medium text-sm">How it works</p>
          <div className="space-y-1.5">
            {[
              ['1', 'Enter amount → click "Sign & Deposit"'],
              ['2', 'A QR code appears (desktop) or Pera Wallet opens (mobile)'],
              ['3', 'Approve the transaction in Pera Wallet app'],
              ['4', 'Transaction is submitted and confirmed on Testnet (~4 secs)'],
              ['5', 'Your balance updates automatically'],
            ].map(([n, t]) => (
              <div key={n} className="flex gap-2">
                <span className="w-4 h-4 rounded-full bg-cyan-500/20 text-cyan-400 text-center shrink-0">{n}</span>
                <span>{t}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Success state */}
      {status === 'success' && txId && (
        <div className="card border border-green-500/30 bg-green-500/5 text-center space-y-3">
          <p className="text-3xl">✅</p>
          <p className="font-semibold text-green-300 text-lg">Deposit Confirmed!</p>
          <div className="text-left space-y-1">
            <p className="text-xs text-slate-400">Transaction ID:</p>
            <p className="font-mono text-xs text-cyan-400 break-all bg-black/20 rounded-lg p-2">
              {txId}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => navigator.clipboard?.writeText(txId)}
              className="btn-ghost text-xs flex-1 justify-center"
            >
              Copy Tx ID
            </button>
            <a
              href={explorerLink(txId)}
              target="_blank"
              rel="noreferrer"
              className="btn-primary text-xs flex-1 text-center py-2"
            >
              View on Explorer ↗
            </a>
          </div>
          <p className="text-xs text-slate-500">
            Updated balance: {state.balance !== null ? Number(state.balance).toFixed(3) : '…'} ALGO
          </p>
        </div>
      )}
    </div>
  )
}

