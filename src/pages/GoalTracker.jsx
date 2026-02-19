import React, { useState } from 'react'
import Modal from '../components/Modal'
import { useApp } from '../context/AppContext'
import { ACTIONS } from '../context/AppContext'

const COLOR_MAP = {
  cyan:   'from-cyan-500/20 to-cyan-500/5 border-cyan-500/20',
  green:  'from-green-500/20 to-green-500/5 border-green-500/20',
  purple: 'from-purple-500/20 to-purple-500/5 border-purple-500/20',
  yellow: 'from-yellow-500/20 to-yellow-500/5 border-yellow-500/20',
}

const uid = () => Math.random().toString(36).slice(2, 10)

export default function GoalTracker() {
  const { state, dispatch } = useApp()
  const goals = state.goals

  const [showModal,     setShowModal]     = useState(false)
  const [depositModal,  setDepositModal]  = useState(null)   // goalId
  const [form,          setForm]          = useState({ name: '', target: '', deadline: '', icon: '🎯', color: 'cyan' })
  const [depositAmt,    setDepositAmt]    = useState('')
  const [depositError,  setDepositError]  = useState('')

  // Total ALGO allocated to goals (reduces available balance on Dashboard)
  const totalAllocated = goals.reduce((s, g) => s + g.current, 0)
  const availableBalance =
    state.balance !== null ? Math.max(0, state.balance - totalAllocated) : null

  function createGoal(e) {
    e.preventDefault()
    if (!form.name.trim() || !form.target) return
    dispatch({
      type: ACTIONS.ADD_GOAL,
      payload: {
        id:       uid(),
        name:     form.name.trim(),
        target:   Number(form.target),
        current:  0,
        deadline: form.deadline,
        icon:     form.icon || '🎯',
        color:    form.color,
      },
    })
    setForm({ name: '', target: '', deadline: '', icon: '🎯', color: 'cyan' })
    setShowModal(false)
  }

  function handleDeposit(e) {
    e.preventDefault()
    const amt = Number(depositAmt)
    if (!depositAmt || amt <= 0) return setDepositError('Enter a valid amount.')
    // Warn if deposit exceeds available wallet balance
    if (availableBalance !== null && amt > availableBalance) {
      setDepositError(
        `Insufficient balance. Available: ${availableBalance.toFixed(4)} ALGO (after other goal allocations).`
      )
      return
    }
    dispatch({ type: ACTIONS.DEPOSIT_TO_GOAL, payload: { goalId: depositModal, amount: amt } })
    setDepositAmt('')
    setDepositError('')
    setDepositModal(null)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            Goal <span className="gradient-text">Tracker</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">Track savings goals and progress</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          + New Goal
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card text-center py-4">
          <p className="text-2xl font-bold text-white">{goals.length}</p>
          <p className="text-xs text-slate-500 mt-1">Total Goals</p>
        </div>
        <div className="card text-center py-4">
          <p className="text-2xl font-bold text-green-400">
            {goals.filter(g => g.current >= g.target).length}
          </p>
          <p className="text-xs text-slate-500 mt-1">Completed</p>
        </div>
        <div className="card text-center py-4">
          <p className="text-2xl font-bold text-cyan-400">
            {totalAllocated.toFixed(2)}
          </p>
          <p className="text-xs text-slate-500 mt-1">ALGO Allocated</p>
        </div>
      </div>

      {/* Available balance info */}
      {state.walletConnected && availableBalance !== null && (
        <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500">Wallet Balance</p>
            <p className="font-bold text-white">{Number(state.balance).toFixed(4)} ALGO</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-slate-500">Allocated to Goals</p>
            <p className="font-bold text-red-400">-{totalAllocated.toFixed(4)} ALGO</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500">Available</p>
            <p className="font-bold text-green-400">{availableBalance.toFixed(4)} ALGO</p>
          </div>
        </div>
      )}

      {/* Goal cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {goals.map(g => {
          const pct = Math.min(100, Math.round((g.current / g.target) * 100))
          const done = g.current >= g.target
          return (
            <div
              key={g.id}
              className={`card bg-gradient-to-br ${COLOR_MAP[g.color] || COLOR_MAP.cyan} border space-y-4`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{g.icon}</span>
                  <div>
                    <p className="font-semibold text-white">{g.name}</p>
                    {g.deadline && (
                      <p className="text-xs text-slate-500">Deadline: {g.deadline}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {done && <span className="badge badge-success">✓ Done</span>}
                  <button
                    onClick={() => dispatch({ type: ACTIONS.DELETE_GOAL, payload: g.id })}
                    className="text-slate-600 hover:text-red-400 transition-colors text-xs p-1"
                    title="Delete goal"
                  >✕</button>
                </div>
              </div>

              {/* Progress bar */}
              <div>
                <div className="flex justify-between text-xs text-slate-400 mb-1.5">
                  <span>{g.current} / {g.target} ALGO</span>
                  <span className="font-semibold">{pct}%</span>
                </div>
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: `${pct}%` }} />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>{(g.target - g.current).toFixed(3)} Ⓐ remaining</span>
                {!done && (
                  <button
                    onClick={() => setDepositModal(g.id)}
                    className="btn-ghost text-xs px-3 py-1.5"
                  >
                    + Add Funds
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Create goal modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="New Savings Goal">
        <form onSubmit={createGoal} className="space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1.5">Goal Name</label>
            <input className="input" placeholder="e.g. Emergency Fund"
              value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1.5">Target Amount (ALGO)</label>
            <input className="input" type="number" min="0.001" step="0.001" placeholder="e.g. 50"
              value={form.target} onChange={e => setForm(f => ({ ...f, target: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1.5">Deadline (optional)</label>
            <input className="input" type="date"
              value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-sm text-slate-400 mb-1.5">Icon</label>
              <input className="input" placeholder="🎯"
                value={form.icon} onChange={e => setForm(f => ({ ...f, icon: e.target.value }))} />
            </div>
            <div className="flex-1">
              <label className="block text-sm text-slate-400 mb-1.5">Color</label>
              <select className="input" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))}>
                <option value="cyan">Cyan</option>
                <option value="purple">Purple</option>
                <option value="green">Green</option>
                <option value="yellow">Yellow</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={() => setShowModal(false)} className="btn-ghost flex-1 justify-center">
              Cancel
            </button>
            <button type="submit" className="btn-primary flex-1 justify-center">
              Create Goal
            </button>
          </div>
        </form>
      </Modal>

      {/* Deposit to goal modal */}
      <Modal open={!!depositModal} onClose={() => setDepositModal(null)} title="Add Funds to Goal">
        <form onSubmit={handleDeposit} className="space-y-4">
          {depositModal && (() => {
            const g = goals.find(x => x.id === depositModal)
            if (!g) return null
            const remaining = g.target - g.current
            return (
              <div className="rounded-xl bg-white/4 border border-white/8 px-4 py-3 space-y-1">
                <p className="text-white font-semibold">{g.icon} {g.name}</p>
                <p className="text-xs text-slate-400">
                  Progress: <span className="text-cyan-400">{g.current.toFixed(4)}</span> / {g.target} ALGO
                  &nbsp;&middot;&nbsp;
                  Remaining: <span className="text-yellow-400">{remaining.toFixed(4)} ALGO</span>
                </p>
                {availableBalance !== null && (
                  <p className="text-xs text-slate-500">
                    Wallet available after other goals: <span className="text-green-400 font-semibold">{availableBalance.toFixed(4)} ALGO</span>
                  </p>
                )}
              </div>
            )
          })()}
          <div>
            <label className="block text-sm text-slate-400 mb-1.5">Amount to allocate (ALGO)</label>
            <input className="input" type="number" min="0.001" step="0.001" placeholder="0.0"
              value={depositAmt}
              onChange={e => { setDepositAmt(e.target.value); setDepositError('') }} />
          </div>
          {depositError && (
            <p className="text-sm text-red-400 bg-red-500/10 rounded-lg px-3 py-2">{depositError}</p>
          )}
          <div className="flex gap-3">
            <button type="button" onClick={() => { setDepositModal(null); setDepositError('') }}
              className="btn-ghost flex-1 justify-center">Cancel</button>
            <button type="submit" className="btn-primary flex-1 justify-center">
              💰 Allocate Funds
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
