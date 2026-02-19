import React, { createContext, useContext, useReducer, useEffect, useCallback, useRef } from 'react'
import peraWallet from '../services/peraWallet'
import {
  getBalance,
  getEscrowBalance,
  getAccountTransactions,
  getEscrowTransactions,
  getAppGlobalState,
  NOTIFY_PREFIX,
} from '../services/blockchain'

// ─── Initial state ─────────────────────────────────────────────────────────
const initialState = {
  sidebarOpen:    false,
  activePage:     'Dashboard',
  theme:          'dark',

  // Wallet
  walletConnected: false,
  address:         null,
  balance:         null,       // live ALGO balance

  // Network / contract config
  network:         'testnet',
  appId:           localStorage.getItem('algopay_appId') ?? '',
  escrowAddress:   localStorage.getItem('algopay_escrow') ?? '',
  escrowBalance:   null,

  // On-chain data (centralised – all pages read from here)
  recentTxs:       [],
  appGlobalState:  [],

  // Bill-split shared state (persisted across pages)
  bills:           [],
  notifications:   [],

  // Goal-tracker shared state
  goals:           [],

  // Refresh metadata
  loading:         false,
  lastRefreshed:   null,   // Date object or null
  fetchError:      '',

  // Summary stats (derived from chain data)
  stats: {
    poolBalance:    0,
    totalDeposited: 0,
    txCount:        0,
    pendingBills:   0,
  },
}

// ─── Actions ───────────────────────────────────────────────────────────────
export const ACTIONS = {
  TOGGLE_SIDEBAR:       'TOGGLE_SIDEBAR',
  CLOSE_SIDEBAR:        'CLOSE_SIDEBAR',
  SET_PAGE:             'SET_PAGE',
  TOGGLE_THEME:         'TOGGLE_THEME',
  CONNECT_WALLET:       'CONNECT_WALLET',
  DISCONNECT_WALLET:    'DISCONNECT_WALLET',
  SET_NETWORK:          'SET_NETWORK',
  SET_APP_ID:           'SET_APP_ID',
  SET_ESCROW_ADDRESS:   'SET_ESCROW_ADDRESS',
  SET_BALANCE:          'SET_BALANCE',
  SET_ESCROW_BALANCE:   'SET_ESCROW_BALANCE',
  SET_RECENT_TXS:       'SET_RECENT_TXS',
  SET_APP_GLOBAL_STATE: 'SET_APP_GLOBAL_STATE',
  SET_LOADING:          'SET_LOADING',
  SET_LAST_REFRESHED:   'SET_LAST_REFRESHED',
  SET_FETCH_ERROR:      'SET_FETCH_ERROR',
  UPDATE_STATS:         'UPDATE_STATS',
  // Bill-split
  ADD_BILL:             'ADD_BILL',
  DELETE_BILL:          'DELETE_BILL',
  UPDATE_PAYEE_STATUS:  'UPDATE_PAYEE_STATUS',
  ADD_NOTIFICATION:     'ADD_NOTIFICATION',
  DISMISS_NOTIFICATION: 'DISMISS_NOTIFICATION',
  // Goals
  ADD_GOAL:             'ADD_GOAL',
  DELETE_GOAL:          'DELETE_GOAL',
  DEPOSIT_TO_GOAL:      'DEPOSIT_TO_GOAL',
}

