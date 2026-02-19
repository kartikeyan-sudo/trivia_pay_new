/**
 * blockchain.js  ─  Algorand SDK v3 service layer
 *
 * algosdk v3 breaking changes vs v2:
 *  - Response fields are camelCase  (e.g. txType, paymentTransaction, roundTime)
 *  - Amounts are BigInt             (info.amount, ptxn.amount, etc.)
 *  - Global-state key/value bytes   are Uint8Array (not base64 strings)
 *  - Tx constructor params          from→sender, to→receiver
 *  - sendRawTransaction returns     { txid } (lowercase)
 *  - waitForConfirmation returns    { confirmedRound } (camelCase, BigInt)
 */

import algosdk from 'algosdk'
import appConfig from '../config/appConfig'

// ─── Clients ────────────────────────────────────────────────────────────────

export function getAlgodClient() {
  return new algosdk.Algodv2(
    appConfig.ALGOD_TOKEN,
    appConfig.ALGOD_SERVER,
    appConfig.ALGOD_PORT,
  )
}

export function getIndexerClient() {
  return new algosdk.Indexer(
    appConfig.INDEXER_TOKEN,
    appConfig.INDEXER_SERVER,
    appConfig.INDEXER_PORT,
  )
}

// ─── Account helpers ─────────────────────────────────────────────────────────

/**
 * Returns the ALGO balance of an address as a plain JS number.
 * algosdk v3: info.amount is BigInt (microAlgos)
 */
export async function getBalance(address) {
  if (!address) return 0
  try {
    const algod = getAlgodClient()
    const info  = await algod.accountInformation(address).do()
    // v3: amount is BigInt — divide directly to avoid floating-point drift
    const microAlgos = typeof info.amount === 'bigint' ? Number(info.amount) : info.amount
    return microAlgos / 1_000_000
  } catch (err) {
    console.error('[blockchain] getBalance error:', err?.message ?? err)
    return 0
  }
}

export async function getAccountInfo(address) {
  return getAlgodClient().accountInformation(address).do()
}

export async function getEscrowBalance() {
  if (!appConfig.ESCROW_ADDRESS) return 0
  return getBalance(appConfig.ESCROW_ADDRESS)
}

// ─── Smart contract global state ────────────────────────────────────────────

/**
 * Decodes one global-state entry from algosdk v3's Uint8Array format.
 * v3: entry.key is Uint8Array, entry.value.bytes is Uint8Array, entry.value.uint is BigInt
 */
function decodeStateValue(entry) {
  // Key is raw bytes (v3) or base64 string (v2 fallback)
  let key
  if (entry.key instanceof Uint8Array) {
    key = new TextDecoder().decode(entry.key)
  } else {
    try { key = atob(entry.key ?? '') } catch { key = String(entry.key) }
  }

  const val = entry.value
  if (!val) return { key, value: '' }

  // Type 2 = uint
  if (val.type === 2) {
    const uint = typeof val.uint === 'bigint' ? Number(val.uint) : (val.uint ?? 0)
    return { key, value: uint }
  }

  // Type 1 = bytes — try UTF-8 decode
  const raw = val.bytes
  if (raw instanceof Uint8Array) {
    try { return { key, value: new TextDecoder().decode(raw) } } catch { return { key, value: '[bytes]' } }
  }
  // v2 fallback: val.bytes was base64
  try {
    const decoded = atob(raw ?? '')
    return { key, value: decoded }
  } catch {
    return { key, value: String(raw) }
  }
}

export async function getAppGlobalState(appId) {
  if (!appId) return []
  try {
    const algod   = getAlgodClient()
    const appInfo = await algod.getApplicationByID(Number(appId)).do()
    // v3: appInfo.params.globalState   v2: appInfo.params['global-state']
    const raw = appInfo?.params?.globalState ?? appInfo?.params?.['global-state'] ?? []
    return raw.map(decodeStateValue)
  } catch (err) {
    console.error('[blockchain] getAppGlobalState error:', err?.message ?? err)
    return []
  }
}

