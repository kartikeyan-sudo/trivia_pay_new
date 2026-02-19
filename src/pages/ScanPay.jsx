/**
 * ScanPay.jsx  ─  Full "Scan & Pay" page
 *
 * ┌──────────────────────────────────────────────────────────────────┐
 * │  Tab: Generate QR to Receive  │  Tab: Scan QR to Pay            │
 * └──────────────────────────────────────────────────────────────────┘
 *
 * "Generate QR to Receive" tab:
 *   → Shows ReceiveQR component (QRCodeSVG of algorand:// URI)
 *
 * "Scan QR to Pay" tab:
 *   → ScanQR opens camera via html5-qrcode
 *   → On successful scan, parsePaymentURI() fills the form below
 *   → User confirms amount / note, clicks "Pay"
 *   → makePaymentTxn() builds the unsigned txn
 *   → peraWallet.signTransaction() opens the Pera QR/deep-link
 *   → submitSignedTxn() broadcasts to Testnet and waits for confirmation
 *   → refreshAll() in AppContext updates live balance + tx list
 */
import React, { useState } from 'react'
import ReceiveQR   from '../components/ReceiveQR'
import ScanQR      from '../components/ScanQR'
import Loader      from '../components/Loader'
import { useApp }  from '../context/AppContext'
import peraWallet  from '../services/peraWallet'
import { makePaymentTxn, submitSignedTxn, explorerLink } from '../services/blockchain'
import { shortenAddress } from '../services/algorand'

const TABS = ['Generate QR to Receive', 'Scan QR to Pay']

