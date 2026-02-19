import React from 'react'

/**
 * TxTable
 * Props: transactions (array of { id, amount, sender, receiver, type, status, date })
 */
export default function TxTable({ transactions = [] }) {
  if (!transactions.length) {
    return (
      <div className="card text-center py-12 text-slate-500">
        <p className="text-4xl mb-3">📭</p>
        <p className="font-medium">No transactions yet</p>
        <p className="text-sm mt-1">Transactions will appear here after deployment</p>
      </div>
    )
  }

  const statusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case 'success':   return <span className="badge badge-success">● Success</span>
      case 'pending':   return <span className="badge badge-warning">● Pending</span>
      case 'failed':    return <span className="badge badge-error">● Failed</span>
      default:          return <span className="badge badge-ghost">{status}</span>
    }
  }

  return (
    <div className="card p-0 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/5 text-left">
              {['Tx ID', 'Type', 'Amount', 'Sender', 'Receiver', 'Status', 'Date'].map(h => (
                <th key={h} className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {transactions.map((tx, i) => (
              <tr key={tx.id || i} className="hover:bg-white/3 transition-colors">
                <td className="px-4 py-3 font-mono text-cyan-400 text-xs">{tx.id}</td>
                <td className="px-4 py-3 text-slate-300">{tx.type}</td>
                <td className="px-4 py-3 font-semibold text-white">
                  {tx.amount} <span className="text-slate-500 text-xs">ALGO</span>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-slate-400 max-w-[120px] truncate">
                  {tx.sender}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-slate-400 max-w-[120px] truncate">
                  {tx.receiver}
                </td>
                <td className="px-4 py-3">{statusBadge(tx.status)}</td>
                <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">{tx.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