// ─── Reducer ───────────────────────────────────────────────────────────────
function appReducer(state, action) {
  switch (action.type) {
    case ACTIONS.TOGGLE_SIDEBAR:
      return { ...state, sidebarOpen: !state.sidebarOpen }
    case ACTIONS.CLOSE_SIDEBAR:
      return { ...state, sidebarOpen: false }
    case ACTIONS.SET_PAGE:
      return { ...state, activePage: action.payload, sidebarOpen: false }
    case ACTIONS.TOGGLE_THEME:
      return { ...state, theme: state.theme === 'dark' ? 'light' : 'dark' }
    case ACTIONS.CONNECT_WALLET:
      return { ...state, walletConnected: true, address: action.payload }
    case ACTIONS.DISCONNECT_WALLET:
      return {
        ...state,
        walletConnected: false,
        address:         null,
        balance:         null,
        recentTxs:       [],
        appGlobalState:  [],
        escrowBalance:   null,
        lastRefreshed:   null,
        fetchError:      '',
        stats: { poolBalance: 0, totalDeposited: 0, txCount: 0, pendingBills: 0 },
      }
    case ACTIONS.SET_NETWORK:
      return { ...state, network: action.payload }
    case ACTIONS.SET_APP_ID:
      localStorage.setItem('algopay_appId', action.payload)
      return { ...state, appId: action.payload }
    case ACTIONS.SET_ESCROW_ADDRESS:
      localStorage.setItem('algopay_escrow', action.payload)
      return { ...state, escrowAddress: action.payload }
    case ACTIONS.SET_BALANCE:
      return { ...state, balance: action.payload }
    case ACTIONS.SET_ESCROW_BALANCE:
      return { ...state, escrowBalance: action.payload }
    case ACTIONS.SET_RECENT_TXS:
      return { ...state, recentTxs: action.payload }
    case ACTIONS.SET_APP_GLOBAL_STATE:
      return { ...state, appGlobalState: action.payload }
    case ACTIONS.SET_LOADING:
      return { ...state, loading: action.payload }
    case ACTIONS.SET_LAST_REFRESHED:
      return { ...state, lastRefreshed: action.payload }
    case ACTIONS.SET_FETCH_ERROR:
      return { ...state, fetchError: action.payload }
    case ACTIONS.UPDATE_STATS:
      return { ...state, stats: { ...state.stats, ...action.payload } }
    // ── Bill-split ────────────────────────────────────────────────────────
    case ACTIONS.ADD_BILL:
      return { ...state, bills: [action.payload, ...state.bills] }
    case ACTIONS.DELETE_BILL:
      return { ...state, bills: state.bills.filter(b => b.id !== action.payload) }
    case ACTIONS.UPDATE_PAYEE_STATUS: {
      // payload: { billId, payeeId, status }
      const { billId, payeeId, status } = action.payload
      return {
        ...state,
        bills: state.bills.map(b =>
          b.id !== billId ? b : {
            ...b,
            payees: b.payees.map(p =>
              p.id !== payeeId ? p : { ...p, status }
            ),
          }
        ),
      }
    }
    case ACTIONS.ADD_NOTIFICATION:
      return { ...state, notifications: [action.payload, ...state.notifications] }
    case ACTIONS.DISMISS_NOTIFICATION:
      return {
        ...state,
        notifications: state.notifications.filter(n => n.id !== action.payload),
      }
    // ── Goals ────────────────────────────────────────────────────────────
    case ACTIONS.ADD_GOAL:
      return { ...state, goals: [action.payload, ...state.goals] }
    case ACTIONS.DELETE_GOAL:
      return { ...state, goals: state.goals.filter(g => g.id !== action.payload) }
    case ACTIONS.DEPOSIT_TO_GOAL: {
      const { goalId, amount } = action.payload
      return {
        ...state,
        goals: state.goals.map(g =>
          g.id !== goalId ? g : { ...g, current: Math.min(g.target, g.current + amount) }
        ),
      }
    }
    default:
      return state
  }
}

