/**
 * Analytics.jsx  ─  On-chain + in-app spending analytics
 *
 * Data sources (all from AppContext — ultimately from Algorand Indexer):
 *  • state.recentTxs     — formatted transactions fetched via getAccountTransactions()
 *  • state.bills         — bill-split records (from context state)
 *  • state.goals         — savings goals (from context state)
 *  • state.balance       — live wallet balance from getBalance()
 *  • state.escrowBalance — live escrow balance from getEscrowBalance()
 */
import React, { useMemo, useState } from 'react'
import { useApp } from '../context/AppContext'

/* ── Transaction Node Graph ──────────────────────────────────────────────── */

/** Color per transaction type (pale green palette) */
const TYPE_COLOR = {
  'Payment':        { stroke: '#4ade80', node: '#22c55e', text: '#bbf7d0' },
  'App Call':       { stroke: '#34d399', node: '#10b981', text: '#a7f3d0' },
  'Asset Transfer': { stroke: '#6ee7b7', node: '#059669', text: '#d1fae5' },
  'default':        { stroke: '#86efac', node: '#4ade80', text: '#dcfce7' },
}

function typeColor(type) {
  return TYPE_COLOR[type] || TYPE_COLOR['default']
}

function fmtAlgo(num) {
  return Number(num).toLocaleString(undefined, { minimumFractionDigits: 3, maximumFractionDigits: 3 })
}

/**
 * TxNodeGraph — SVG node/edge graph of transaction counterparties.
 *
 * Layout:
 *   • Centre node  = "My Wallet"
 *   • Outer nodes  = unique counterparties (max 10), arranged in a circle
 *   • Edges        = transactions — width ∝ ALGO amount, color = tx type
 *   • Hover        = tooltip with address + total ALGO
 */
