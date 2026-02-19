import React, { useState, useEffect } from 'react'
import TxTable from '../components/TxTable'
import Loader from '../components/Loader'
import { useApp } from '../context/AppContext'

// Labels must match what formatTx() returns for tx.type
const TYPE_OPTIONS   = ['All', 'Payment', 'App Call', 'Asset Transfer']
const STATUSES       = ['All', 'success', 'pending', 'failed']

export default function Transactions() {
  const { state, refreshAll } = useApp()

  // Trigger a refresh whenever this page mounts (if wallet is connected)
  useEffect(() => {
    if (state.walletConnected && state.address) {
      refreshAll(state.address)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // All tx data is maintained centrally by AppContext (refreshed every 30 s + on wallet connect)
  const allTxs  = state.recentTxs
  const loading = state.loading
  const error   = state.fetchError

  const [typeFilter,   setTypeFilter]   = useState('All')   // matches TYPE_OPTIONS labels
  const [statusFilter, setStatusFilter] = useState('All')
  const [search,       setSearch]       = useState('')

  const filtered = allTxs.filter(tx => {
    const matchType   = typeFilter   === 'All' || tx.type === typeFilter
    const matchStatus = statusFilter === 'All' || tx.status === statusFilter
    const matchSearch = !search ||
      tx.id.toLowerCase().includes(search.toLowerCase()) ||
      (tx.sender   || '').toLowerCase().includes(search.toLowerCase()) ||
      (tx.receiver || '').toLowerCase().includes(search.toLowerCase())
    return matchType && matchStatus && matchSearch
  })

  const totalAmt = filtered
    .filter(t => t.status === 'success')
    .reduce((s, t) => s + parseFloat(t.amount || 0), 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            Transaction <span className="gradient-text">History</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Live Indexer data · Algorand Testnet
          </p>
        </div>
        <button
          onClick={() => refreshAll()}
          disabled={loading || !state.walletConnected}
          className="btn-secondary text-sm px-4 py-2 disabled:opacity-40"
        >
          {loading ? '…' : '↻ Refresh'}
        </button>
      </div>

      {/* Not connected banner */}
      {!state.walletConnected && (
        <div className="rounded-xl p-4 bg-yellow-500/10 border border-yellow-500/20 text-yellow-300 text-sm">
          🟡 Connect your Pera Wallet to view real transaction history.
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card text-center py-4">
          <p className="text-2xl font-bold text-white">{allTxs.length}</p>
          <p className="text-xs text-slate-500 mt-1">Total Fetched</p>
        </div>
        <div className="card text-center py-4">
          <p className="text-2xl font-bold text-cyan-400">{totalAmt.toFixed(3)} Ⓐ</p>
          <p className="text-xs text-slate-500 mt-1">Volume (filtered)</p>
        </div>
        <div className="card text-center py-4">
          <p className="text-2xl font-bold text-yellow-400">
            {allTxs.filter(t => t.status === 'pending').length}
          </p>
          <p className="text-xs text-slate-500 mt-1">Pending</p>
        </div>
      </div>

      {/* Loader / error */}
      {loading && <Loader text="Fetching from Indexer…" />}
      {error && (
        <div className="rounded-xl p-4 bg-red-500/10 border border-red-500/20 text-red-300 text-sm">
          ❌ {error}
        </div>
      )}

      {/* Filters */}
      {!loading && (
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            className="input flex-1"
            placeholder="Search by Tx ID, sender, receiver…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <select
            className="input sm:w-40"
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
          >
            {TYPE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select
            className="input sm:w-40"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            {STATUSES.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
      )}

      {/* Table */}
      {!loading && allTxs.length > 0 && (
        <>
          <TxTable transactions={filtered} />
          <p className="text-xs text-slate-500 text-right">
            Showing {filtered.length} of {allTxs.length} transactions
          </p>
        </>
      )}

      {/* Explorer links */}
      {!loading && state.walletConnected && allTxs.length === 0 && !error && (
        <div className="card text-center py-8 text-slate-500 text-sm">
          No transactions found for this address on Testnet.
        </div>
      )}

      {state.walletConnected && (
        <div className="card text-xs text-slate-500 flex flex-col gap-1">
          <p className="font-semibold text-slate-400 mb-1">Explorer Links</p>
          <a
            href={`https://testnet.algoexplorer.io/address/${state.address}`}
            target="_blank" rel="noreferrer"
            className="text-cyan-500 hover:underline truncate"
          >
            🔗 View wallet on AlgoExplorer
          </a>
          {state.escrowAddress && (
            <a
              href={`https://testnet.algoexplorer.io/address/${state.escrowAddress}`}
              target="_blank" rel="noreferrer"
              className="text-purple-400 hover:underline truncate"
            >
              🔗 View escrow on AlgoExplorer
            </a>
          )}
        </div>
      )}
    </div>
  )
}
