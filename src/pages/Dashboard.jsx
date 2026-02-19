import React from 'react'
import StatCard from '../components/StatCard'
import TxTable from '../components/TxTable'
import WalletConnectBtn from '../components/WalletConnectBtn'
import Loader from '../components/Loader'
import ReceiveQR from '../components/ReceiveQR'
import { useApp } from '../context/AppContext'

export default function Dashboard() {
  const { state, refreshAll } = useApp()
  const loadingChain = state.loading
  const chainError   = state.fetchError

  const escrowDisplay = state.escrowAddress
    ? `${state.escrowAddress.slice(0, 10)}…${state.escrowAddress.slice(-6)}`
    : 'Not configured'

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">
            Welcome to <span className="gradient-text">Trivia Pay</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Algorand Payment Organizer · {state.network.charAt(0).toUpperCase() + state.network.slice(1)}
          </p>
        </div>
        <WalletConnectBtn />
      </div>

      {/* Info ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-xl px-4 py-3 border border-cyan-500/20 bg-cyan-500/5 flex items-center gap-3">
          <span className="text-cyan-400 text-lg">🔗</span>
          <div>
            <p className="text-xs text-slate-500">Network</p>
            <p className="font-semibold text-cyan-300 uppercase text-sm">{state.network}</p>
          </div>
        </div>
        <div className="rounded-xl px-4 py-3 border border-purple-500/20 bg-purple-500/5 flex items-center gap-3">
          <span className="text-purple-400 text-lg">🆔</span>
          <div>
            <p className="text-xs text-slate-500">App ID</p>
            <p className="font-mono font-semibold text-purple-300 text-sm">
              {state.appId || <span className="text-slate-500 italic">Set in Settings</span>}
            </p>
          </div>
        </div>
        <div className="rounded-xl px-4 py-3 border border-green-500/20 bg-green-500/5 flex items-center gap-3">
          <span className="text-green-400 text-lg">💼</span>
          <div>
            <p className="text-xs text-slate-500">Wallet</p>
            <p className="font-semibold text-sm text-green-300">
              {state.walletConnected
                ? `${state.address?.slice(0, 8)}…`
                : '○ Disconnected'}
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {(() => {
          const totalAllocated = state.goals.reduce((s, g) => s + g.current, 0)
          const available = state.balance !== null ? Math.max(0, state.balance - totalAllocated) : null
          return (
            <>
              <StatCard
                title="My Balance"
                value={state.balance !== null ? `${Number(state.balance).toFixed(3)} Ⓐ` : '—'}
                sub={state.walletConnected ? 'Live from Testnet' : 'Connect wallet'}
                accent="cyan"
                icon="💳"
              />
              <StatCard
                title="Available"
                value={available !== null ? `${available.toFixed(3)} Ⓐ` : '—'}
                sub={
                  state.goals.length > 0
                    ? `−${totalAllocated.toFixed(3)} Ⓐ in goals`
                    : 'No goal allocations'
                }
                accent={totalAllocated > 0 ? 'yellow' : 'cyan'}
                icon="💡"
              />
            </>
          )
        })()}
        <StatCard
          title="Pool / Escrow"
          value={state.escrowBalance !== null ? `${Number(state.escrowBalance).toFixed(3)} Ⓐ` : '—'}
          sub={state.escrowAddress ? 'Escrow on-chain' : 'Set escrow in Settings'}
          accent="purple"
          icon="💰"
        />
        <StatCard
          title="App Global State"
          value={state.appGlobalState.length > 0 ? `${state.appGlobalState.length} keys` : '—'}
          sub={state.appId ? `App #${state.appId}` : 'Set App ID in Settings'}
          accent="green"
          icon="📋"
        />
        <StatCard
          title="Recent Txs"
          value={state.recentTxs.length}
          sub="Loaded from Indexer"
          accent="yellow"
          icon="🔁"
        />
      </div>

      {/* Loading / error */}
      {loadingChain && <Loader text="Fetching live data from Testnet…" />}
      {chainError && (
        <div className="rounded-xl px-4 py-3 border border-red-500/30 bg-red-500/5 text-red-400 text-sm">
          ⚠️ {chainError}
        </div>
      )}

      {/* ── Bill Notifications ────────────────────────────────────────── */}
      {(() => {
        const addr = state.address
        // Bills where I am a payee (I owe someone)
        const iOwe = state.bills.flatMap(b =>
          b.payees
            .filter(p => p.address === addr && p.status !== 'paid')
            .map(p => ({ ...p, billName: b.name, share: b.share, billId: b.id, creatorAddress: b.creatorAddress }))
        )
        // Bills I created with pending payees (others owe me)
        const owedToMe = state.bills
          .filter(b => b.creatorAddress === addr)
          .flatMap(b =>
            b.payees
              .filter(p => p.status !== 'paid')
              .map(p => ({ ...p, billName: b.name, share: b.share, billId: b.id }))
          )
        // On-chain payment requests received from other wallets
        const onChainRequests = state.notifications.filter(n => n.type === 'bill_request')

        if (!addr || (iOwe.length === 0 && owedToMe.length === 0 && onChainRequests.length === 0)) return null
        return (
          <div className="space-y-3">
            {/* On-chain payment requests */}
            {onChainRequests.length > 0 && (
              <div className="rounded-xl border border-green-500/25 bg-green-500/5 p-4 space-y-2">
                <p className="text-green-300 font-semibold text-sm flex items-center gap-1.5">
                  🔔 {onChainRequests.length} on-chain payment request{onChainRequests.length > 1 ? 's' : ''}
                </p>
                {onChainRequests.map(n => (
                  <div key={n.id} className="flex items-center justify-between gap-2 text-xs">
                    <span className="text-slate-400">
                      <span className="text-white font-medium">{n.billName}</span>
                      {n.billNote && <span className="italic text-slate-500"> — "{n.billNote}"</span>}
                      {' '}from{' '}
                      <span className="font-mono text-slate-500">
                        {n.creatorAddress ? `${n.creatorAddress.slice(0, 8)}…` : '?'}
                      </span>
                    </span>
                    <span className="text-green-300 font-semibold">{Number(n.share).toFixed(4)} ALGO</span>
                  </div>
                ))}
                <p className="text-xs text-slate-500 pt-1">
                  Open <span className="text-white font-medium">Scan &amp; Pay</span> to send payment.
                </p>
              </div>
            )}
            {/* I owe (local bills) */}
            {iOwe.length > 0 && (
              <div className="rounded-xl border border-red-500/25 bg-red-500/5 p-4 space-y-2">
                <p className="text-red-300 font-semibold text-sm">💸 You owe payment for {iOwe.length} bill{iOwe.length > 1 ? 's' : ''}</p>
                {iOwe.map(p => (
                  <div key={`${p.billId}:${p.id}`} className="flex items-center justify-between gap-2 text-xs">
                    <span className="text-slate-400">
                      <span className="text-white font-medium">{p.billName}</span> →{' '}
                      <span className="font-mono text-slate-500">{p.creatorAddress?.slice(0, 8)}…</span>
                    </span>
                    <span className="text-red-300 font-semibold">{p.share?.toFixed(4)} ALGO</span>
                  </div>
                ))}
              </div>
            )}
            {/* Owed to me */}
            {owedToMe.length > 0 && (
              <div className="rounded-xl border border-yellow-500/25 bg-yellow-500/5 p-4 space-y-2">
                <p className="text-yellow-300 font-semibold text-sm">🔔 {owedToMe.length} payee{owedToMe.length > 1 ? 's' : ''} still owe you</p>
                {owedToMe.map(p => (
                  <div key={`${p.billId}:${p.id}`} className="flex items-center justify-between gap-2 text-xs">
                    <span className="text-slate-400">
                      <span className="text-white font-medium">{p.name}</span> for <span className="text-slate-300">{p.billName}</span>
                    </span>
                    <span className="text-yellow-300 font-semibold">{p.share?.toFixed(4)} ALGO</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })()}

      {/* ── Goals Summary ────────────────────────────────────────────── */}
      {state.goals.length > 0 && (() => {
        const totalAllocated = state.goals.reduce((s, g) => s + g.current, 0)
        const available = state.balance !== null ? Math.max(0, state.balance - totalAllocated) : null
        const inProgress = state.goals.filter(g => g.current < g.target)
        return (
          <div className="card space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-white">🎯 Savings Goals</h2>
              <span className="text-xs text-slate-500">{state.goals.length} goal{state.goals.length > 1 ? 's' : ''}</span>
            </div>
            {/* Balance breakdown */}
            {available !== null && (
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="rounded-xl bg-white/4 border border-white/8 py-3">
                  <p className="text-sm font-bold text-white">{Number(state.balance).toFixed(3)}</p>
                  <p className="text-xs text-slate-500 mt-0.5">Total Balance</p>
                </div>
                <div className="rounded-xl bg-red-500/8 border border-red-500/20 py-3">
                  <p className="text-sm font-bold text-red-400">−{totalAllocated.toFixed(3)}</p>
                  <p className="text-xs text-slate-500 mt-0.5">Allocated</p>
                </div>
                <div className="rounded-xl bg-green-500/8 border border-green-500/20 py-3">
                  <p className="text-sm font-bold text-green-400">{available.toFixed(3)}</p>
                  <p className="text-xs text-slate-500 mt-0.5">Available</p>
                </div>
              </div>
            )}
            {/* In-progress goals */}
            {inProgress.slice(0, 3).map(g => {
              const pct = Math.min(100, Math.round((g.current / g.target) * 100))
              return (
                <div key={g.id} className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-white font-medium">{g.icon} {g.name}</span>
                    <span className="text-slate-400">{g.current.toFixed(3)} / {g.target} ALGO · {pct}%</span>
                  </div>
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
            {inProgress.length > 3 && (
              <p className="text-xs text-slate-500 text-right">+{inProgress.length - 3} more in Goal Tracker</p>
            )}
          </div>
        )
      })()}

      {/* App Global State viewer */}
      {state.appGlobalState.length > 0 && (
        <div className="card space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-white">Smart Contract State</h2>
            <span className="badge badge-purple">App #{state.appId}</span>
          </div>
          <div className="divide-y divide-white/5">
            {state.appGlobalState.map(({ key, value }) => (
              <div key={key} className="flex justify-between py-2 text-sm">
                <span className="font-mono text-slate-400">{key}</span>
                <span className="font-mono text-cyan-300">{String(value)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Transactions */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-white">Recent Transactions</h2>
          {state.walletConnected && (
            <button
              onClick={() => refreshAll()}
              disabled={loadingChain}
              className="btn-ghost text-xs px-3 py-1.5 disabled:opacity-50"
            >
              ↺ Refresh
            </button>
          )}
        </div>
        {state.recentTxs.length > 0 ? (
          <TxTable transactions={state.recentTxs} />
        ) : (
          <div className="card text-center py-8 text-slate-500">
            {state.walletConnected
              ? 'No transactions found for this address on Testnet.'
              : 'Connect your wallet to see transactions.'}
          </div>
        )}
      </div>

      {/* ── My Receive QR widget ────────────────────────────────────────── */}
      {state.walletConnected && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <ReceiveQR compact />
          {/* Escrow address (moved inline) */}
          <div className="card">
            <p className="text-xs text-slate-500 mb-2 font-medium uppercase tracking-widest">
              Escrow / Pool Address
            </p>
            <div className="flex items-center gap-3">
              <p className="font-mono text-sm text-cyan-400 break-all">
                {state.escrowAddress || (
                  <span className="text-slate-600 italic">Not set — configure in Settings</span>
                )}
              </p>
              {state.escrowAddress && (
                <button
                  className="shrink-0 btn-ghost text-xs px-3 py-1.5"
                  onClick={() => navigator.clipboard?.writeText(state.escrowAddress)}
                >
                  Copy
                </button>
              )}
            </div>
            {state.escrowAddress && (
              <a
                href={`https://testnet.algoexplorer.io/address/${state.escrowAddress}`}
                target="_blank"
                rel="noreferrer"
                className="inline-block mt-2 text-xs text-cyan-500 hover:underline"
              >
                View on Explorer ↗
              </a>
            )}
          </div>
        </div>
      )}

      {/* Escrow address (disconnected fallback) */}
      {!state.walletConnected && <div className="card">
        <p className="text-xs text-slate-500 mb-2 font-medium uppercase tracking-widest">
          Escrow / Pool Address
        </p>
        <div className="flex items-center gap-3">
          <p className="font-mono text-sm text-cyan-400 break-all">
            {state.escrowAddress || (
              <span className="text-slate-600 italic">Not set — configure in Settings</span>
            )}
          </p>
          {state.escrowAddress && (
            <button
              className="shrink-0 btn-ghost text-xs px-3 py-1.5"
              onClick={() => navigator.clipboard?.writeText(state.escrowAddress)}
            >
              Copy
            </button>
          )}
        </div>
        {state.escrowAddress && (
          <a
            href={`https://testnet.algoexplorer.io/address/${state.escrowAddress}`}
            target="_blank"
            rel="noreferrer"
            className="inline-block mt-2 text-xs text-cyan-500 hover:underline"
          >
            View on Explorer ↗
          </a>
        )}
      </div>}
    </div>
  )
}
