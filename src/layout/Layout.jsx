import React from 'react'
import Navbar from './Navbar'
import Sidebar from './Sidebar'

// Pages
import Dashboard      from '../pages/Dashboard'
import Deposit        from '../pages/Deposit'
import BillSplit      from '../pages/BillSplit'
import PaymentTracker from '../pages/PaymentTracker'
import GoalTracker    from '../pages/GoalTracker'
import Transactions   from '../pages/Transactions'
import Settings       from '../pages/Settings'
import ScanPay        from '../pages/ScanPay'
import Analytics      from '../pages/Analytics'

import { useApp } from '../context/AppContext'

const PAGE_MAP = {
  Dashboard:        <Dashboard />,
  Deposit:          <Deposit />,
  'Bill Split':     <BillSplit />,
  'Payment Tracker':<PaymentTracker />,
  'Goal Tracker':   <GoalTracker />,
  Transactions:     <Transactions />,
  'Scan & Pay':     <ScanPay />,
  Analytics:        <Analytics />,
  Settings:         <Settings />,
}

export default function Layout() {
  const { state } = useApp()
  const CurrentPage = PAGE_MAP[state.activePage] ?? <Dashboard />

  // When wallet connected the navbar grows by ~36px (live status bar)
  const topPad = state.walletConnected ? 'pt-28' : 'pt-16'

  return (
    <div className="min-h-screen dark:bg-surface-900 bg-slate-100">
      <Navbar />
      <Sidebar />

      {/* Main content — offset below navbar (grows when status bar is visible) */}
      <main className={`${topPad} min-h-screen transition-[padding] duration-200`}>
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-8 page-enter">
          {CurrentPage}
        </div>
      </main>
    </div>
  )
}
