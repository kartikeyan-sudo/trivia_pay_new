import React from 'react'
import Loader from '../components/Loader'
import { useApp } from '../context/AppContext'
import { ACTIONS } from '../context/AppContext'

export default function PaymentTracker() {
  const { state, dispatch, refreshAll } = useApp()
  const loading    = state.loading
  const chainError = state.fetchError
  const addr       = state.address

  // â”€â”€ Derive bill views from shared bills state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const allBills = state.bills

  // Bills I created â†’ show per-payee statuses (people owe me)
  const myBills = allBills.filter(b => b.creatorAddress === addr)

  // Bills where I am a payee â†’ I owe
  const iOweBills = allBills.flatMap(b =>
    b.payees
      .filter(p => p.address === addr)
      .map(p => ({ ...p, billName: b.name, billId: b.id, share: b.share, date: b.date, creatorAddress: b.creatorAddress }))
  )

  // Settled entries across all bills (for payment history)
  const settledPayments = allBills.flatMap(b =>
    b.payees
      .filter(p => p.status === 'paid')
      .map(p => ({
        payeeName:    p.name,
        payeeAddress: p.address,
        billName:     b.name,
        share:        b.share,
        date:         b.date,
        isMine:       b.creatorAddress === addr,
      }))
  )

  // Summary stats
  const totalOwedToMe  = myBills.reduce((s, b) =>
    s + b.payees.filter(p => p.status !== 'paid').length * b.share, 0)
  const totalIOwe = iOweBills.filter(p => p.status !== 'paid')
    .reduce((s, p) => s + p.share, 0)

  function markPaid(billId, payeeId) {
    dispatch({ type: ACTIONS.UPDATE_PAYEE_STATUS, payload: { billId, payeeId, status: 'paid' } })
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            Payment <span className="gradient-text">Tracker</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">Who owes you Â· What you owe Â· Full history</p>
        </div>
        <button
          onClick={() => refreshAll()}
          disabled={loading}
          className="btn-secondary text-sm px-4 py-2 disabled:opacity-40"
        >
          {loading ? 'â€¦' : 'â†» Refresh'}
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="card text-center py-4">
          <p className="text-2xl font-bold text-white">{allBills.length}</p>
          <p className="text-xs text-slate-500 mt-1">Total Bills</p>
        </div>
        <div className="card text-center py-4">
          <p className="text-2xl font-bold text-yellow-400">
            {myBills.reduce((s, b) => s + b.payees.filter(p => p.status !== 'paid').length, 0)}
          </p>
          <p className="text-xs text-slate-500 mt-1">Awaiting Payment</p>
        </div>
        <div className="card text-center py-4">
          <p className="text-2xl font-bold text-cyan-400">{totalOwedToMe.toFixed(3)}</p>
          <p className="text-xs text-slate-500 mt-1">ALGO Owed to You</p>
        </div>
        <div className="card text-center py-4">
          <p className="text-2xl font-bold text-red-400">{totalIOwe.toFixed(3)}</p>
          <p className="text-xs text-slate-500 mt-1">ALGO You Owe</p>
        </div>
      </div>

      {loading && <Loader text="Fetching from Testnetâ€¦" />}
      {chainError && (
        <div className="rounded-xl px-4 py-3 border border-red-500/30 bg-red-500/5 text-red-400 text-sm">
          âš ï¸ {chainError}
        </div>
      )}

      {/* â”€â”€ Bills you created (others owe you) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {myBills.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-widest">
            ðŸ”” Owed to You
          </h2>
          {myBills.map(bill => {
            const pendingPayees = bill.payees.filter(p => p.status !== 'paid')
            const paidPayees    = bill.payees.filter(p => p.status === 'paid')
            const progress      = bill.payees.length
              ? Math.round((paidPayees.length / bill.payees.length) * 100) : 0

            return (
              <div key={bill.id} className="card space-y-4">
                {/* Bill header */}
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-white">{bill.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{bill.date}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-white">{bill.total.toFixed(3)} ALGO</p>
                    <p className="text-xs text-slate-500">{bill.share.toFixed(4)} â’¶ / person</p>
                  </div>
                </div>

                {/* Progress */}
                <div>
                  <div className="flex justify-between text-xs text-slate-400 mb-1">
                    <span>{paidPayees.length} / {bill.payees.length} paid</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${progress}%` }} />
                  </div>
                </div>

                {/* Payees */}
                <div className="space-y-2">
                  {bill.payees.map(payee => (
                    <div
                      key={payee.id}
                      className={`flex flex-wrap items-center justify-between gap-3 rounded-xl px-4 py-2.5
                        ${payee.status === 'paid'
                          ? 'border border-green-500/20 bg-green-500/5'
                          : 'border border-white/8 bg-white/3'}`}
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan-500 to-purple-500
                                        flex items-center justify-center text-white font-bold text-xs shrink-0">
                          {payee.name?.[0]?.toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm text-white font-medium">{payee.name}</p>
                          <p className="text-xs font-mono text-slate-500 truncate">{payee.address}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-sm font-semibold text-cyan-400">
                          {bill.share.toFixed(4)} ALGO
                        </span>
                        {payee.status === 'paid' ? (
                          <span className="badge badge-success text-xs">âœ“ Paid</span>
                        ) : (
                          <>
                            <span className="badge badge-warning text-xs">ðŸ”” Pending</span>
                            <button
                              onClick={() => markPaid(bill.id, payee.id)}
                              className="btn-ghost text-xs px-3 py-1 text-green-400 hover:text-green-300"
                            >
                              âœ“ Mark Paid
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* â”€â”€ Bills where you owe â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {iOweBills.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-widest">
            ðŸ’¸ You Owe
          </h2>
          {iOweBills.map(payee => (
            <div
              key={`${payee.billId}:${payee.id}`}
              className={`card flex flex-wrap items-center justify-between gap-4
                ${payee.status === 'paid' ? 'opacity-60' : ''}`}
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="text-2xl">{payee.status === 'paid' ? 'âœ…' : 'â³'}</div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white">
                    You â†’ <span className="font-mono text-slate-400 text-xs">{payee.creatorAddress?.slice(0, 8)}â€¦</span>
                  </p>
                  <p className="text-xs text-slate-500">
                    For: <span className="text-slate-300">{payee.billName}</span> Â· {payee.date}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-lg font-bold text-white">{payee.share?.toFixed(4)} ALGO</span>
                {payee.status === 'paid'
                  ? <span className="badge badge-success">Settled</span>
                  : <span className="badge badge-error">Pending</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* â”€â”€ Payment history â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {settledPayments.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-widest">
            âœ… Payment History
          </h2>
          <div className="card p-0 overflow-hidden divide-y divide-white/5">
            {settledPayments.map((p, i) => (
              <div key={i} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div>
                  <p className="text-sm text-white">
                    <span className={p.isMine ? 'text-green-400' : 'text-cyan-400'}>
                      {p.payeeName}
                    </span>
                    {' '}paid for <span className="font-medium">{p.billName}</span>
                  </p>
                  <p className="text-xs text-slate-500 font-mono">{p.payeeAddress?.slice(0, 12)}â€¦</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-green-400">{p.share?.toFixed(4)} ALGO</span>
                  <span className="badge badge-success text-xs">âœ“ Settled</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {allBills.length === 0 && (
        <div className="card text-center py-16 text-slate-500">
          <p className="text-5xl mb-4">ðŸ“Š</p>
          <p className="font-semibold text-slate-400 text-lg">No payment data yet</p>
          <p className="text-sm mt-2">Create a bill in <strong className="text-white">Bill Split</strong> to start tracking</p>
        </div>
      )}

      {/* â”€â”€ Smart Contract Global State â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-widest">
            Contract State (Live)
          </h2>
          <div className="flex items-center gap-2">
            {state.appId
              ? <span className="badge badge-purple text-xs">App #{state.appId}</span>
              : <span className="text-xs text-yellow-400">No App ID â€” set in Settings</span>}
            <button
              onClick={() => refreshAll()}
              disabled={loading || !state.appId}
              className="btn-ghost text-xs px-3 py-1.5 disabled:opacity-40"
            >
              â†º Refresh
            </button>
          </div>
        </div>
        {!loading && state.appGlobalState.length > 0 ? (
          <div className="card divide-y divide-white/5">
            {state.appGlobalState.map(({ key, value }) => (
              <div key={key} className="flex justify-between py-2.5 text-sm">
                <span className="font-mono text-slate-400">{key}</span>
                <span className="font-mono text-cyan-300 font-medium">{String(value)}</span>
              </div>
            ))}
          </div>
        ) : (
          !loading && (
            <div className="card text-center py-6 text-slate-500 text-sm">
              {state.appId
                ? 'No global state found for this App ID.'
                : 'Configure an App ID in Settings to read contract state.'}
            </div>
          )
        )}
      </div>
    </div>
  )
}
