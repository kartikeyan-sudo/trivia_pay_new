// ─────────────────────────────────────────────────────────────────────────────
// 🚀  STEP 1 – After running `algokit deploy testnet` in the /backend folder,
//             copy the two values printed by deploy.py here:
// ─────────────────────────────────────────────────────────────────────────────

/** Algorand application ID – set after `algokit deploy testnet` */
export const APP_ID = 755792571             // latest deployed PyTeal ARC4-like app

/** Contract escrow address – set after `algokit deploy testnet` */
export const ESCROW_ADDRESS = 'ER745AB7H64MC7RO5PEL7YCDQ245JOHVPHN5WHO3FCGPI5Y7GHL5QGAT64'       // latest deployed PyTeal ARC4-like app

// ─────────────────────────────────────────────────────────────────────────────

// ─── Load persisted config from localStorage ───────────────────────────────
function loadConfig() {
  try {
    const saved = localStorage.getItem('algopay_config')
    return saved ? JSON.parse(saved) : {}
  } catch {
    return {}
  }
}

const saved = loadConfig()

const appConfig = {
  // Smart contract App ID – hardcoded above takes priority, localStorage as fallback
  APP_ID: APP_ID ?? saved.APP_ID ?? null,

  // Network: 'testnet' | 'mainnet'
  NETWORK: saved.NETWORK ?? 'testnet',

  // AlgoNode free public endpoints – no API key needed
  ALGOD_SERVER:    'https://testnet-api.algonode.cloud',
  ALGOD_PORT:      '',
  ALGOD_TOKEN:     '',

  INDEXER_SERVER:  'https://testnet-idx.algonode.cloud',
  INDEXER_PORT:    '',
  INDEXER_TOKEN:   '',

  // Escrow / smart contract pool address – hardcoded above takes priority
  ESCROW_ADDRESS:  ESCROW_ADDRESS || saved.ESCROW_ADDRESS || '',

  CURRENCY:        'ALGO',
  EXPLORER_BASE:   'https://testnet.algoexplorer.io/tx/',
}

/** Save APP_ID and ESCROW_ADDRESS to localStorage */
export function persistConfig(updates) {
  const current = loadConfig()
  localStorage.setItem('algopay_config', JSON.stringify({ ...current, ...updates }))
  // Mutate the live config object so the rest of the app picks it up
  Object.assign(appConfig, updates)
}

export default appConfig
