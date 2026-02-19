/**
 * algorand.js  ─  Algorand Payment URI helpers
 *
 * Architecture Overview
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * QR ENCODING (Generate to Receive):
 *   1. The receiver calls buildPaymentURI(address, amountAlgo, note)
 *   2. This creates an "algorand://" URI (ARC-0026 standard)
 *   3. The URI is encoded into a QR code image (via qrcode.react)
 *   4. Another person scans the QR with their phone/browser
 *
 *   URI format:  algorand://<ADDRESS>?amount=<microAlgos>&note=<text>
 *   Example:     algorand://ABC...XYZ?amount=2000000&note=Coffee
 *   (2000000 microAlgos = 2 ALGO)
 *
 * QR DECODING (Scan to Pay):
 *   1. html5-qrcode reads the camera feed and decodes the QR image
 *   2. parsePaymentURI() extracts address / amount / note from the URI
 *   3. The form is pre-filled with the decoded values
 *
 * TRANSACTION FLOW (after scanning):
 *   1. makePaymentTxn(from, to, amountAlgo, note)   → builds unsigned Transaction
 *   2. peraWallet.signTransaction([[{txn, signers}]])→ Pera Wallet opens QR/deep-link
 *   3. submitSignedTxn(signedBlob)                  → sends to Testnet Algod, waits
 *   4. refreshAll() in AppContext                   → updates balance + tx history
 *
 * This file only handles URI encoding/decoding.
 * The actual algosdk calls live in services/blockchain.js.
 */

// ─── Encode ──────────────────────────────────────────────────────────────────

/**
 * Builds an Algorand payment URI (ARC-0026).
 *
 * @param {string} address      - Receiver Algorand address (58 chars)
 * @param {string|number} [amountAlgo] - Amount in ALGO (e.g. 2.5), optional
 * @param {string} [note]       - Plain-text note, optional
 * @returns {string}            - e.g. "algorand://ABC...?amount=2500000&note=Hi"
 */
export function buildPaymentURI(address, amountAlgo = '', note = '') {
  if (!address) return ''
  let uri = `algorand://${address}`
  const params = new URLSearchParams()

  const algo = parseFloat(amountAlgo)
  if (!isNaN(algo) && algo > 0) {
    // Amount must be in microAlgos (integers) per the spec
    params.set('amount', String(Math.round(algo * 1_000_000)))
  }
  if (note && note.trim()) {
    params.set('note', note.trim())
  }

  const qs = params.toString()
  return qs ? `${uri}?${qs}` : uri
}

// ─── Decode ──────────────────────────────────────────────────────────────────

/**
 * Parses an Algorand payment URI back into its components.
 * Also accepts raw 58-char addresses (for QR codes that only encode the address).
 *
 * @param {string} raw - The raw string decoded from a QR code
 * @returns {{ address: string, amountAlgo: string, note: string } | null}
 */
export function parsePaymentURI(raw) {
  if (!raw) return null
  const trimmed = raw.trim()

  // Case 1: plain 58-char Algorand address
  if (/^[A-Z2-7]{58}$/.test(trimmed)) {
    return { address: trimmed, amountAlgo: '', note: '' }
  }

  // Case 2: algorand:// URI
  if (!trimmed.toLowerCase().startsWith('algorand://')) return null

  try {
    const withoutScheme = trimmed.slice('algorand://'.length)
    const qIdx = withoutScheme.indexOf('?')
    const address = qIdx === -1 ? withoutScheme : withoutScheme.slice(0, qIdx)
    const queryStr = qIdx === -1 ? '' : withoutScheme.slice(qIdx + 1)

    if (!address || address.length !== 58) return null

    const params = new URLSearchParams(queryStr)
    const microAmount = params.get('amount')
    const amountAlgo = microAmount
      ? (Number(microAmount) / 1_000_000).toFixed(6).replace(/\.?0+$/, '')
      : ''
    const note = params.get('note') ?? ''

    return { address, amountAlgo, note }
  } catch {
    return null
  }
}

// ─── Display helper ───────────────────────────────────────────────────────────

/** Shorten an address to first 6 + last 4 chars for display */
export function shortenAddress(addr) {
  return addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : ''
}
