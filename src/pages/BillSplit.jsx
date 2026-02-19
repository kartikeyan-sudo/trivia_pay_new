import React, { useState, useCallback } from 'react'
import Modal from '../components/Modal'
import { useApp } from '../context/AppContext'
import { ACTIONS } from '../context/AppContext'
import { getBalance, makeNotificationTxn, submitSignedTxn } from '../services/blockchain'
import { buildPaymentURI } from '../services/algorand'
import { QRCodeSVG } from 'qrcode.react'
import peraWallet from '../services/peraWallet'

// ─── helpers ────────────────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2, 10)
const nowStr = () =>
  new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

export default function BillSplit() {
  const { state, dispatch } = useApp()

  // bills and notifications live in AppContext so all pages share them
  const bills = state.bills

  // ── create modal state ───────────────────────────────────────────────────
  const [showCreate, setShowCreate] = useState(false)
  const [step, setStep]             = useState(1)
  const [billName, setBillName]     = useState('')
  const [billTotal, setBillTotal]   = useState('')
  const [billNote, setBillNote]     = useState('')
  const [payeeRows, setPayeeRows]   = useState([{ id: uid(), name: '', address: '' }])
  const [formError, setFormError]   = useState('')

  // ── per-payee balance check: key = `${billId}:${payeeId}` ───────────────
  const [balChecks, setBalChecks] = useState({})
  const [checking,  setChecking]  = useState(null)

  // ── QR request modal ─────────────────────────────────────────────────────
  const [qrTarget, setQrTarget] = useState(null)
  // ── on-chain notification status ──────────────────────────────────────────
  const [notifStatus, setNotifStatus] = useState(null)  // null | 'sending' | 'ok' | 'skipped' | string(error)
  // ────────────────────────────────────────────────────────────────────────
  // Form helpers
  // ────────────────────────────────────────────────────────────────────────
  function openCreate() {
    setBillName(''); setBillTotal(''); setBillNote('')
    setPayeeRows([{ id: uid(), name: '', address: '' }])
    setFormError(''); setStep(1); setShowCreate(true)
  }

  function addPayeeRow() {
    setPayeeRows(r => [...r, { id: uid(), name: '', address: '' }])
  }

  function removePayeeRow(id) {
    setPayeeRows(r => r.length > 1 ? r.filter(row => row.id !== id) : r)
  }

  function updateRow(id, field, val) {
    setPayeeRows(r => r.map(row => row.id === id ? { ...row, [field]: val } : row))
  }

  // Step 1 submit → go to step 2
  function goToPayees(e) {
    e.preventDefault()
    if (!billName.trim()) return setFormError('Bill name is required.')
    const total = parseFloat(billTotal)
    if (!billTotal || isNaN(total) || total <= 0) return setFormError('Enter a valid ALGO amount.')
    setFormError(''); setStep(2)
  }

  // Step 2 submit → create bill + send on-chain notifications
  async function createBill(e) {
    e.preventDefault()
    const validRows = payeeRows.filter(r => r.name.trim() && r.address.trim())
    if (validRows.length < 1)
      return setFormError('Add at least one payee with a name and address.')
    for (const r of validRows) {
      if (r.address.trim().length !== 58)
        return setFormError(`"${r.name}" has an invalid Algorand address (must be 58 characters).`)
    }
    const total = parseFloat(billTotal)
    const share = parseFloat((total / validRows.length).toFixed(6))
    const newBill = {
      id:     uid(),
      name:   billName.trim(),
      note:   billNote.trim(),
      total,
      share,
      date:   nowStr(),
      creatorAddress: state.address ?? null,
      payees: validRows.map(r => ({
        id:      uid(),
        name:    r.name.trim(),
        address: r.address.trim(),
        status:  'notified',
      })),
    }

    // Push bill into shared context immediately (optimistic)
    dispatch({ type: ACTIONS.ADD_BILL, payload: newBill })
    setShowCreate(false)
    setNotifStatus(null)

    // ── Send on-chain notification transactions to each payee ─────────────────
    // Each payee receives a 0-ALGO txn whose note encodes the bill request.
    // When they connect their wallet, refreshAll() will detect these and
    // surface a payment notification automatically.
    if (!state.walletConnected || !state.address) {
      setNotifStatus('skipped')
      return
    }

    setNotifStatus('sending')
    try {
      // Build one notification txn per payee
      const notifTxns = await Promise.all(
        newBill.payees.map(p =>
          makeNotificationTxn(state.address, p.address, {
            billId:         newBill.id,
            billName:       newBill.name,
            billNote:       newBill.note,
            share:          newBill.share,
            total:          newBill.total,
            payeeName:      p.name,
            payeeAddress:   p.address,
            creatorAddress: state.address,
            date:           newBill.date,
          })
        )
      )

      // Sign all in one Pera Wallet prompt (each as its own group)
      const signedGroups = await peraWallet.signTransaction(
        notifTxns.map(txn => [{ txn, signers: [] }])
      )

      // Submit all notification txns (fire-and-forget — failures are non-critical)
      await Promise.allSettled(
        signedGroups.map(blob => submitSignedTxn(blob))
      )

      setNotifStatus('ok')
      setTimeout(() => setNotifStatus(null), 5000)
    } catch (err) {
      // Cancelled or network error — bill is already saved locally
      const msg = err?.message ?? ''
      if (msg.includes('closed') || msg.includes('cancel') || msg.includes('rejected')) {
        setNotifStatus('skipped')
      } else {
        setNotifStatus(`error: ${msg || 'Failed to send on-chain notifications'}`)
      }
      setTimeout(() => setNotifStatus(null), 6000)
    }
  }

  // ────────────────────────────────────────────────────────────────────────
  // Per-payee balance check
  // ────────────────────────────────────────────────────────────────────────
  const checkBalance = useCallback(async (billId, payeeId, address, share) => {
    const key = `${billId}:${payeeId}`
    setChecking(key)
    try {
      const balance = await getBalance(address)
      const canPay  = balance >= share
      setBalChecks(prev => ({
        ...prev,
        [key]: {
          balance: balance.toFixed(4),
          share:   share.toFixed(6),
          ok:      canPay,
        },
      }))
    } catch (err) {
      setBalChecks(prev => ({
        ...prev,
        [key]: { error: err?.message ?? 'Could not fetch balance' },
      }))
    } finally {
      setChecking(null)
    }
  }, [])

  // ────────────────────────────────────────────────────────────────────────
  // QR payment request
  // ────────────────────────────────────────────────────────────────────────
  function openQrRequest(bill, payee) {
    if (!state.address) return
    const uri = buildPaymentURI(state.address, bill.share, `Bill: ${bill.name}`)
    setQrTarget({ billName: bill.name, share: bill.share, payeeName: payee.name, uri })
  }

  // ────────────────────────────────────────────────────────────────────────
  // Mark paid / delete
  // ────────────────────────────────────────────────────────────────────────
  function markPaid(billId, payeeId) {
    dispatch({ type: ACTIONS.UPDATE_PAYEE_STATUS, payload: { billId, payeeId, status: 'paid' } })
  }

  function deleteBill(billId) {
    dispatch({ type: ACTIONS.DELETE_BILL, payload: billId })
  }

  // ────────────────────────────────────────────────────────────────────────
  // Derived stats
  // ────────────────────────────────────────────────────────────────────────
  const totalPending = bills.reduce((s, b) => s + b.payees.filter(p => p.status !== 'paid').length, 0)
  const totalSettled = bills.reduce((s, b) => s + b.payees.filter(p => p.status === 'paid').length, 0)
  const totalOwed    = bills.reduce((s, b) => s + b.payees.filter(p => p.status !== 'paid').length * b.share, 0)

  const pendingPayees = bills.flatMap(b =>
    b.payees.filter(p => p.status !== 'paid').map(p => ({
      ...p, billName: b.name, billId: b.id, share: b.share,
    }))
  )

  // ────────────────────────────────────────────────────────────────────────
  // Render
  // ────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            Bill <span className="gradient-text">Split</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">Create bills, add payees and track payments</p>
        </div>
        <button onClick={openCreate} className="btn-primary">
          + New Bill
        </button>
      </div>

      {/* On-chain notification status toast */}
      {notifStatus === 'sending' && (
        <div className="rounded-xl border border-green-500/30 bg-green-500/5 px-4 py-3 flex items-center gap-3">
          <span className="w-4 h-4 border-2 border-green-400/30 border-t-green-400 rounded-full animate-spin shrink-0" />
          <p className="text-green-300 text-sm">Sending on-chain payment requests to payees via Pera Wallet…</p>
        </div>
      )}
      {notifStatus === 'ok' && (
        <div className="rounded-xl border border-green-500/30 bg-green-500/8 px-4 py-3 text-green-300 text-sm">
          ✅ On-chain notifications sent — payees will see a payment request when they open Trivia Pay.
        </div>
      )}
      {notifStatus === 'skipped' && (
        <div className="rounded-xl border border-slate-500/30 bg-slate-500/5 px-4 py-3 text-slate-400 text-sm">
          ℹ️ Bill created locally. On-chain notifications were skipped (wallet not connected or signing cancelled).
        </div>
      )}
      {notifStatus?.startsWith?.('error:') && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-3 text-red-400 text-sm">
          ⚠️ Bill saved. {notifStatus.replace('error: ', '')}
        </div>
      )}

      {/* Notification banner */}
      {pendingPayees.length > 0 && (
        <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-4 space-y-2">
          <p className="text-yellow-300 font-semibold text-sm">
            🔔 {pendingPayees.length} payment{pendingPayees.length > 1 ? 's' : ''} pending
          </p>
          <div className="space-y-1">
            {pendingPayees.slice(0, 6).map(p => (
              <p key={`${p.billId}:${p.id}`} className="text-xs text-slate-400">
                <span className="text-white font-medium">{p.name}</span>
                {' '}owes{' '}
                <span className="text-cyan-400 font-semibold">{p.share?.toFixed(4)} ALGO</span>
                {' '}for <span className="text-slate-300">{p.billName}</span>
              </p>
            ))}
            {pendingPayees.length > 6 && (
              <p className="text-xs text-slate-500">…and {pendingPayees.length - 6} more</p>
            )}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Bills',    value: bills.length,         color: 'text-white' },
          { label: 'Pending Payees', value: totalPending,         color: 'text-yellow-400' },
          { label: 'Paid',           value: totalSettled,         color: 'text-green-400' },
          { label: 'ALGO Owed',      value: totalOwed.toFixed(3), color: 'text-cyan-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="card text-center py-4">
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-slate-500 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Empty state */}
      {bills.length === 0 && (
        <div className="card text-center py-16 text-slate-500">
          <p className="text-5xl mb-4">🧾</p>
          <p className="font-semibold text-slate-400 text-lg">No bills yet</p>
          <p className="text-sm mt-2">
            Click <strong className="text-white">+ New Bill</strong> to split your first expense
          </p>
        </div>
      )}

      {/* Bills list */}
      <div className="space-y-5">
        {bills.map(bill => {
          const paidCount  = bill.payees.filter(p => p.status === 'paid').length
          const progress   = bill.payees.length > 0
            ? Math.round((paidCount / bill.payees.length) * 100) : 0
          const allSettled = paidCount === bill.payees.length

          return (
            <div key={bill.id} className="card space-y-5">

              {/* Bill header */}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-white text-lg">{bill.name}</h3>
                    <span className={`badge text-xs ${allSettled ? 'badge-success' : 'badge-warning'}`}>
                      {allSettled ? '● Settled' : '● Pending'}
                    </span>
                  </div>
                  {bill.note && (
                    <p className="text-xs text-slate-500 mt-0.5 italic">"{bill.note}"</p>
                  )}
                  <p className="text-xs text-slate-500 mt-1">{bill.date}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xl font-bold text-white">
                    {bill.total.toFixed(3)}{' '}
                    <span className="text-sm text-slate-400">ALGO</span>
                  </p>
                  <p className="text-xs text-slate-500">
                    {bill.share.toFixed(4)} Ⓐ × {bill.payees.length}
                  </p>
                </div>
              </div>

              {/* Progress bar */}
              <div>
                <div className="flex justify-between text-xs text-slate-400 mb-1.5">
                  <span>{paidCount} / {bill.payees.length} paid</span>
                  <span>{progress}%</span>
                </div>
                <div className="progress-track">
                  <div
                    className="progress-fill"
                    style={{
                      width: `${progress}%`,
                      background: allSettled ? '#22c55e' : undefined,
                    }}
                  />
                </div>
              </div>

              {/* Payees */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
                  Payees
                </p>

                {bill.payees.map(payee => {
                  const key    = `${bill.id}:${payee.id}`
                  const check  = balChecks[key]
                  const isChk  = checking === key

                  return (
                    <div
                      key={payee.id}
                      className={`rounded-xl border px-4 py-3 space-y-2
                        ${payee.status === 'paid'
                          ? 'border-green-500/20 bg-green-500/5'
                          : 'border-white/8 bg-white/3'}`}
                    >
                      {/* Top row: name + share + actions */}
                      <div className="flex flex-wrap items-center gap-3">
                        {/* Name + address */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-white text-sm">{payee.name}</p>
                            {payee.status === 'paid' && (
                              <span className="badge badge-success text-xs">✓ Paid</span>
                            )}
                            {payee.status === 'notified' && (
                              <span className="badge badge-warning text-xs">🔔 Notified</span>
                            )}
                          </div>
                          <p className="font-mono text-xs text-slate-500 mt-0.5 truncate">
                            {payee.address}
                          </p>
                        </div>

                        {/* Share */}
                        <p className="text-cyan-400 font-semibold text-sm shrink-0">
                          {bill.share.toFixed(4)} ALGO
                        </p>

                        {/* Action buttons */}
                        {payee.status !== 'paid' && (
                          <div className="flex items-center gap-2 flex-wrap shrink-0">
                            <button
                              onClick={() =>
                                checkBalance(bill.id, payee.id, payee.address, bill.share)
                              }
                              disabled={isChk}
                              className="btn-ghost text-xs px-3 py-1.5 disabled:opacity-50"
                            >
                              {isChk ? '⏳ Checking…' : '💰 Check Balance'}
                            </button>

                            {state.walletConnected && state.address && (
                              <button
                                onClick={() => openQrRequest(bill, payee)}
                                className="btn-ghost text-xs px-3 py-1.5"
                              >
                                📲 Request QR
                              </button>
                            )}

                            <button
                              onClick={() => markPaid(bill.id, payee.id)}
                              className="btn-ghost text-xs px-3 py-1.5 text-green-400 hover:text-green-300"
                            >
                              ✓ Mark Paid
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Balance check result */}
                      {check && (
                        <div
                          className={`rounded-lg px-3 py-2 text-xs font-medium
                            ${check.error
                              ? 'bg-slate-500/15 text-slate-400 border border-slate-500/20'
                              : check.ok
                              ? 'bg-green-500/15 text-green-300 border border-green-500/20'
                              : 'bg-red-500/15 text-red-300 border border-red-500/20'}`}
                        >
                          {check.error && <>⚠️ {check.error}</>}
                          {!check.error && check.ok && (
                            <>
                              ✅ Sufficient balance —{' '}
                              <span className="font-mono">{check.balance} ALGO</span> available,
                              needs {check.share} ALGO
                            </>
                          )}
                          {!check.error && !check.ok && (
                            <>
                              ❌ Insufficient balance —{' '}
                              <span className="font-mono">{check.balance} ALGO</span> available,
                              needs <span className="font-mono">{check.share} ALGO</span>. 
                              Ask them to top up their wallet first.
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Delete */}
              <div className="flex justify-end">
                <button
                  onClick={() => deleteBill(bill.id)}
                  className="text-xs text-slate-600 hover:text-red-400 transition-colors"
                >
                  🗑 Delete bill
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* ═══════════════════════════════════ CREATE BILL MODAL ══════════ */}
      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title={step === 1 ? 'New Bill — Details' : `Add Payees · ${billName}`}
      >
        {/* Step 1 — details */}
        {step === 1 && (
          <form onSubmit={goToPayees} className="space-y-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1.5">Bill Name</label>
              <input
                className="input"
                placeholder="e.g. Pizza Night"
                value={billName}
                onChange={e => { setBillName(e.target.value); setFormError('') }}
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1.5">Total Amount (ALGO)</label>
              <input
                className="input"
                type="number"
                min="0.001"
                step="0.001"
                placeholder="e.g. 12.0"
                value={billTotal}
                onChange={e => { setBillTotal(e.target.value); setFormError('') }}
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1.5">Note (optional)</label>
              <input
                className="input"
                placeholder="e.g. Includes tax and tips"
                value={billNote}
                onChange={e => setBillNote(e.target.value)}
              />
            </div>
            {formError && (
              <p className="text-sm text-red-400 bg-red-500/10 rounded-lg px-3 py-2">{formError}</p>
            )}
            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="btn-ghost flex-1 justify-center"
              >
                Cancel
              </button>
              <button type="submit" className="btn-primary flex-1 justify-center">
                Next: Add Payees →
              </button>
            </div>
          </form>
        )}

        {/* Step 2 — payees */}
        {step === 2 && (
          <form onSubmit={createBill} className="space-y-4">
            {/* Summary pill */}
            <div className="rounded-xl bg-white/4 border border-white/8 px-4 py-3 flex justify-between items-center">
              <div>
                <p className="text-white font-semibold">{billName}</p>
                {billNote && <p className="text-xs text-slate-500 italic">"{billNote}"</p>}
              </div>
              <div className="text-right">
                <p className="text-cyan-400 font-bold">{parseFloat(billTotal || 0).toFixed(3)} ALGO</p>
                {payeeRows.filter(r => r.name && r.address).length > 0 && (
                  <p className="text-xs text-slate-500">
                    ÷ {payeeRows.filter(r => r.name && r.address).length} ={' '}
                    {(
                      parseFloat(billTotal) /
                      payeeRows.filter(r => r.name && r.address).length
                    ).toFixed(4)}{' '}
                    each
                  </p>
                )}
              </div>
            </div>

            {/* Column headers */}
            <div className="grid grid-cols-[1fr_1.4fr_auto] gap-2 px-1">
              <p className="text-xs text-slate-500">Name</p>
              <p className="text-xs text-slate-500">Algorand Address</p>
              <span />
            </div>

            {/* Dynamic rows */}
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {payeeRows.map((row, idx) => (
                <div key={row.id} className="grid grid-cols-[1fr_1.4fr_auto] gap-2 items-center">
                  <input
                    className="input text-sm py-2"
                    placeholder={`Person ${idx + 1}`}
                    value={row.name}
                    onChange={e => { updateRow(row.id, 'name', e.target.value); setFormError('') }}
                  />
                  <input
                    className="input text-xs py-2 font-mono"
                    placeholder="58-char address"
                    value={row.address}
                    onChange={e => {
                      updateRow(row.id, 'address', e.target.value.trim()); setFormError('')
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => removePayeeRow(row.id)}
                    className="p-2 text-slate-500 hover:text-red-400 transition-colors"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            {/* Add row */}
            <button
              type="button"
              onClick={addPayeeRow}
              className="w-full rounded-xl border border-dashed border-white/15 py-2 text-sm
                         text-slate-400 hover:text-white hover:border-white/30 transition"
            >
              + Add Another Payee
            </button>

            {formError && (
              <p className="text-sm text-red-400 bg-red-500/10 rounded-lg px-3 py-2">{formError}</p>
            )}

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="btn-ghost flex-1 justify-center"
              >
                ← Back
              </button>
              <button type="submit" className="btn-primary flex-1 justify-center">
                🔔 Create &amp; Notify
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* ═══════════════════════════════════ QR REQUEST MODAL ═══════════ */}
      <Modal
        open={!!qrTarget}
        onClose={() => setQrTarget(null)}
        title={`Payment Request — ${qrTarget?.payeeName ?? ''}`}
      >
        {qrTarget && (
          <div className="space-y-5">
            <p className="text-sm text-slate-400 text-center">
              Ask <span className="text-white font-medium">{qrTarget.payeeName}</span> to scan
              this with Pera Wallet to send{' '}
              <span className="text-cyan-400 font-semibold">
                {qrTarget.share.toFixed(4)} ALGO
              </span>{' '}
              for <span className="text-white">"{qrTarget.billName}"</span>.
            </p>

            <div className="flex justify-center">
              <div className="rounded-2xl p-4 bg-white">
                <QRCodeSVG
                  value={qrTarget.uri}
                  size={220}
                  fgColor="#0e1628"
                  bgColor="#ffffff"
                  level="M"
                />
              </div>
            </div>

            <div className="rounded-xl bg-white/4 border border-white/8 px-3 py-2">
              <p className="text-xs text-slate-500 mb-1">Payment URI</p>
              <p className="font-mono text-xs text-cyan-400 break-all">{qrTarget.uri}</p>
            </div>

            <button
              onClick={() => navigator.clipboard?.writeText(qrTarget.uri)}
              className="btn-ghost w-full justify-center text-sm"
            >
              📋 Copy URI
            </button>
          </div>
        )}
      </Modal>
    </div>
  )
}