export default function ScanPay() {
  const { state, refreshAll } = useApp()
  const [activeTab, setActiveTab] = useState(0)

  // ── Scan QR to Pay: form state ─────────────────────────────────────────────
  const [scanned,  setScanned]  = useState(false)  // true after a successful scan
  const [receiver, setReceiver] = useState('')
  const [amount,   setAmount]   = useState('')
  const [note,     setNote]     = useState('')

  // ── Payment submission state ───────────────────────────────────────────────
  const [loading,  setLoading]  = useState(false)
  const [step,     setStep]     = useState('')
  const [txId,     setTxId]     = useState(null)
  const [payError, setPayError] = useState('')
  const [payOk,    setPayOk]    = useState(false)

  // ── Called by ScanQR when a valid Algorand URI is decoded ──────────────────
  function handleScan({ address, amountAlgo, note: scannedNote }) {
    setReceiver(address)
    setAmount(amountAlgo)
    setNote(scannedNote)
    setScanned(true)
    setPayError('')
    setPayOk(false)
    setTxId(null)
  }

  function clearForm() {
    setReceiver('')
    setAmount('')
    setNote('')
    setScanned(false)
    setPayError('')
    setPayOk(false)
    setTxId(null)
    setStep('')
  }

  // ── Submit payment ─────────────────────────────────────────────────────────
  async function handlePay(e) {
    e.preventDefault()
    setPayError('')
    setPayOk(false)
    setTxId(null)

    if (!state.walletConnected) {
      setPayError('Connect your Pera Wallet first.')
      return
    }
    if (!receiver || receiver.length !== 58) {
      setPayError('Receiver address is invalid (must be 58 characters).')
      return
    }
    const amtNum = parseFloat(amount)
    if (isNaN(amtNum) || amtNum <= 0) {
      setPayError('Enter a valid ALGO amount greater than 0.')
      return
    }

    setLoading(true)
    try {
      // Step 1 — Build unsigned transaction
      setStep('Building transaction…')
      const unsignedTxn = await makePaymentTxn(
        state.address,
        receiver,
        amtNum,
        note || 'Trivia Pay QR payment',
      )

      // Step 2 — Pera Wallet signs (opens QR modal on desktop / deep link on mobile)
      setStep('Waiting for Pera Wallet signature…')
      const signedGroups = await peraWallet.signTransaction([
        [{ txn: unsignedTxn, signers: [] }],
      ])
      const signedBlob = signedGroups[0]

      // Step 3 — Broadcast to Testnet
      setStep('Submitting to Algorand Testnet…')
      const { txId: confirmedId } = await submitSignedTxn(signedBlob)
      setTxId(confirmedId)

      // Step 4 — Refresh balances + tx history in AppContext
      refreshAll()

      setPayOk(true)
    } catch (err) {
      console.error('[ScanPay] pay error:', err)
      if (err?.message?.includes('closed') || err?.message?.includes('canceled')) {
        setPayError('Transaction cancelled — you closed the Pera Wallet window.')
      } else {
        setPayError(err?.message ?? 'Transaction failed.')
      }
    } finally {
      setLoading(false)
      setStep('')
    }
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold">
          Scan <span className="gradient-text">&amp; Pay</span>
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Generate a QR to receive ALGO · Scan a QR to pay instantly
        </p>
      </div>

      {/* ── Tab switcher ─────────────────────────────────────────────────────── */}
      <div className="flex rounded-2xl bg-surface-800 p-1 gap-1">
        {TABS.map((label, i) => (
          <button
            key={label}
            onClick={() => setActiveTab(i)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150
              ${activeTab === i
                ? 'bg-gradient-to-r from-cyan-500/30 to-purple-500/20 text-cyan-300 shadow-inner'
                : 'text-slate-500 hover:text-white'}`}
          >
            {i === 0 ? '⬇️ ' : '📷 '}
            {label}
          </button>
        ))}
      </div>

      {/* ══════════════════ TAB 0: Generate QR to Receive ══════════════════ */}
      {activeTab === 0 && (
        <div className="card">
          <h2 className="text-base font-semibold text-white mb-4">
            Generate QR to Receive
          </h2>
          <ReceiveQR />
        </div>
      )}

      {/* ══════════════════ TAB 1: Scan QR to Pay ══════════════════════════ */}
      {activeTab === 1 && (
        <div className="space-y-4">

          {/* ── Camera scanner ──────────────────────────────────────────── */}
          <div className="card">
            <h2 className="text-base font-semibold text-white mb-4">
              📷 Scan Receiver's QR Code
            </h2>
            <ScanQR onScan={handleScan} />
          </div>

          {/* ── Payment form (pre-filled after scan OR manual entry) ─────── */}
          <div className="card space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-white">
                {scanned ? '✅ QR Scanned — Confirm Payment' : 'Manual Entry'}
              </h2>
              {scanned && (
                <button onClick={clearForm} className="text-xs text-slate-500 hover:text-red-400 transition">
                  ✕ Clear
                </button>
              )}
            </div>

            {scanned && (
              <div className="rounded-xl px-4 py-3 bg-cyan-500/10 border border-cyan-500/20 text-sm">
                <p className="text-slate-400 text-xs mb-1">Sending to</p>
                <p className="font-mono text-cyan-300 break-all">{receiver}</p>
              </div>
            )}

            <form onSubmit={handlePay} className="space-y-4">
              {/* Receiver address */}
              {!scanned && (
                <div>
                  <label className="block text-sm text-slate-400 mb-1.5">
                    Receiver Address
                  </label>
                  <input
                    className="input font-mono text-xs"
                    placeholder="58-character Algorand address"
                    value={receiver}
                    onChange={e => setReceiver(e.target.value.trim())}
                    required
                  />
                </div>
              )}

              {/* Amount */}
              <div>
                <label className="block text-sm text-slate-400 mb-1.5">
                  Amount (ALGO)
                </label>
                <div className="relative">
                  <input
                    className="input pr-14"
                    type="number"
                    min="0.001"
                    step="0.001"
                    placeholder="e.g. 2.5"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    required
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-semibold">
                    ALGO
                  </span>
                </div>
                {state.balance !== null && (
                  <p className="text-xs text-slate-600 mt-1">
                    Available: {Number(state.balance).toFixed(4)} ALGO
                  </p>
                )}
              </div>

              {/* Note */}
              <div>
                <label className="block text-sm text-slate-400 mb-1.5">
                  Note <span className="text-slate-600">· optional</span>
                </label>
                <input
                  className="input"
                  type="text"
                  maxLength={64}
                  placeholder="e.g. Coffee payment"
                  value={note}
                  onChange={e => setNote(e.target.value)}
                />
              </div>

              {/* Loader */}
              {loading && <Loader text={step} />}

              {/* Error */}
              {payError && (
                <div className="rounded-xl px-4 py-3 bg-red-500/10 border border-red-500/20
                                text-red-300 text-sm">
                  ❌ {payError}
                </div>
              )}

              {/* Success */}
              {payOk && txId && (
                <div className="rounded-xl p-4 bg-green-500/10 border border-green-500/20 space-y-2">
                  <p className="text-green-400 font-semibold">✅ Payment Confirmed!</p>
                  <p className="text-xs text-slate-400">
                    Sent{' '}
                    <span className="text-white font-semibold">{amount} ALGO</span>
                    {' '}to{' '}
                    <span className="font-mono text-cyan-300">{shortenAddress(receiver)}</span>
                  </p>
                  <p className="font-mono text-xs text-slate-500 break-all">Tx: {txId}</p>
                  <a
                    href={explorerLink(txId)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-block text-xs text-cyan-400 hover:underline"
                  >
                    View on AlgoExplorer ↗
                  </a>
                </div>
              )}

              {/* Submit */}
              {!payOk && (
                <button
                  type="submit"
                  disabled={loading || !state.walletConnected}
                  className="btn-primary w-full justify-center py-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      {step || 'Processing…'}
                    </>
                  ) : (
                    `⚡ Send ${amount ? Number(amount).toFixed(3) + ' ALGO' : 'Payment'}`
                  )}
                </button>
              )}

              {!state.walletConnected && (
                <p className="text-xs text-yellow-400 text-center">
                  🟡 Connect your Pera Wallet to enable payments.
                </p>
              )}
            </form>
          </div>

          {/* ── How it works explainer ────────────────────────────────────── */}
          <div className="card text-xs text-slate-500 space-y-2">
            <p className="font-semibold text-slate-400 mb-2">How it works</p>
            {[
              ['1', 'Scan', 'Point camera at receiver\'s Algorand QR — address + amount auto-fill'],
              ['2', 'Confirm', 'Review the amount, edit if needed'],
              ['3', 'Sign', 'Pera Wallet opens — scan QR (desktop) or tap (mobile)'],
              ['4', 'Done', 'Signed txn lands on Algorand Testnet in ~4 seconds'],
            ].map(([n, title, desc]) => (
              <div key={n} className="flex gap-3">
                <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 font-bold
                                 flex items-center justify-center shrink-0 text-xs">
                  {n}
                </span>
                <p><span className="text-slate-300 font-medium">{title}:</span> {desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