function TxNodeGraph({ txs, walletShort }) {
  const [hovered, setHovered] = useState(null)

  const { nodes, edges } = useMemo(() => {
    if (!txs.length) return { nodes: [], edges: [] }

    const counterMap = {}
    txs.forEach(tx => {
      ;[tx.sender, tx.receiver].filter(Boolean).forEach(label => {
        if (!label || label === walletShort) return
        if (!counterMap[label]) counterMap[label] = { totalAmt: 0, txCount: 0, types: {} }
        counterMap[label].totalAmt += parseFloat(tx.amount || 0)
        counterMap[label].txCount++
        const t = tx.type || 'Unknown'
        counterMap[label].types[t] = (counterMap[label].types[t] || 0) + 1
      })
    })

    const entries = Object.entries(counterMap)
      .sort((a, b) => b[1].totalAmt - a[1].totalAmt)
      .slice(0, 10)

    if (entries.length === 0) return { nodes: [], edges: [] }

    const CX = 300, CY = 210, R = 158
    const n = entries.length

    const peripheralNodes = entries.map(([label, data], i) => {
      const angle = (2 * Math.PI * i) / n - Math.PI / 2
      const x = CX + R * Math.cos(angle)
      const y = CY + R * Math.sin(angle)
      const dominantType = Object.entries(data.types).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Payment'
      const nodeR = Math.max(10, Math.min(22, 10 + data.txCount * 2))
      return { id: label, label, x, y, ...data, dominantType, nodeR }
    })

    const centre = { id: 'wallet', label: walletShort || 'My Wallet', x: CX, y: CY, nodeR: 26, isWallet: true }

    const maxAmt = Math.max(...peripheralNodes.map(p => p.totalAmt), 0.001)
    const edgeList = peripheralNodes.map(pn => {
      const c = typeColor(pn.dominantType)
      return {
        id: `e-${pn.id}`,
        x1: CX, y1: CY, x2: pn.x, y2: pn.y,
        strokeW: Math.max(1.5, Math.min(6, (pn.totalAmt / maxAmt) * 6)),
        stroke: c.stroke,
        amt: pn.totalAmt,
        type: pn.dominantType,
      }
    })

    return { nodes: [centre, ...peripheralNodes], edges: edgeList }
  }, [txs, walletShort])

  /* empty state */
  if (!nodes.length) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-slate-500">
        <svg width="72" height="72" viewBox="0 0 72 72" fill="none">
          <circle cx="36" cy="36" r="20" stroke="#4ade80" strokeWidth="1.5" strokeDasharray="5 5" />
          <circle cx="36" cy="36" r="6" fill="#4ade80" opacity="0.4" />
          {[0,1,2,3,4].map(i => {
            const a = (2 * Math.PI * i) / 5 - Math.PI / 2
            return (
              <g key={i}>
                <line x1="36" y1="36" x2={36 + 32 * Math.cos(a)} y2={36 + 32 * Math.sin(a)}
                  stroke="#86efac" strokeWidth="1" strokeDasharray="3 3" />
                <circle cx={36 + 32 * Math.cos(a)} cy={36 + 32 * Math.sin(a)}
                  r="4" fill="#86efac" opacity="0.3" />
              </g>
            )
          })}
        </svg>
        <p className="text-sm">No transaction data — connect wallet &amp; refresh</p>
      </div>
    )
  }

  const hoveredNode = hovered ? nodes.find(nd => nd.id === hovered) : null

  return (
    <div className="relative">
      <svg viewBox="0 0 600 420" className="w-full h-auto select-none" style={{ minHeight: 300 }}>
        <defs>
          <pattern id="dot-grid" x="0" y="0" width="30" height="30" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="0.8" fill="#4ade80" opacity="0.12" />
          </pattern>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="glow-strong">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <radialGradient id="wallet-grad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#86efac" />
            <stop offset="100%" stopColor="#22c55e" />
          </radialGradient>
        </defs>

        <rect width="600" height="420" fill="url(#dot-grid)" />

        {/* Edges */}
        {edges.map(e => (
          <g key={e.id}>
            <line x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2}
              stroke={e.stroke} strokeWidth={e.strokeW + 5} opacity="0.10" />
            <line x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2}
              stroke={e.stroke} strokeWidth={e.strokeW}
              opacity={hovered && hovered !== e.id.replace('e-', '') ? 0.20 : 0.70}
              strokeLinecap="round" />
            {e.amt > 0 && (
              <text x={(e.x1 + e.x2) / 2} y={(e.y1 + e.y2) / 2 - 6}
                textAnchor="middle" fontSize="9" fill={e.stroke}
                opacity="0.85" fontFamily="monospace">
                {Number(e.amt).toFixed(2)}
              </text>
            )}
          </g>
        ))}

        {/* Peripheral nodes */}
        {nodes.filter(nd => !nd.isWallet).map(nd => {
          const c = typeColor(nd.dominantType)
          const isH = hovered === nd.id
          return (
            <g key={nd.id} style={{ cursor: 'pointer' }}
              onMouseEnter={() => setHovered(nd.id)}
              onMouseLeave={() => setHovered(null)}>
              <circle cx={nd.x} cy={nd.y} r={nd.nodeR + 6}
                fill="none" stroke={c.stroke} strokeWidth="1"
                opacity={isH ? 0.7 : 0.2} strokeDasharray={isH ? '0' : '4 3'} />
              <circle cx={nd.x} cy={nd.y} r={nd.nodeR}
                fill={c.node} opacity={isH ? 1 : 0.8}
                filter={isH ? 'url(#glow)' : undefined} />
              <text x={nd.x} y={nd.y + 1} textAnchor="middle" dominantBaseline="middle"
                fontSize="9" fontWeight="600" fill="white" opacity="0.95">
                {nd.txCount}
              </text>
              <text x={nd.x} y={nd.y + nd.nodeR + 13} textAnchor="middle"
                fontSize="8" fill={c.text} opacity="0.8" fontFamily="monospace">
                {String(nd.label).slice(0, 10)}…
              </text>
            </g>
          )
        })}

        {/* Centre wallet node */}
        {nodes.filter(nd => nd.isWallet).map(nd => (
          <g key={nd.id}
            onMouseEnter={() => setHovered('wallet')}
            onMouseLeave={() => setHovered(null)}>
            <circle cx={nd.x} cy={nd.y} r={nd.nodeR + 12}
              fill="none" stroke="#86efac" strokeWidth="1.5" opacity="0.15" />
            <circle cx={nd.x} cy={nd.y} r={nd.nodeR + 6}
              fill="none" stroke="#4ade80" strokeWidth="1" opacity="0.30" />
            <circle cx={nd.x} cy={nd.y} r={nd.nodeR}
              fill="url(#wallet-grad)" filter="url(#glow-strong)" />
            <text x={nd.x} y={nd.y - 4} textAnchor="middle" dominantBaseline="middle"
              fontSize="8" fontWeight="700" fill="white">WALLET</text>
            <text x={nd.x} y={nd.y + 7} textAnchor="middle" dominantBaseline="middle"
              fontSize="7" fill="white" opacity="0.8" fontFamily="monospace">
              {String(nd.label).slice(0, 8)}
            </text>
          </g>
        ))}

        {/* Hover tooltip */}
        {hoveredNode && !hoveredNode.isWallet && (() => {
          const nd = hoveredNode
          const tipX = Math.min(Math.max(nd.x - 68, 4), 456)
          const tipY = nd.y < 180 ? nd.y + nd.nodeR + 14 : nd.y - nd.nodeR - 58
          return (
            <g>
              <rect x={tipX} y={tipY} width={144} height={50}
                rx="6" fill="#0c2017" stroke="#4ade80" strokeWidth="1" opacity="0.96" />
              <text x={tipX + 8} y={tipY + 14} fontSize="9" fill="#86efac" fontFamily="monospace">
                {String(nd.label).slice(0, 20)}
              </text>
              <text x={tipX + 8} y={tipY + 28} fontSize="9" fill="#4ade80">
                {fmtAlgo(nd.totalAmt)} ALGO · {nd.txCount} txs
              </text>
              <text x={tipX + 8} y={tipY + 41} fontSize="9" fill="#6ee7b7">
                {nd.dominantType}
              </text>
            </g>
          )
        })()}
      </svg>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mt-3 px-1">
        {Object.entries(TYPE_COLOR).filter(([k]) => k !== 'default').map(([type, c]) => (
          <div key={type} className="flex items-center gap-1.5">
            <svg width="22" height="8">
              <line x1="0" y1="4" x2="14" y2="4" stroke={c.stroke} strokeWidth="2.5" strokeLinecap="round" />
              <circle cx="18" cy="4" r="3.5" fill={c.node} />
            </svg>
            <span className="text-[10px] text-slate-400">{type}</span>
          </div>
        ))}
        <span className="ml-auto text-[10px] text-slate-500 self-center">
          Node size = tx count · Edge width = ALGO amount
        </span>
      </div>
    </div>
  )
}