// ─── Transaction builders ────────────────────────────────────────────────────

/**
 * Builds an unsigned payment transaction.
 * v3: uses `sender`/`receiver` instead of `from`/`to`
 */
export async function makePaymentTxn(from, to, amountAlgo, note = '') {
  const algod       = getAlgodClient()
  const params      = await algod.getTransactionParams().do()
  const microAlgos  = BigInt(Math.round(amountAlgo * 1_000_000))
  const encodedNote = new TextEncoder().encode(note)

  // Try v3 field names first, fall back to v2 names for older installs
  try {
    return algosdk.makePaymentTxnWithSuggestedParamsFromObject({
      sender:          from,
      receiver:        to,
      amount:          microAlgos,
      note:            encodedNote,
      suggestedParams: params,
    })
  } catch {
    return algosdk.makePaymentTxnWithSuggestedParamsFromObject({
      from,
      to,
      amount:          Number(microAlgos),
      note:            encodedNote,
      suggestedParams: params,
    })
  }
}

/**
 * Builds an unsigned Application NoOp call transaction.
 * v3: uses `sender` instead of `from`
 */
export async function makeAppCallTxn(from, appId, appArgs = []) {
  const algod  = getAlgodClient()
  const params = await algod.getTransactionParams().do()
  const encodedArgs = appArgs.map(a =>
    typeof a === 'string' ? new TextEncoder().encode(a) : a
  )
  try {
    return algosdk.makeApplicationNoOpTxnFromObject({
      sender:          from,
      appIndex:        Number(appId),
      appArgs:         encodedArgs,
      suggestedParams: params,
    })
  } catch {
    return algosdk.makeApplicationNoOpTxnFromObject({
      from,
      appIndex:        Number(appId),
      appArgs:         encodedArgs,
      suggestedParams: params,
    })
  }
}

// ─── Transaction submission ──────────────────────────────────────────────────

/**
 * Submits signed bytes and waits for confirmation.
 * v3: sendRawTransaction returns { txid } (lowercase); confirmedRound is BigInt
 */
export async function submitSignedTxn(signedTxnBlob) {
  const algod  = getAlgodClient()
  const result = await algod.sendRawTransaction(signedTxnBlob).do()
  // v3: result.txid   v2: result.txId
  const txId   = result.txid ?? result.txId
  const confirmation = await algosdk.waitForConfirmation(algod, txId, 4)
  // v3: confirmedRound is BigInt camelCase   v2: 'confirmed-round' number
  const confirmedRound =
    Number(confirmation.confirmedRound ?? confirmation['confirmed-round'] ?? 0)
  return { txId, confirmedRound }
}

// ─── Transaction history (Indexer) ──────────────────────────────────────────

/**
 * Converts a raw Indexer transaction (algosdk v3) into TxTable row format.
 * v3 field names: txType, paymentTransaction, applicationTransaction, confirmedRound, roundTime
 */