// ─── Context ───────────────────────────────────────────────────────────────
const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, initialState)

  // Keep a ref so refreshAll always reads the latest state without stale closures
  const stateRef = useRef(state)
  useEffect(() => { stateRef.current = state }, [state])

  // ── Central data refresher ─────────────────────────────────────────────────
  // Fetches: wallet balance, escrow balance, wallet txs + escrow txs, app global state
  // All pages pull from context.state — they never need to call the SDK directly for reads.
  const refreshAll = useCallback(async (addressOverride) => {
    const { address, appId, escrowAddress } = stateRef.current
    const addr = addressOverride ?? address
    if (!addr) return                          // nothing to fetch without a wallet

    dispatch({ type: ACTIONS.SET_LOADING,     payload: true })
    dispatch({ type: ACTIONS.SET_FETCH_ERROR, payload: '' })

    try {
      // ── 1. Wallet balance ──────────────────────────────────────────────
      const balPromise    = getBalance(addr)

      // ── 2. Escrow balance ──────────────────────────────────────────────
      const escrowPromise = escrowAddress ? getEscrowBalance() : Promise.resolve(null)

      // ── 3. Transactions (wallet + escrow, merged & deduped) ────────────
      const walletTxPromise = getAccountTransactions(addr, 50)
      const escrowTxPromise = escrowAddress ? getEscrowTransactions(50) : Promise.resolve([])

      // ── 4. App global state ────────────────────────────────────────────
      const gStatePromise = appId ? getAppGlobalState(appId) : Promise.resolve([])

      const [balResult, escrowResult, walletTxResult, escrowTxResult, gStateResult] =
        await Promise.allSettled([
          balPromise,
          escrowPromise,
          walletTxPromise,
          escrowTxPromise,
          gStatePromise,
        ])

      // Balance
      const bal = balResult.status === 'fulfilled' ? balResult.value : 0
      dispatch({ type: ACTIONS.SET_BALANCE, payload: bal })

      // Escrow balance
      if (escrowResult.status === 'fulfilled' && escrowResult.value !== null) {
        dispatch({ type: ACTIONS.SET_ESCROW_BALANCE, payload: escrowResult.value })
      }

      // Transactions – merge + deduplicate by id
      const walletTxs = walletTxResult.status === 'fulfilled' ? walletTxResult.value : []
      const escrowTxs = escrowTxResult.status  === 'fulfilled' ? escrowTxResult.value  : []
      const seen = new Set()
      const merged = [...walletTxs, ...escrowTxs].filter(tx => {
        if (seen.has(tx.id)) return false
        seen.add(tx.id); return true
      })
      merged.sort((a, b) => new Date(b.date) - new Date(a.date))
      dispatch({ type: ACTIONS.SET_RECENT_TXS, payload: merged })

      // App global state
      if (gStateResult.status === 'fulfilled') {
        dispatch({ type: ACTIONS.SET_APP_GLOBAL_STATE, payload: gStateResult.value })
      }

      // Derived stats
      const totalDeposited = merged
        .filter(t => t.status === 'success' && t.type === 'Payment')
        .reduce((s, t) => s + parseFloat(t.amount || 0), 0)

      dispatch({
        type: ACTIONS.UPDATE_STATS,
        payload: {
          poolBalance:    escrowResult.status === 'fulfilled' ? (escrowResult.value ?? 0) : 0,
          totalDeposited: parseFloat(totalDeposited.toFixed(3)),
          txCount:        merged.length,
        },
      })

      dispatch({ type: ACTIONS.SET_LAST_REFRESHED, payload: new Date() })

      // ── On-chain payment-request notifications ───────────────────────────────
      // Scan every incoming Payment whose note starts with NOTIFY_PREFIX.
      // Persists seen tx IDs in localStorage so we never re-notify on refresh.
      // Also checks current notifications list to prevent in-session duplicates.
      const SEEN_KEY = 'trivia_seen_notif_txids'
      let seenSet
      try { seenSet = new Set(JSON.parse(localStorage.getItem(SEEN_KEY) ?? '[]')) }
      catch { seenSet = new Set() }
      const existingIds = new Set(stateRef.current.notifications.map(n => n.id))
      const newSeen = []

      for (const tx of merged) {
        if (
          tx.type === 'Payment' &&
          tx.receiverFull === addr &&
          tx.rawNote?.startsWith(NOTIFY_PREFIX) &&
          !seenSet.has(tx.id) &&
          !existingIds.has(tx.id)
        ) {
          try {
            const payload = JSON.parse(tx.rawNote.slice(NOTIFY_PREFIX.length))
            dispatch({
              type: ACTIONS.ADD_NOTIFICATION,
              payload: {
                id:             tx.id,
                type:           'bill_request',
                billId:         payload.billId        ?? tx.id,
                billName:       payload.billName       ?? 'Payment Request',
                billNote:       payload.billNote       ?? '',
                payeeName:      payload.payeeName      ?? '',
                payeeAddress:   addr,
                share:          payload.share          ?? 0,
                total:          payload.total          ?? 0,
                creatorAddress: payload.creatorAddress ?? tx.senderFull ?? 'Unknown',
                date:           payload.date           ?? tx.date,
                read:           false,
                onChain:        true,
              },
            })
            newSeen.push(tx.id)
          } catch {
            // malformed note — skip silently
          }
        }
      }

      if (newSeen.length > 0) {
        const updated = [...seenSet, ...newSeen]
        // Keep only the last 500 IDs to avoid unbounded localStorage growth
        const trimmed = updated.length > 500 ? updated.slice(updated.length - 500) : updated
        localStorage.setItem(SEEN_KEY, JSON.stringify(trimmed))
      }

      // Surface any fetch errors
      if (walletTxResult.status === 'rejected') {
        const reason = walletTxResult.reason?.message ?? String(walletTxResult.reason)
        console.error('[AppContext] wallet tx fetch failed:', reason)
        dispatch({ type: ACTIONS.SET_FETCH_ERROR, payload: `Transaction fetch failed: ${reason}` })
      } else if (gStateResult.status === 'rejected') {
        const reason = gStateResult.reason?.message ?? String(gStateResult.reason)
        dispatch({ type: ACTIONS.SET_FETCH_ERROR, payload: `App state fetch failed: ${reason}` })
      }
    } catch (err) {
      console.error('[AppContext] refreshAll error:', err)
      dispatch({ type: ACTIONS.SET_FETCH_ERROR, payload: err?.message ?? 'Unknown error' })
    } finally {
      dispatch({ type: ACTIONS.SET_LOADING, payload: false })
    }
  }, [])

  // ── Auto-fetch when wallet address becomes available (connect or reload) ──
  useEffect(() => {
    if (state.address) {
      refreshAll(state.address)
    }
  }, [state.address, refreshAll])

  // ── Auto-refresh escrow + global state when config changes ────────────────
  useEffect(() => {
    if (state.address) refreshAll(state.address)
    // Only re-run when these specific config values change (not on every state update)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.escrowAddress, state.appId])

  // ── 30-second polling while wallet is connected ───────────────────────────
  useEffect(() => {
    if (!state.walletConnected) return
    const interval = setInterval(() => {
      refreshAll()
    }, 30_000)
    return () => clearInterval(interval)
  }, [state.walletConnected, refreshAll])

  // ── Reconnect wallet session on page load (Pera) ─────────────────────────
  useEffect(() => {
    peraWallet
      .reconnectSession()
      .then((accounts) => {
        peraWallet.connector?.on('disconnect', () => {
          dispatch({ type: ACTIONS.DISCONNECT_WALLET })
        })
        if (accounts.length) {
          dispatch({ type: ACTIONS.CONNECT_WALLET, payload: accounts[0] })
          // refreshAll will be triggered by the address useEffect above
        }
      })
      .catch((err) => {
        if (err?.message !== 'Session currently connected') {
          console.info('[peraWallet] No existing session:', err?.message)
        }
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <AppContext.Provider value={{ state, dispatch, refreshAll }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>')
  return ctx
}