/* ── Shared helpers ──────────────────────────────────────────────────────── */

function pct(value, total) {
  if (!total) return 0
  return Math.min(100, Math.round((value / total) * 100))
}

/** Simple progress bar (uses Tailwind gradient classes) */
function Bar({ pct: p, color = 'from-cyan-500 to-purple-500', height = 'h-2' }) {
  return (
    <div className={`w-full ${height} rounded-full bg-white/5 overflow-hidden`}>
      <div
        className={`h-full rounded-full bg-gradient-to-r ${color} transition-all duration-700`}
        style={{ width: `${p}%` }}
      />
    </div>
  )
}

/** Mini stat card */
function StatCard({ label, value, sub, accent = 'text-cyan-400' }) {
  return (
    <div className="card flex flex-col gap-1">
      <p className="text-xs text-slate-500 uppercase tracking-widest font-medium">{label}</p>
      <p className={`text-2xl font-bold ${accent}`}>{value}</p>
      {sub && <p className="text-xs text-slate-500">{sub}</p>}
    </div>
  )
}

/* ── Main Analytics page ──────────────────────────────────────────────────── */

export default function Analytics() {
  const { state } = useApp()
  const { recentTxs = [], bills = [], goals = [], balance, escrowBalance, address } = state

  /* ── Transaction Analytics ──────────────────────────────────────────────── */
  const txStats = useMemo(() => {
    const payments = recentTxs.filter(t => t.type === 'Payment')
    const totalSpent = payments.reduce((s, t) => s + parseFloat(t.amount || 0), 0)

    const byDay = {}
    payments.forEach(t => {
      const day = t.date ? t.date.split('T')[0] : 'unknown'
      byDay[day] = (byDay[day] || 0) + parseFloat(t.amount || 0)
    })
    const dayValues = Object.values(byDay)
    const avgDaily = dayValues.length ? totalSpent / dayValues.length : 0

    const byType = {}
    recentTxs.forEach(t => {
      const type = t.type || 'Unknown'
      byType[type] = (byType[type] || 0) + parseFloat(t.amount || 0)
    })
    const sortedTypes = Object.entries(byType).sort((a, b) => b[1] - a[1])
    const totalByType = Object.values(byType).reduce((s, v) => s + v, 0)

    const today = new Date()
    const last7 = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const key = d.toISOString().split('T')[0]
      const label = d.toLocaleDateString(undefined, { weekday: 'short' })
      last7.push({ label, key, amount: byDay[key] || 0 })
    }
    const maxBar = Math.max(...last7.map(d => d.amount), 0.001)

    return {
      totalSpent, avgDaily,
      byType: sortedTypes, totalByType,
      mostSpentCategory: sortedTypes[0]?.[0] ?? '—',
      mostSpentAmount:   sortedTypes[0]?.[1] ?? 0,
      last7, maxBar,
      txCount: recentTxs.length,
      paymentCount: payments.length,
    }
  }, [recentTxs])

  /* ── Bill Analytics ─────────────────────────────────────────────────────── */
  const billStats = useMemo(() => {
    const myBills = bills.filter(b => b.creatorAddress === address)
    const totalBillValue = myBills.reduce((s, b) => s + parseFloat(b.total || 0), 0)
    const allPayees  = myBills.flatMap(b => b.payees || [])
    const paidPayees = allPayees.filter(p => p.status === 'paid')
    const paidAmt    = paidPayees.reduce((s, p) => s + parseFloat(p.share || 0), 0)
    const iOwe       = bills.flatMap(b =>
      (b.payees || []).filter(p => p.address === address)
        .map(p => ({ share: p.share, status: p.status }))
    )
    return {
      myBills: myBills.length, totalBillValue,
      paidAmt, pendingAmt: totalBillValue - paidAmt,
      iOwePending: iOwe.filter(i => i.status !== 'paid').reduce((s, i) => s + parseFloat(i.share || 0), 0),
      iOwePaid:    iOwe.filter(i => i.status === 'paid').reduce((s, i) => s + parseFloat(i.share || 0), 0),
    }
  }, [bills, address])

  /* ── Goal Analytics ─────────────────────────────────────────────────────── */
  const goalStats = useMemo(() => {
    const totalAllocated = goals.reduce((s, g) => s + parseFloat(g.current || 0), 0)
    const completed      = goals.filter(g => parseFloat(g.current) >= parseFloat(g.target))
    return {
      total: goals.length, completed: completed.length,
      totalAllocated,
      available: Math.max(0, (parseFloat(balance) || 0) - totalAllocated),
    }
  }, [goals, balance])

  // Shortened wallet label for graph centre
  const walletShort = address
    ? `${address.slice(0, 6)}…${address.slice(-4)}`
    : 'Wallet'

  const connected = state.walletConnected

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">
          Analytics <span className="gradient-text">Dashboard</span>
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          On-chain transaction insights powered by Algorand Indexer
        </p>
      </div>

      {!connected && (
        <div className="card border border-yellow-500/30 bg-yellow-500/5 text-yellow-300 text-sm p-4">
          🟡 Connect your Pera Wallet to load real on-chain analytics.
        </div>
      )}

      {/* ── KPI row ────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Transactions" value={txStats.txCount}
          sub={`${txStats.paymentCount} payments`} accent="text-cyan-400" />
        <StatCard label="Total Spent (ALGO)" value={fmtAlgo(txStats.totalSpent)}
          sub="across all payments" accent="text-purple-400" />
        <StatCard label="Avg Daily Spend" value={fmtAlgo(txStats.avgDaily)}
          sub="ALGO per active day" accent="text-emerald-400" />
        <StatCard label="Most Active Type" value={txStats.mostSpentCategory}
          sub={`${fmtAlgo(txStats.mostSpentAmount)} ALGO`} accent="text-green-300" />
      </div>

      {/* ── Transaction Node Graph ───────────────────────────────────────────── */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-semibold text-white">Transaction Network Graph</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Counterparty nodes linked to your wallet · hover a node to inspect
            </p>
          </div>
          <span className="badge badge-info text-xs">{recentTxs.length} txs</span>
        </div>
        <TxNodeGraph txs={recentTxs} walletShort={walletShort} />
      </div>

      {/* ── Last 7 Days Bar Chart ─────────────────────────────────────────── */}
      <div className="card">
        <h2 className="font-semibold text-white mb-4">
          Spending — Last 7 Days
          <span className="ml-2 text-xs text-slate-500 font-normal">(ALGO)</span>
        </h2>
        {txStats.last7.every(d => d.amount === 0) ? (
          <p className="text-slate-500 text-sm">No transaction data available yet.</p>
        ) : (
          <div className="flex items-end gap-2 h-32">
            {txStats.last7.map(day => {
              const barPct = txStats.maxBar > 0 ? (day.amount / txStats.maxBar) * 100 : 0
              return (
                <div key={day.key} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[10px] text-slate-500">
                    {day.amount > 0 ? fmtAlgo(day.amount) : ''}
                  </span>
                  <div className="w-full flex-1 flex items-end">
                    <div
                      className="w-full rounded-t bg-gradient-to-t from-cyan-500 to-cyan-400 transition-all duration-700 min-h-[3px]"
                      style={{ height: `${Math.max(barPct, 2)}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-400">{day.label}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Type breakdown + Bill Split ────────────────────────────────────── */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="font-semibold text-white mb-4">Transaction Type Breakdown</h2>
          {txStats.byType.length === 0 ? (
            <p className="text-slate-500 text-sm">No transactions loaded.</p>
          ) : (
            <div className="space-y-3">
              {txStats.byType.map(([type, amt]) => (
                <div key={type}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-300">{type}</span>
                    <span className="text-slate-400">{fmtAlgo(amt)} ALGO ({pct(amt, txStats.totalByType)}%)</span>
                  </div>
                  <Bar pct={pct(amt, txStats.totalByType)} color={
                    type === 'Payment'       ? 'from-cyan-500 to-cyan-400'      :
                    type === 'App Call'       ? 'from-purple-500 to-purple-400'  :
                    type === 'Asset Transfer' ? 'from-emerald-500 to-emerald-400':
                    'from-slate-500 to-slate-400'
                  } />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h2 className="font-semibold text-white mb-4">Bill Split Summary</h2>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Bills created by you</span>
              <span className="text-white font-medium">{billStats.myBills}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Total bill value</span>
              <span className="text-cyan-400 font-medium">{fmtAlgo(billStats.totalBillValue)} ALGO</span>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-400">Collected</span>
                <span className="text-emerald-400">{fmtAlgo(billStats.paidAmt)} ALGO</span>
              </div>
              <Bar pct={pct(billStats.paidAmt, billStats.totalBillValue)} color="from-emerald-500 to-emerald-400" />
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-400">Pending</span>
                <span className="text-yellow-400">{fmtAlgo(billStats.pendingAmt)} ALGO</span>
              </div>
              <Bar pct={pct(billStats.pendingAmt, billStats.totalBillValue)} color="from-yellow-500 to-yellow-400" />
            </div>
            <div className="border-t border-white/5 pt-3 space-y-2">
              <p className="text-xs text-slate-500 uppercase tracking-widest">You Owe</p>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Pending</span>
                <span className="text-red-400 font-medium">{fmtAlgo(billStats.iOwePending)} ALGO</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Settled</span>
                <span className="text-emerald-400 font-medium">{fmtAlgo(billStats.iOwePaid)} ALGO</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Goals Overview ────────────────────────────────────────────────── */}
      <div className="card">
        <h2 className="font-semibold text-white mb-4">Savings Goals Overview</h2>
        {goals.length === 0 ? (
          <p className="text-slate-500 text-sm">No goals created yet. Head to Goal Tracker to set one up.</p>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {[
                ['Total Goals',     goalStats.total,                          'text-white'],
                ['Completed',       goalStats.completed,                      'text-emerald-400'],
                ['Allocated',       `${fmtAlgo(goalStats.totalAllocated)} ALGO`, 'text-purple-400'],
                ['Available',       `${fmtAlgo(goalStats.available)} ALGO`,      'text-cyan-400'],
              ].map(([label, val, cls]) => (
                <div key={label} className="rounded-xl p-3 bg-white/3">
                  <p className="text-xs text-slate-500">{label}</p>
                  <p className={`text-xl font-bold ${cls}`}>{val}</p>
                </div>
              ))}
            </div>
            <div className="space-y-3">
              {goals.map(g => {
                const p = pct(parseFloat(g.current), parseFloat(g.target))
                return (
                  <div key={g.id}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-300">{g.name}</span>
                      <span className="text-slate-400">
                        {fmtAlgo(g.current)} / {fmtAlgo(g.target)} ALGO ({p}%)
                      </span>
                    </div>
                    <Bar pct={p}
                      color={p >= 100 ? 'from-emerald-500 to-emerald-400' : 'from-cyan-500 to-purple-500'} />
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* ── Wallet Snapshot ───────────────────────────────────────────────── */}
      <div className="card">
        <h2 className="font-semibold text-white mb-4">Wallet Snapshot</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-slate-500 mb-1">Wallet Balance</p>
            <p className="text-lg font-bold text-cyan-400">{fmtAlgo(balance ?? 0)} ALGO</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">Escrow Balance</p>
            <p className="text-lg font-bold text-purple-400">{fmtAlgo(escrowBalance ?? 0)} ALGO</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">Goals Allocated</p>
            <p className="text-lg font-bold text-emerald-400">{fmtAlgo(goalStats.totalAllocated)} ALGO</p>
          </div>
        </div>
        {(parseFloat(balance) || 0) > 0 && (
          <div className="mt-4">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-400">Goals allocated</span>
              <span className="text-slate-400">{pct(goalStats.totalAllocated, parseFloat(balance))}% of balance</span>
            </div>
            <div className="w-full h-3 rounded-full bg-white/5 overflow-hidden flex">
              <div className="h-full bg-gradient-to-r from-purple-500 to-purple-400"
                style={{ width: `${pct(goalStats.totalAllocated, parseFloat(balance))}%` }} />
              <div className="h-full bg-gradient-to-r from-cyan-500 to-cyan-400 flex-1" />
            </div>
            <div className="flex justify-between text-[10px] mt-1 text-slate-500">
              <span>Allocated</span>
              <span>Available</span>
            </div>
          </div>
        )}
      </div>

      {/* ── Attribution ──────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-white/5 bg-white/2 p-4 text-xs text-slate-500">
        <span className="text-green-400 font-medium">Data sources: </span>
        Transaction data via{' '}
        <span className="text-white">Algorand Indexer</span>{' '}
        (<code className="text-cyan-400">getAccountTransactions()</code>) ·{' '}
        Balances via <code className="text-cyan-400">getBalance()</code> +{' '}
        <code className="text-cyan-400">getEscrowBalance()</code> ·{' '}
        Bills &amp; goals from React context
      </div>
    </div>
  )
}