function formatTx(tx) {
  // v3 camelCase first, v2 hyphenated fallback
  const type   = tx.txType   ?? tx['tx-type']   ?? 'unknown'
  const ptxn   = tx.paymentTransaction   ?? tx['payment-transaction']
  const apptxn = tx.applicationTransaction ?? tx['application-transaction']
  const id     = tx.id ?? '—'
  const round  = Number(tx.confirmedRound ?? tx['confirmed-round'] ?? 0)

  let typeLabel = type
  if (type === 'pay')    typeLabel = 'Payment'
  if (type === 'appl')   typeLabel = 'App Call'
  if (type === 'axfer')  typeLabel = 'Asset Transfer'

  // v3: ptxn.amount is BigInt
  const rawAmt     = ptxn?.amount ?? 0n
  const microAlgos = typeof rawAmt === 'bigint' ? Number(rawAmt) : rawAmt
  const amount     = microAlgos > 0 ? (microAlgos / 1_000_000).toFixed(4) : '0.0000'

  const sender   = tx.sender ? shorten(tx.sender) : '—'
  const senderFull = tx.sender ?? ''
  // v3: ptxn.receiver   apptxn.applicationId  (v2: apptxn['application-id'])
  const receiverFull = ptxn?.receiver ?? ''
  const receiver = receiverFull
    ? shorten(receiverFull)
    : apptxn
      ? `App #${apptxn.applicationId ?? apptxn['application-id'] ?? '?'}`
      : '—'

  // v3: roundTime   v2: round-time
  const ts   = tx.roundTime ?? tx['round-time']
  const date = ts
    ? new Date(Number(ts) * 1000).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
      })
    : `Round ${round}`

  // Decode note bytes if present
  const rawNoteBytes = tx.note
  let rawNote = ''
  if (rawNoteBytes instanceof Uint8Array && rawNoteBytes.length > 0) {
    try { rawNote = new TextDecoder().decode(rawNoteBytes) } catch { /* ignore */ }
  } else if (typeof rawNoteBytes === 'string' && rawNoteBytes.length > 0) {
    // v2 fallback: base64-encoded
    try { rawNote = atob(rawNoteBytes) } catch { rawNote = rawNoteBytes }
  }

  return { id, type: typeLabel, amount, sender, senderFull, receiver, receiverFull, rawNote, status: 'success', date }
}

function shorten(addr) {
  return addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : '—'
}

export async function getAccountTransactions(address, limit = 50) {
  if (!address) return []
  const indexer = getIndexerClient()
  const result  = await indexer.lookupAccountTransactions(address).limit(limit).do()
  console.log('[blockchain] raw indexer result sample:', result?.transactions?.[0])
  return (result.transactions ?? []).map(formatTx)
}

export async function getEscrowTransactions(limit = 50) {
  if (!appConfig.ESCROW_ADDRESS) return []
  try {
    return await getAccountTransactions(appConfig.ESCROW_ADDRESS, limit)
  } catch {
    return []
  }
}

// ─── On-chain notification transactions ────────────────────────────────────────

/**
 * Prefix embedded in the note field of notification transactions.
 * The receiving wallet scans for this prefix on refresh to surface bill requests.
 */
export const NOTIFY_PREFIX = 'TRIVIA_PAY_REQUEST:'

/**
 * Builds a 0-ALGO payment transaction whose note field encodes a bill-split
 * request as JSON.  The receiver (payee) will detect this on their next refresh.
 *
 * @param {string} from      - Creator's Algorand address
 * @param {string} to        - Payee's Algorand address
 * @param {object} noteObj   - Arbitrary JSON payload (billId, billName, share, …)
 * @returns {Promise<Transaction>}
 */
export async function makeNotificationTxn(from, to, noteObj) {
  const algod  = getAlgodClient()
  const params = await algod.getTransactionParams().do()
  const noteStr    = NOTIFY_PREFIX + JSON.stringify(noteObj)
  const encodedNote = new TextEncoder().encode(noteStr)

  try {
    return algosdk.makePaymentTxnWithSuggestedParamsFromObject({
      sender:          from,
      receiver:        to,
      amount:          0n,
      note:            encodedNote,
      suggestedParams: params,
    })
  } catch {
    return algosdk.makePaymentTxnWithSuggestedParamsFromObject({
      from,
      to,
      amount:          0,
      note:            encodedNote,
      suggestedParams: params,
    })
  }
}

// ─── Utilities ────────────────────────────────────────────────────────────────

export function explorerLink(txId) {
  return `${appConfig.EXPLORER_BASE}${txId}`
}

export function microToAlgo(micro) {
  const n = typeof micro === 'bigint' ? Number(micro) : micro
  return (n / 1_000_000).toFixed(4)
}

