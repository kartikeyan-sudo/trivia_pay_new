/**
 * ScanQR.jsx
 *
 * Camera-based QR scanner using html5-qrcode.
 * Decodes Algorand payment URIs and calls onScan({ address, amountAlgo, note }).
 *
 * Key fix: the scanner container div MUST be in the DOM with real dimensions
 * before Html5Qrcode instantiates. Using Tailwind `hidden` (display:none) gave
 * the library a zero-size container, so the camera never rendered.
 * We now keep the div always mounted and toggle visibility via height/opacity.
 */
import React, { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { parsePaymentURI } from '../services/algorand'

const SCANNER_ID = 'trivia-qr-scanner-viewport'

export default function ScanQR({ onScan }) {
  const scannerRef   = useRef(null)
  const startingRef  = useRef(false)   // prevent double-start
  const [active,     setActive]    = useState(false)
  const [starting,   setStarting]  = useState(false)
  const [error,      setError]     = useState('')
  const [scanMsg,    setScanMsg]   = useState('')
  const [permDenied, setPermDenied] = useState(false)

  // ── Start camera ─────────────────────────────────────────────────────────
  async function startScanner() {
    if (startingRef.current || active) return
    startingRef.current = true
    setError('')
    setScanMsg('')
    setPermDenied(false)
    setStarting(true)

    // Give React one tick to paint the visible container before attaching
    await new Promise(r => setTimeout(r, 80))

    try {
      // Clear any previous instance
      if (scannerRef.current) {
        try { await scannerRef.current.stop() } catch { /* ignore */ }
        try { scannerRef.current.clear() } catch { /* ignore */ }
        scannerRef.current = null
      }

      const scanner = new Html5Qrcode(SCANNER_ID, { verbose: false })
      scannerRef.current = scanner

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 220, height: 220 },
          aspectRatio: 1.333,
        },
        (decodedText) => {
          const parsed = parsePaymentURI(decodedText)
          if (parsed) {
            setScanMsg(`✅ Scanned: ${parsed.address.slice(0, 10)}…`)
            stopScanner()
            onScan(parsed)
          } else {
            setScanMsg('⚠️ Not an Algorand QR — keep scanning…')
          }
        },
        () => { /* per-frame miss — intentionally silent */ },
      )

      setActive(true)
    } catch (err) {
      console.error('[ScanQR] start error:', err)
      const msg = err?.message ?? ''
      const name = err?.name  ?? ''
      if (name === 'NotAllowedError' || msg.toLowerCase().includes('permission') || msg.toLowerCase().includes('denied')) {
        setPermDenied(true)
        setError('Camera permission denied. Allow camera access in your browser and try again.')
      } else if (name === 'NotFoundError' || msg.toLowerCase().includes('notfound') || msg.toLowerCase().includes('not found')) {
        setError('No camera found on this device.')
      } else if (name === 'NotReadableError') {
        setError('Camera is in use by another app. Close it and try again.')
      } else {
        setError(`Could not start camera: ${msg || name || 'unknown error'}`)
      }
      setActive(false)
    } finally {
      setStarting(false)
      startingRef.current = false
    }
  }

  // ── Stop camera ───────────────────────────────────────────────────────────
  async function stopScanner() {
    setActive(false)
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop()
        }
        scannerRef.current.clear()
      } catch {
        // ignore cleanup errors
      }
      scannerRef.current = null
    }
  }

  // ── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => () => { stopScanner() }, []) // eslint-disable-line

  return (
    <div className="space-y-4">

      {/* ── Scanner viewport ────────────────────────────────────────────────
          IMPORTANT: always in DOM so html5-qrcode can measure it.
          We hide it visually using height + opacity when inactive.          */}
      <div
        id={SCANNER_ID}
        style={active ? { minHeight: 300 } : { height: 0, overflow: 'hidden', opacity: 0, pointerEvents: 'none' }}
        className="rounded-2xl overflow-hidden bg-black w-full transition-all duration-300"
      />

      {/* Idle placeholder — shown only when not active and not starting */}
      {!active && !starting && (
        <div className="rounded-2xl bg-surface-700/40 dark:bg-surface-700/50 border border-white/10 border-dashed
                        flex flex-col items-center justify-center gap-3 py-12">
          <span className="text-5xl">📷</span>
          <p className="text-slate-500 dark:text-slate-400 text-sm text-center px-6">
            Point your camera at an Algorand QR code to auto-fill the payment form.
          </p>
        </div>
      )}

      {/* Starting spinner */}
      {starting && (
        <div className="rounded-2xl border border-green-500/20 bg-green-500/5
                        flex flex-col items-center justify-center gap-3 py-12">
          <span className="w-8 h-8 border-2 border-green-400/30 border-t-green-400 rounded-full animate-spin" />
          <p className="text-green-400 text-sm">Starting camera…</p>
        </div>
      )}

      {/* Scan status */}
      {scanMsg && (
        <div className="rounded-xl px-4 py-3 bg-green-500/10 border border-green-500/20 text-green-700 dark:text-green-300 text-sm">
          {scanMsg}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-xl px-4 py-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm space-y-2">
          <p>❌ {error}</p>
          {permDenied && (
            <p className="text-xs text-slate-400">
              Chrome: click the 🔒 icon in the address bar → Camera → Allow.<br />
              Android/iOS: Settings → Browser → Camera → Allow.
            </p>
          )}
        </div>
      )}

      {/* Controls */}
      <div className="flex gap-3">
        {!active ? (
          <button
            onClick={startScanner}
            disabled={starting}
            className="btn-primary flex-1 justify-center disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {starting ? 'Starting…' : '📷 Open Camera & Scan'}
          </button>
        ) : (
          <button onClick={stopScanner} className="btn-danger flex-1 justify-center">
            ⏹ Stop Scanner
          </button>
        )}
      </div>

      {active && (
        <p className="text-xs text-slate-500 text-center">
          Hold the QR code steady inside the box · scanning at 10 fps
        </p>
      )}
    </div>
  )
}