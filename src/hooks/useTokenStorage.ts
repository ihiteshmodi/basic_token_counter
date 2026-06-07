import { useCallback, useEffect, useState } from 'react'

export type HistoryEntry = {
  id: string
  amount: number
  before: number
  after: number
  ts: number
}

const TOTAL_KEY = 'tokenTotal'
const HISTORY_KEY = 'tokenHistory'
const DEFAULT_TOTAL = 39000

// Local API base (absolute) — the frontend will use this as the single source of truth.
const API_BASE = 'http://localhost:5175'

function readHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    if (!raw) return []
    return JSON.parse(raw) as HistoryEntry[]
  } catch {
    return []
  }
}

async function fetchInitialTotal(): Promise<number> {
  // Prefer the local API (single source of truth). If API is unavailable, fall back
  // to the served public JSON file so the app can still show something.
  try {
    const resp = await fetch(`${API_BASE}/api/initialTotal`, { cache: 'no-store' })
    if (resp.ok) {
      const data = await resp.json()
      const n = Number(data?.initialTotal ?? data?.value ?? data)
      return Number.isFinite(n) ? n : DEFAULT_TOTAL
    }
  } catch {
    // ignore and try file
  }

  try {
    const resp = await fetch('/initialTotal.json', { cache: 'no-store' })
    if (!resp.ok) return DEFAULT_TOTAL
    const data = await resp.json()
    const n = Number(data?.initialTotal)
    return Number.isFinite(n) ? n : DEFAULT_TOTAL
  } catch {
    return DEFAULT_TOTAL
  }
}

async function writeInitialTotalToFile(value: number): Promise<boolean> {
  try {
    const resp = await fetch(`${API_BASE}/api/initialTotal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initialTotal: value }),
    })
    return resp.ok
  } catch {
    return false
  }
}

export function useTokenStorage() {
  // Initialize to DEFAULT and then immediately load from API/public file on mount.
  const [total, setTotal] = useState<number>(DEFAULT_TOTAL)

  const [history, setHistory] = useState<HistoryEntry[]>(() => readHistory())

  // Do not persist to localStorage as a primary store — we use the API/file as source of truth.

  useEffect(() => {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history))
    } catch {
      // ignore
    }
  }, [history])

  const subtract = useCallback((amount: number) => {
    if (!isFinite(amount) || amount <= 0) return
    setTotal((prev) => {
      const before = prev
      let after = prev - amount
      if (after < 0) after = 0
      const entry: HistoryEntry = {
        id: String(Date.now()),
        amount,
        before,
        after,
        ts: Date.now(),
      }
      setHistory((h) => [entry, ...h])
      // Persist to file via API (single source of truth). If it fails, we still update UI.
      ;(async () => {
        const ok = await writeInitialTotalToFile(after)
        if (!ok) {
          // Optionally, notify the user in UI — not implemented. Keep fallback behavior.
        }
      })()
      return after
    })
  }, [])

  const set = useCallback((value: number) => {
    if (!isFinite(value) || value < 0) return
    const v = Math.max(0, Math.floor(value))
    setTotal(v)
    ;(async () => {
      await writeInitialTotalToFile(v)
    })()
  }, [])

  const reset = useCallback(() => {
    ;(async () => {
      const initial = await fetchInitialTotal()
      setTotal(initial)
      setHistory([])
      await writeInitialTotalToFile(initial)
    })()
  }, [])

  // On mount: fetch initialTotal.json and, if the stored total equals the previously applied
  // initial value (or there's no stored total), apply the new file initial. This allows editing
  // `public/initialTotal.json` and having the change take effect after a reload when the user
  // hasn't changed the stored total.
  useEffect(() => {
    ;(async () => {
      const initial = await fetchInitialTotal()
      setTotal(initial)
      // we do not set localStorage as the primary store; file/API is the single source
      setHistory([])
    })()
  }, [])

  return { total, history, subtract, set, reset }
}

export default useTokenStorage
