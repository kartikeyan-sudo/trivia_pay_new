import React from 'react'

/**
 * StatCard
 * Props: title, value, sub, icon, accent ('cyan'|'purple'|'green'|'yellow')
 */
export default function StatCard({ title, value, sub, icon, accent = 'cyan' }) {
  const accentMap = {
    cyan:   'from-cyan-500/20 to-cyan-500/5   border-cyan-500/20   text-cyan-400',
    purple: 'from-purple-500/20 to-purple-500/5 border-purple-500/20 text-purple-400',
    green:  'from-green-500/20 to-green-500/5  border-green-500/20  text-green-400',
    yellow: 'from-yellow-500/20 to-yellow-500/5 border-yellow-500/20 text-yellow-400',
  }
  const cls = accentMap[accent] || accentMap.cyan

  return (
    <div className={`
      card relative overflow-hidden
      bg-gradient-to-br ${cls.split(' ').slice(0,2).join(' ')}
      border ${cls.split(' ')[2]}
    `}>
      {/* Icon */}
      {icon && (
        <div className={`absolute top-4 right-4 opacity-20 text-5xl select-none`}>
          {icon}
        </div>
      )}
      <p className="text-xs text-slate-400 font-medium uppercase tracking-widest mb-2">
        {title}
      </p>
      <p className={`text-3xl font-bold ${cls.split(' ')[3]}`}>{value}</p>
      {sub && (
        <p className="text-xs text-slate-500 mt-1.5">{sub}</p>
      )}
    </div>
  )
}
