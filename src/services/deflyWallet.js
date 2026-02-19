/**
 * deflyWallet.js
 * Lightweight adapter for Defly Wallet to match the previous wallet API used
 * across the app (connect, disconnect, signTransaction).
 *
 * This adapter tries several common Defly/global methods and falls back to
 * a helpful error when the wallet isn't available. If the Defly extension
 * exposes a different API in your environment, adapt the calls below.
 */
const hasWindow = typeof window !== 'undefined'
const hasDefly = hasWindow && window.defly

const deflyWallet = {
  async connect() {
    const provider = await getProvider()
    if (!provider) {
      const status = detectStatus()
      const tried = Object.keys(status.candidates || {})
        .filter(k => status.candidates[k])
        .join(', ')
      throw new Error(`Defly Wallet not found${tried ? ` (detected globals: ${tried})` : ''}`)
    }
    if (typeof provider.connect === 'function') return provider.connect()
    if (typeof provider.request === 'function') return provider.request({ method: 'connect' })
    throw new Error('Defly Wallet: unsupported connect API')
  },

  async disconnect() {
    const provider = await getProvider({ wait: false })
    if (!provider) return
    if (typeof provider.disconnect === 'function') return provider.disconnect()
    if (typeof provider.request === 'function') return provider.request({ method: 'disconnect' })
  },

  /**
   * Sign transactions. The app calls this with the same shape used for
  * the previous wallet adapter signature (e.g. signTransaction([[{txn, signers}]])). We attempt to
   * call common Defly methods; adjust if your Defly exposes a different name.
   */
  async signTransaction(txnGroups) {
    const provider = await getProvider()
    if (!provider) {
      const status = detectStatus()
      const tried = Object.keys(status.candidates || {})
        .filter(k => status.candidates[k])
        .join(', ')
      throw new Error(`Defly Wallet not available to sign transactions${tried ? ` (detected globals: ${tried})` : ''}`)
    }

    if (typeof provider.signTransactions === 'function') return provider.signTransactions(txnGroups)

    if (typeof provider.signTransaction === 'function') return provider.signTransaction(txnGroups)

    if (typeof provider.request === 'function') return provider.request({ method: 'signTransaction', params: txnGroups })

    throw new Error('Defly Wallet: no compatible signTransaction API found')
  },

  // Compatibility alias used by some components
  isConnected() {
    const p = detectProvider()
    return !!(p && (p.accounts && p.accounts.length))
  },
}
// Try several common global names that wallets may expose. If the extension
// injects asynchronously we poll briefly to allow page scripts to detect it.
const CANDIDATE_GLOBALS = [
  'defly',
  'deflywallet',
  'deflyWallet',
  'defy',
  'defyWallet',
  'algorand',
  'algoSigner',
]

function detectProvider() {
  if (!hasWindow) return null
  for (const name of CANDIDATE_GLOBALS) {
    // eslint-disable-next-line no-prototype-builtins
    if (Object.prototype.hasOwnProperty.call(window, name) && window[name]) return window[name]
  }
  return null
}

export function detectStatus() {
  if (!hasWindow) return { hasWindow: false, found: false, matched: null, candidates: {} }
  const candidates = {}
  let matched = null
  for (const name of CANDIDATE_GLOBALS) {
    const present = Object.prototype.hasOwnProperty.call(window, name) && !!window[name]
    candidates[name] = present
    if (!matched && present) matched = name
  }
  return { hasWindow: true, found: !!matched, matched, candidates }
}

async function getProvider({ wait = true, timeout = 3000 } = {}) {
  const start = Date.now()
  let p = detectProvider()
  if (p || !wait) return p
  // Poll until timeout
  while (Date.now() - start < timeout) {
    // eslint-disable-next-line no-await-in-loop
    await new Promise(r => setTimeout(r, 150))
    p = detectProvider()
    if (p) return p
  }
  return null
}

// Attempt to expose a small reconnectSession helper and connector event shim
deflyWallet.reconnectSession = async function reconnectSession() {
  const provider = await getProvider({ wait: false })
  if (!provider) return []
  if (provider.accounts) return provider.accounts
  if (typeof provider.request === 'function') {
    try {
      const res = await provider.request({ method: 'getAccounts' })
      return Array.isArray(res) ? res : []
    } catch {
      return []
    }
  }
  return []
}

// Minimal connector shim to allow `.connector?.on('disconnect', ...)` usage
deflyWallet.connector = {
  on(event, cb) {
    const p = detectProvider()
    if (!p) return
    if (typeof p.on === 'function') {
      try { p.on(event, cb) } catch { /* ignore */ }
    }
  }
}

export default deflyWallet
